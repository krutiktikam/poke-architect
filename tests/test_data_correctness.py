import os
import re
import sqlite3
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from backend.database import get_db
from backend.main import app

pytestmark = pytest.mark.data

BULBASAUR, PIKACHU, MAGIKARP, DITTO = 1, 25, 129, 132
DATA_DB_PATH = Path(os.environ.get("POKEMON_DATA_DB", "pokemon.db")).resolve()


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


@pytest.fixture(scope="module")
def engine():
    if not DATA_DB_PATH.exists():
        pytest.skip(f"{DATA_DB_PATH} not found")
    uri = DATA_DB_PATH.as_uri() + "?mode=ro"  # read-only: never modifies the dev DB
    return create_engine(
        "sqlite://",
        creator=lambda: sqlite3.connect(uri, uri=True, check_same_thread=False),
        poolclass=NullPool,
    )


@pytest.fixture(scope="module")
def db(engine):
    s = sessionmaker(bind=engine)()
    yield s
    s.close()


@pytest.fixture(scope="module")
def client(engine):
    Session = sessionmaker(bind=engine)

    def _get_db():
        s = Session()
        try:
            yield s
        finally:
            s.close()

    app.dependency_overrides[get_db] = _get_db
    yield TestClient(app)
    app.dependency_overrides.pop(get_db, None)


def learnset(db, pokemon_id: int, version_group: str):
    rows = db.execute(
        text(
            """
            SELECT m.name AS name, pmm.identifier AS method, pm.level AS level
            FROM pokemon_moves pm
            JOIN moves m ON m.id = pm.move_id
            JOIN pokemon_move_methods pmm ON pmm.id = pm.method_id
            JOIN version_groups vg ON vg.id = pm.version_group_id
            WHERE pm.pokemon_id = :pid AND vg.identifier = :vg
            """
        ),
        {"pid": pokemon_id, "vg": version_group},
    ).all()
    return [{"move": norm(r.name), "method": r.method, "level": r.level} for r in rows]


def test_row_count_floor(db):
    n = db.execute(text("SELECT count(*) FROM pokemon_moves WHERE version_group_id IS NOT NULL")).scalar()
    assert n >= 100_000


def test_bulbasaur_levelup_red_blue(db):
    ls = {r["move"]: r["level"] for r in learnset(db, BULBASAUR, "red-blue") if r["method"] == "level-up"}
    assert ls["leechseed"] == 7
    assert ls["vinewhip"] == 13


def test_vine_whip_level_differs_gen1_vs_gen3(db):
    # Verify the Emerald value against Bulbapedia before trusting this assertion.
    def lvl(vg):
        return {r["move"]: r["level"] for r in learnset(db, BULBASAUR, vg) if r["method"] == "level-up"}["vinewhip"]
    assert lvl("red-blue") == 13
    assert lvl("emerald") == 10


def test_pikachu_thunderbolt_is_machine_in_red_blue(db):
    ls = learnset(db, PIKACHU, "red-blue")
    assert any(r["move"] == "thunderbolt" and r["method"] == "machine" for r in ls)


def test_ditto_only_transform_in_red_blue(db):
    ls = learnset(db, DITTO, "red-blue")
    assert {r["move"] for r in ls} == {"transform"}


def test_magikarp_never_learns_flamethrower(db):
    rows = db.execute(
        text(
            """SELECT m.name FROM pokemon_moves pm JOIN moves m ON m.id = pm.move_id
               WHERE pm.pokemon_id = :pid AND pm.version_group_id IS NOT NULL"""
        ),
        {"pid": MAGIKARP},
    ).all()
    names = {norm(r.name) for r in rows}
    assert names, "vacuous pass guard: Magikarp must have learnset rows"
    assert "flamethrower" not in names


def test_no_legacy_rows_remain(db):
    n = db.execute(text("SELECT count(*) FROM pokemon_moves WHERE version_group_id IS NULL")).scalar()
    assert n == 0  # stays red until the legacy cleanup in step 5


# ---- API ----
def test_api_requires_version_group(client):
    assert client.get(f"/api/pokemon/{BULBASAUR}/moves").status_code == 422


def test_api_unknown_version_group_404(client):
    assert client.get(f"/api/pokemon/{BULBASAUR}/moves?version_group=nope").status_code == 404


def test_api_bulbasaur_red_blue(client):
    r = client.get(f"/api/pokemon/{BULBASAUR}/moves?version_group=red-blue&method=level-up")
    assert r.status_code == 200
    body = r.json()
    assert all(m["method"] == "level-up" for m in body["moves"])
    leech = next(m for m in body["moves"] if norm(m["move"]["name"]) == "leechseed")
    assert leech["level"] == 7
    levels = [m["level"] for m in body["moves"]]
    assert levels == sorted(levels)