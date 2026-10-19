"""
Comprehensive test suite for Phase 3 Read-Only API layer.

Covers:
- All new endpoints: 200 response shapes, 404/empty edge cases
- Pagination and region filters for /locations
- version_id filter for encounters
- Preservation of NULL chance for gift/static encounters
- Complete evolution chains with branching species (Eevee) and single-stage species
- Route-shadowing check ensuring /items/pockets is not shadowed by /items/{id}
- ETag round-trip returning 304 Not Modified with zero database queries executed
- Query-count bounds per endpoint (asserting small fixed upper bounds)
"""

import os
from contextlib import contextmanager
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.database import Base, get_db
import backend.http_cache as http_cache
import backend.routers.meta as meta_router
from backend.main import app
from backend.models import (
    Encounter,
    Pokemon,
    PokemonSpecies,
)
from scripts.populate_extended import STAGE_DEPENDENCY_ORDER, run_pipeline

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures", "pokeapi_csv")


@contextmanager
def count_queries(engine):
    """
    Context manager that intercepts and counts SQL queries executed via SQLAlchemy.
    """
    executed = []

    def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        executed.append(statement)

    event.listen(engine, "before_cursor_execute", before_cursor_execute)
    try:
        yield executed
    finally:
        event.remove(engine, "before_cursor_execute", before_cursor_execute)


@pytest.fixture(scope="module")
def setup_test_app():
    """
    Creates an isolated SQLite test database, populates it from fixtures,
    and configures FastAPI TestClient with database and cache overrides.
    """
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(test_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    # Create tables
    Base.metadata.create_all(bind=test_engine)

    # Create alembic_version table to simulate schema_revision
    with test_engine.begin() as conn:
        conn.execute(text("CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(32) NOT NULL PRIMARY KEY)"))
        conn.execute(text("INSERT INTO alembic_version (version_num) VALUES ('0002')"))

    TestSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestSession()

    # 1. Seed baseline Pokémon records
    seed_pokemon = [
        Pokemon(id=25, name="Pikachu", type1="Electric", hp=35, attack=55, defense=40, special_attack=50, special_defense=50, speed=90, sprite_url="http://sprite/25.png", region="kanto", generation=1),
        Pokemon(id=133, name="Eevee", type1="Normal", hp=55, attack=55, defense=50, special_attack=45, special_defense=65, speed=55, sprite_url="http://sprite/133.png", region="kanto", generation=1),
        Pokemon(id=134, name="Vaporeon", type1="Water", hp=130, attack=65, defense=60, special_attack=110, special_defense=95, speed=65, sprite_url="http://sprite/134.png", region="kanto", generation=1),
        Pokemon(id=135, name="Jolteon", type1="Electric", hp=65, attack=65, defense=60, special_attack=110, special_defense=95, speed=130, sprite_url="http://sprite/135.png", region="kanto", generation=1),
        Pokemon(id=136, name="Flareon", type1="Fire", hp=65, attack=130, defense=60, special_attack=95, special_defense=110, speed=65, sprite_url="http://sprite/136.png", region="kanto", generation=1),
        Pokemon(id=143, name="Snorlax", type1="Normal", hp=160, attack=110, defense=65, special_attack=65, special_defense=110, speed=30, sprite_url="http://sprite/143.png", region="kanto", generation=1),
    ]
    session.add_all(seed_pokemon)
    session.commit()

    # 2. Ingest CSV fixtures
    run_pipeline(
        session=session,
        stages=STAGE_DEPENDENCY_ORDER,
        csv_dir=FIXTURES_DIR,
        ref="master-test",
        dry_run=False,
    )

    # 3. Add a gift/static encounter with chance = None
    gift_enc = Encounter(
        id=99,
        version_id=1,
        location_area_id=1,
        pokemon_id=25,
        method_id=1,
        slot=None,
        chance=None,  # Static / gift encounter
        min_level=20,
        max_level=20,
    )
    session.add(gift_enc)

    # 4. Add a single-stage species (Snorlax id=143)
    snorlax_species = PokemonSpecies(
        id=143,
        identifier="snorlax",
        generation_id=1,
        evolves_from_species_id=None,
        evolution_chain_id=None,
        order=143,
    )
    session.add(snorlax_species)
    session.commit()
    session.close()

    # Override get_db dependency
    def override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    # Point http_cache.SessionLocal to TestSession so middleware uses the in-memory DB
    original_session_local = http_cache.SessionLocal
    http_cache.SessionLocal = TestSession
    http_cache.reset_cached_data_version()
    meta_router.reset_meta_cache()

    # Warm cached data version so cold-start version lookup doesn't inflate individual route query counts
    with TestSession() as s:
        http_cache.get_cached_data_version(s)

    client = TestClient(app)

    yield {
        "client": client,
        "engine": test_engine,
        "session_factory": TestSession,
    }

    app.dependency_overrides.clear()
    http_cache.SessionLocal = original_session_local
    http_cache.reset_cached_data_version()
    meta_router.reset_meta_cache()
    test_engine.dispose()


# ==========================================
# 1. Encounters Endpoint Tests
# ==========================================

def test_pokemon_encounters_200_and_grouping(setup_test_app):
    client = setup_test_app["client"]
    engine = setup_test_app["engine"]

    with count_queries(engine) as queries:
        resp = client.get("/api/pokemon/25/encounters")
    assert resp.status_code == 200
    data = resp.json()

    # Must be bounded queries (<= 4 queries regardless of result size)
    assert len(queries) <= 4, f"Too many queries: {len(queries)}"

    assert len(data) >= 1
    loc = data[0]
    assert "name" in loc
    assert "areas" in loc
    assert len(loc["areas"]) >= 1
    area = loc["areas"][0]
    assert "encounters" in area

    # Check encounter detail fields
    enc = area["encounters"][0]
    assert "version" in enc
    assert "method" in enc
    assert "min_level" in enc
    assert "max_level" in enc
    assert "conditions" in enc


def test_pokemon_encounters_null_chance_preserved(setup_test_app):
    client = setup_test_app["client"]
    resp = client.get("/api/pokemon/25/encounters")
    assert resp.status_code == 200
    data = resp.json()

    # Find the gift encounter (min_level 20)
    found_gift = False
    for loc in data:
        for area in loc["areas"]:
            for enc in area["encounters"]:
                if enc["min_level"] == 20:
                    assert enc["chance"] is None
                    found_gift = True
    assert found_gift, "Gift encounter with null chance was not found"


def test_pokemon_encounters_version_filter(setup_test_app):
    client = setup_test_app["client"]
    resp = client.get("/api/pokemon/25/encounters?version_id=1")
    assert resp.status_code == 200
    for loc in resp.json():
        for area in loc["areas"]:
            for enc in area["encounters"]:
                assert enc["version"]["id"] == 1


def test_pokemon_encounters_404_and_empty(setup_test_app):
    client = setup_test_app["client"]

    # 404 if Pokémon does not exist
    resp_404 = client.get("/api/pokemon/99999/encounters")
    assert resp_404.status_code == 404

    # Empty list if Pokémon exists but has no encounters (e.g. Snorlax id=143)
    resp_empty = client.get("/api/pokemon/143/encounters")
    assert resp_empty.status_code == 200
    assert resp_empty.json() == []


# ==========================================
# 2. Evolutions Endpoint Tests
# ==========================================

def test_pokemon_evolutions_branching_chain(setup_test_app):
    client = setup_test_app["client"]
    engine = setup_test_app["engine"]

    with count_queries(engine) as queries:
        resp = client.get("/api/pokemon/133/evolutions")
    assert resp.status_code == 200
    data = resp.json()

    # Bound query count (<= 6 queries, zero N+1)
    assert len(queries) <= 6, f"Too many queries: {len(queries)}"

    assert data["chain_id"] == 67
    nodes = {n["species_id"]: n for n in data["nodes"]}
    assert 133 in nodes  # Eevee
    assert 134 in nodes  # Vaporeon
    assert 135 in nodes  # Jolteon
    assert 136 in nodes  # Flareon

    # Verify sprite URLs and names
    assert nodes[133]["name"] == "Eevee"
    assert nodes[133]["pokemon_id"] == 133
    assert nodes[133]["sprite_url"] == "http://sprite/133.png"

    # Verify 3 branching edges all from species 133
    edges = data["edges"]
    assert len(edges) == 3
    edges_by_to = {e["to_species_id"]: e for e in edges}

    assert 134 in edges_by_to
    assert edges_by_to[134]["from_species_id"] == 133
    assert edges_by_to[134]["requirements"]["trigger_item"]["id"] == 83
    assert edges_by_to[134]["requirements"]["trigger_item"]["name"] == "Water Stone"

    assert 135 in edges_by_to
    assert edges_by_to[135]["from_species_id"] == 133
    assert edges_by_to[135]["requirements"]["trigger_item"]["id"] == 84
    assert edges_by_to[135]["requirements"]["trigger_item"]["name"] == "Thunder Stone"

    assert 136 in edges_by_to
    assert edges_by_to[136]["from_species_id"] == 133
    assert edges_by_to[136]["requirements"]["trigger_item"]["id"] == 85
    assert edges_by_to[136]["requirements"]["trigger_item"]["name"] == "Fire Stone"


def test_pokemon_evolutions_single_stage_and_404(setup_test_app):
    client = setup_test_app["client"]

    # 404 if Pokémon not found
    resp_404 = client.get("/api/pokemon/99999/evolutions")
    assert resp_404.status_code == 404

    # Single-stage species (Snorlax id=143) returns 1 node and empty edges
    resp_single = client.get("/api/pokemon/143/evolutions")
    assert resp_single.status_code == 200
    data = resp_single.json()
    assert len(data["nodes"]) == 1
    assert data["nodes"][0]["species_id"] == 143
    assert data["edges"] == []


# ==========================================
# 3. Locations Endpoint Tests
# ==========================================

def test_locations_pagination_and_filters(setup_test_app):
    client = setup_test_app["client"]
    engine = setup_test_app["engine"]

    # List with pagination
    with count_queries(engine) as queries:
        resp = client.get("/api/locations?limit=1&offset=0")
    assert resp.status_code == 200
    data = resp.json()
    assert len(queries) <= 3
    assert data["total"] >= 2
    assert len(data["items"]) == 1
    assert data["items"][0]["region"] is not None

    # Filter by region_id
    resp_reg = client.get("/api/locations?region_id=1")
    assert resp_reg.status_code == 200
    for loc in resp_reg.json()["items"]:
        assert loc["region"]["id"] == 1

    # Filter by region identifier
    resp_reg_slug = client.get("/api/locations?region=kanto")
    assert resp_reg_slug.status_code == 200
    for loc in resp_reg_slug.json()["items"]:
        assert loc["region"]["identifier"] == "kanto"

    # Search by name
    resp_search = client.get("/api/locations?search=canalave")
    assert resp_search.status_code == 200
    items = resp_search.json()["items"]
    assert len(items) == 1
    assert "Canalave" in items[0]["name"]


def test_location_detail_with_area_pokemon_counts(setup_test_app):
    client = setup_test_app["client"]
    engine = setup_test_app["engine"]

    with count_queries(engine) as queries:
        resp = client.get("/api/locations/1")
    assert resp.status_code == 200
    data = resp.json()
    assert len(queries) <= 4

    assert data["id"] == 1
    assert "areas" in data
    assert len(data["areas"]) >= 1
    area = data["areas"][0]
    assert "pokemon_count" in area
    # Area 1 has wild encounters with Pikachu
    assert area["pokemon_count"] >= 1

    # 404 for non-existent location
    resp_404 = client.get("/api/locations/99999")
    assert resp_404.status_code == 404


# ==========================================
# 4. Items Pockets & Berries Endpoint Tests
# ==========================================

def test_items_pockets_and_route_shadowing(setup_test_app):
    client = setup_test_app["client"]
    engine = setup_test_app["engine"]

    # Crucial check: /items/pockets must NOT be shadowed by /items/{item_id}
    with count_queries(engine) as queries:
        resp = client.get("/api/items/pockets")
    assert resp.status_code == 200
    data = resp.json()
    assert len(queries) <= 4

    assert isinstance(data, list)
    assert len(data) >= 1
    pocket = data[0]
    assert "categories" in pocket
    assert len(pocket["categories"]) >= 1
    category = pocket["categories"][0]
    assert "items" in category

    # Verify short_effect on pocket items and null handling when text is missing
    all_items = {it["id"]: it for p in data for c in p.get("categories", []) for it in c.get("items", [])}
    assert 1 in all_items
    assert all_items[1]["short_effect"] == "Catches a wild Pokémon every time."
    assert 84 in all_items
    assert all_items[84]["short_effect"] is None


def test_item_detail_and_effects_endpoints(setup_test_app):
    """
    Covers:
    - GET /api/items/{id} returns full effect and short_effect
    - GET /api/items/{id} handles null when effect prose is missing
    - GET /api/items/{id}/effect returns ItemEffectResponse (item_id, short_effect, effect)
    - GET /api/items/{id}/effect handles nulls when effect prose is missing
    - GET /api/items/{id}/effect returns 404 on missing item
    - ETag and Cache-Control headers on 200, 304 on matching If-None-Match, no public headers on 404
    """
    client = setup_test_app["client"]

    # 1. Detail returns full effect and short_effect
    resp1 = client.get("/api/items/1")
    assert resp1.status_code == 200
    d1 = resp1.json()
    assert d1["id"] == 1
    assert d1["short_effect"] == "Catches a wild Pokémon every time."
    assert "Catches a wild Pokémon without fail." in d1["effect"]

    # 2. Detail when text is missing (item 84 has only Japanese prose in fixtures)
    resp84 = client.get("/api/items/84")
    assert resp84.status_code == 200
    d84 = resp84.json()
    assert d84["id"] == 84
    assert d84["short_effect"] is None
    assert d84["effect"] is None

    # 3. GET /api/items/{id}/effect endpoint returns ItemEffectResponse
    resp_eff = client.get("/api/items/1/effect")
    assert resp_eff.status_code == 200
    eff_data = resp_eff.json()
    assert eff_data["item_id"] == 1
    assert eff_data["short_effect"] == "Catches a wild Pokémon every time."
    assert "Catches a wild Pokémon without fail." in eff_data["effect"]

    # ETag and Cache-Control headers on 200
    etag = resp_eff.headers.get("etag")
    assert etag is not None
    assert "public" in resp_eff.headers.get("cache-control", "")
    assert "max-age=86400" in resp_eff.headers.get("cache-control", "")

    # 304 on matching If-None-Match
    resp_304 = client.get("/api/items/1/effect", headers={"If-None-Match": etag})
    assert resp_304.status_code == 304
    assert resp_304.headers.get("etag") == etag

    # Item with no English effect prose returns null fields
    resp_eff84 = client.get("/api/items/84/effect")
    assert resp_eff84.status_code == 200
    assert resp_eff84.json() == {"item_id": 84, "short_effect": None, "effect": None}

    # 404 for missing item has no public cache or etag
    resp_404 = client.get("/api/items/999999/effect")
    assert resp_404.status_code == 404
    assert "etag" not in resp_404.headers
    assert "public" not in resp_404.headers.get("cache-control", "")




def test_berries_stats_and_pagination(setup_test_app):
    client = setup_test_app["client"]
    engine = setup_test_app["engine"]

    with count_queries(engine) as queries:
        resp = client.get("/api/berries?limit=10&offset=0")
    assert resp.status_code == 200
    data = resp.json()
    assert len(queries) <= 4

    assert len(data) >= 1
    berry = data[0]
    assert berry["id"] == 1
    assert berry["growth_time"] == 3
    assert berry["natural_gift_power"] == 60
    assert "flavors" in berry
    assert len(berry["flavors"]) >= 1


# ==========================================
# 5. Meta Endpoint Tests
# ==========================================

def test_meta_data_version(setup_test_app):
    client = setup_test_app["client"]
    meta_router.reset_meta_cache()

    resp = client.get("/api/meta/data-version")
    assert resp.status_code == 200
    data = resp.json()

    assert "data_version" in data
    assert data["pokeapi_ref"] == "master-test"
    assert data["ingested_at"] is not None
    assert data["schema_revision"] == "0002"

    # Cached in memory for 60 seconds
    resp2 = client.get("/api/meta/data-version")
    assert resp2.status_code == 200
    assert resp2.json() == data


# ==========================================
# 6. HTTP Caching & ETag Tests
# ==========================================

def test_http_caching_etag_and_304_zero_queries(setup_test_app):
    client = setup_test_app["client"]
    engine = setup_test_app["engine"]
    http_cache.reset_cached_data_version()

    # 1. First GET request returns 200 with ETag and Cache-Control
    resp1 = client.get("/api/locations")
    assert resp1.status_code == 200
    etag = resp1.headers.get("etag")
    cache_control = resp1.headers.get("cache-control")

    assert etag is not None
    assert etag.startswith('W/"')
    assert "public" in cache_control
    assert "max-age=86400" in cache_control
    assert "stale-while-revalidate=604800" in cache_control

    # 2. Second GET with matching If-None-Match must return 304 with ZERO DB queries!
    with count_queries(engine) as queries:
        resp2 = client.get("/api/locations", headers={"If-None-Match": etag})
    assert resp2.status_code == 304
    assert resp2.headers.get("etag") == etag
    assert len(resp2.content) == 0  # 304 body must be empty
    assert len(queries) == 0, f"Expected 0 DB queries on 304, got {len(queries)}"


def test_http_caching_excluded_endpoints(setup_test_app):
    client = setup_test_app["client"]

    # Endpoints like /api/health or auth/teams must NOT have encyclopedia ETag caching
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert "stale-while-revalidate" not in resp.headers.get("cache-control", "")


def test_404_responses_carry_no_public_cache_control_or_etag(setup_test_app):
    client = setup_test_app["client"]

    # Missing Pokémon encounters -> 404
    resp = client.get("/api/pokemon/999999/encounters")
    assert resp.status_code == 404
    assert "etag" not in resp.headers
    assert "public" not in resp.headers.get("cache-control", "")

    # Missing location -> 404
    resp_loc = client.get("/api/locations/999999")
    assert resp_loc.status_code == 404
    assert "etag" not in resp_loc.headers
    assert "public" not in resp_loc.headers.get("cache-control", "")


def test_data_version_has_no_cache_and_supports_etag_304(setup_test_app):
    client = setup_test_app["client"]

    # 1. GET /api/meta/data-version sends Cache-Control: no-cache, NEVER the 24h policy
    resp = client.get("/api/meta/data-version")
    assert resp.status_code == 200
    cache_ctrl = resp.headers.get("cache-control", "")
    assert "no-cache" in cache_ctrl
    assert "max-age=86400" not in cache_ctrl
    assert "public" not in cache_ctrl

    etag = resp.headers.get("etag")
    assert etag is not None
    assert etag.startswith('W/"')

    # 2. 304 response on matching If-None-Match retains Cache-Control: no-cache
    resp_304 = client.get("/api/meta/data-version", headers={"If-None-Match": etag})
    assert resp_304.status_code == 304
    assert resp_304.headers.get("etag") == etag
    assert "no-cache" in resp_304.headers.get("cache-control", "")
    assert "max-age=86400" not in resp_304.headers.get("cache-control", "")


def test_changing_app_api_version_changes_etag(monkeypatch):
    data_version = "master-test:2026-10-16"
    path = "/api/locations"

    etag1 = http_cache.compute_etag(data_version, path)
    
    orig = http_cache.APP_API_VERSION
    try:
        http_cache.APP_API_VERSION = "v999.0.0"
        etag2 = http_cache.compute_etag(data_version, path)
        assert etag1 != etag2, f"ETag should change when APP_API_VERSION changes: {etag1} == {etag2}"
    finally:
        http_cache.APP_API_VERSION = orig

    # Direct api_version parameter override
    etag3 = http_cache.compute_etag(data_version, path, api_version="v-custom")
    assert etag3 != etag1

    # Render git commit fallback test (RENDER_GIT_COMMIT)
    monkeypatch.delenv("APP_API_VERSION", raising=False)
    monkeypatch.delenv("GIT_SHA", raising=False)
    monkeypatch.setenv("RENDER_GIT_COMMIT", "render-commit-abc1234")
    etag_render = http_cache.compute_etag(data_version, path)
    assert etag_render != etag1


def test_versions_endpoint_shape_and_ordering(setup_test_app):
    client = setup_test_app["client"]

    resp = client.get("/api/versions")
    assert resp.status_code == 200
    assert resp.headers.get("etag") is not None
    assert "public" in resp.headers.get("cache-control", "")

    versions = resp.json()
    assert len(versions) >= 2

    # Check fields
    v0 = versions[0]
    for required in ["id", "identifier", "name", "version_group_id", "version_group", "generation_id"]:
        assert required in v0, f"Missing field {required} in version response: {v0}"

    assert v0["version_group"] == "red-blue"
    assert v0["generation_id"] == 1

    # Verify ordered by version group order then id
    ids = [v["id"] for v in versions]
    assert ids == sorted(ids)


def test_regions_endpoint_shape_and_ordering(setup_test_app):
    client = setup_test_app["client"]

    resp = client.get("/api/regions")
    assert resp.status_code == 200
    assert resp.headers.get("etag") is not None
    assert "public" in resp.headers.get("cache-control", "")

    regions = resp.json()
    assert len(regions) >= 1

    r0 = regions[0]
    for required in ["id", "identifier", "name"]:
        assert required in r0, f"Missing field {required} in region response: {r0}"

    assert r0["identifier"] == "kanto"
    assert r0["name"] == "Kanto"

    # Verify ordered by id
    ids = [r["id"] for r in regions]
    assert ids == sorted(ids)
