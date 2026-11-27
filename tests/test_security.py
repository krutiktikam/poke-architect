"""Security regression tests for auth, exports, error handling, CORS, and secret loading."""

import csv
import io
import os
import subprocess
import sys
from pathlib import Path

from fastapi.testclient import TestClient

from backend import auth
from backend.config import DEFAULT_ALLOWED_ORIGINS, get_allowed_origins
from backend.database import get_db
from backend.main import app
from backend.models import SavedTeam, User

REPO_ROOT = str(Path(__file__).resolve().parent.parent)


def _make_auth_headers(user: User) -> dict:
    token = auth.create_access_token(data={"sub": user.email, "user_id": user.id})
    return {"Authorization": f"Bearer {token}"}


def test_export_teams_requires_auth(client: TestClient):
    res = client.get("/api/analytics/export/teams")
    assert res.status_code == 401


def test_export_pokemon_remains_public(client: TestClient):
    res = client.get("/api/analytics/export/pokemon")
    assert res.status_code == 200
    assert "text/csv" in res.headers.get("content-type", "")


def test_export_teams_isolated_per_user(client: TestClient, db_session):
    alice = User(email="alice.sec@example.com", name="Alice", google_id="google-alice-sec")
    bob = User(email="bob.sec@example.com", name="Bob", google_id="google-bob-sec")
    db_session.add_all([alice, bob])
    db_session.commit()
    db_session.refresh(alice)
    db_session.refresh(bob)

    alice_team = SavedTeam(
        user_id=alice.id,
        name="Alice Private Squad",
        team_data="[25]",
        is_public=False,
    )
    bob_team = SavedTeam(
        user_id=bob.id,
        name="Bob Public Squad",
        team_data="[6]",
        is_public=True,
    )
    db_session.add_all([alice_team, bob_team])
    db_session.commit()

    try:
        res_alice = client.get("/api/analytics/export/teams", headers=_make_auth_headers(alice))
        assert res_alice.status_code == 200
        rows_alice = list(csv.DictReader(io.StringIO(res_alice.text)))
        assert len(rows_alice) == 1
        assert rows_alice[0]["team_name"] == "Alice Private Squad"
        assert rows_alice[0]["user_name"] == "Alice"
        assert rows_alice[0]["pokemon_1"] == "Pikachu"
        assert "Bob" not in res_alice.text

        res_bob = client.get("/api/analytics/export/teams", headers=_make_auth_headers(bob))
        assert res_bob.status_code == 200
        rows_bob = list(csv.DictReader(io.StringIO(res_bob.text)))
        assert len(rows_bob) == 1
        assert rows_bob[0]["team_name"] == "Bob Public Squad"
        assert rows_bob[0]["user_name"] == "Bob"
        assert rows_bob[0]["pokemon_1"] == "Charizard"
        assert "Alice" not in res_bob.text
    finally:
        db_session.query(SavedTeam).filter(SavedTeam.user_id.in_([alice.id, bob.id])).delete(synchronize_session=False)
        db_session.query(User).filter(User.id.in_([alice.id, bob.id])).delete(synchronize_session=False)
        db_session.commit()


def test_global_exception_handler_hides_details_and_restricts_origin(db_session):
    def _boom_db():
        raise RuntimeError("sensitive internal db connection string leaked")
        yield  # pragma: no cover

    prev_override = app.dependency_overrides.get(get_db)
    app.dependency_overrides[get_db] = _boom_db
    try:
        with TestClient(app, raise_server_exceptions=False) as err_client:
            res_evil = err_client.get(
                "/api/pokemon/25",
                headers={"Origin": "https://poke-architect-evil.vercel.app"},
            )
            assert res_evil.status_code == 500
            body_evil = res_evil.json()
            assert body_evil == {"detail": "Internal Server Error"}
            assert "error" not in body_evil
            assert "type" not in body_evil
            assert "access-control-allow-origin" not in res_evil.headers

            res_allowed = err_client.get(
                "/api/pokemon/25",
                headers={"Origin": "https://poke-architect.vercel.app"},
            )
            assert res_allowed.status_code == 500
            assert res_allowed.json() == {"detail": "Internal Server Error"}
            assert res_allowed.headers.get("access-control-allow-origin") == "https://poke-architect.vercel.app"
    finally:
        if prev_override is not None:
            app.dependency_overrides[get_db] = prev_override
        else:
            app.dependency_overrides.pop(get_db, None)


def test_pokemon_route_error_does_not_leak_exception(client: TestClient, monkeypatch):
    def _broken_query(*args, **kwargs):
        raise RuntimeError("secret postgres detail")

    # Force an error inside /api/pokemon's try/except block via Session.query
    from sqlalchemy.orm import Session
    monkeypatch.setattr(Session, "query", _broken_query)

    res = client.get("/api/pokemon")
    assert res.status_code == 500
    body = res.json()
    assert body["detail"] == "Database query failed"
    assert "secret postgres detail" not in res.text


def test_cors_preflight_blocks_evil_vercel_preview(client: TestClient):
    res_evil = client.options(
        "/api/pokemon",
        headers={
            "Origin": "https://poke-architect-evil.vercel.app",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert "access-control-allow-origin" not in res_evil.headers

    res_good = client.options(
        "/api/pokemon",
        headers={
            "Origin": "https://poke-architect.vercel.app",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert res_good.status_code == 200
    assert res_good.headers.get("access-control-allow-origin") == "https://poke-architect.vercel.app"


def test_allowed_origins_ignores_wildcard(caplog):
    with caplog.at_level("WARNING"):
        origins = get_allowed_origins("*, https://custom.example.com")

    assert "*" not in origins
    for default_origin in DEFAULT_ALLOWED_ORIGINS:
        assert default_origin in origins
    assert "https://custom.example.com" in origins
    assert any("*" in rec.message for rec in caplog.records)


def test_allowed_origins_wildcard_only_still_blocks_evil_origin_in_app():
    clean_env = {
        "PATH": os.environ.get("PATH", ""),
        "SYSTEMROOT": os.environ.get("SYSTEMROOT", ""),
        "DATABASE_URL": "sqlite:///:memory:",
        "ALLOWED_ORIGINS": "*",
        "PYTHONPATH": REPO_ROOT,
    }
    script = (
        "from fastapi.testclient import TestClient\n"
        "from backend.main import app\n"
        "c = TestClient(app)\n"
        "r = c.options('/api/pokemon', headers={'Origin': 'https://poke-architect-evil.vercel.app', 'Access-Control-Request-Method': 'GET'})\n"
        "assert 'access-control-allow-origin' not in r.headers, r.headers\n"
        "r2 = c.options('/api/pokemon', headers={'Origin': 'https://poke-architect.vercel.app', 'Access-Control-Request-Method': 'GET'})\n"
        "assert r2.headers.get('access-control-allow-origin') == 'https://poke-architect.vercel.app'\n"
    )
    proc = subprocess.run(
        [sys.executable, "-c", script],
        env=clean_env,
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode == 0, f"stderr: {proc.stderr}\nstdout: {proc.stdout}"


def test_config_raises_runtime_error_when_render_set_without_secret_key():
    for extra_env in (
        {"RENDER": "true"},
        {"ENVIRONMENT": "production"},
        {"RENDER": "1", "SECRET_KEY": "your-secret-key-change-it-in-prod"},
        {"ENVIRONMENT": "production", "SECRET_KEY": "your-session-secret-change-it"},
    ):
        clean_env = {
            "PATH": os.environ.get("PATH", ""),
            "SYSTEMROOT": os.environ.get("SYSTEMROOT", ""),
            "PYTHONPATH": REPO_ROOT,
            **extra_env,
        }
        proc = subprocess.run(
            [sys.executable, "-c", "import backend.config"],
            env=clean_env,
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        assert proc.returncode != 0, f"Expected RuntimeError for {extra_env}"
        assert "RuntimeError" in proc.stderr


def test_config_dev_generates_ephemeral_secret_without_render():
    clean_env = {
        "PATH": os.environ.get("PATH", ""),
        "SYSTEMROOT": os.environ.get("SYSTEMROOT", ""),
        "PYTHONPATH": REPO_ROOT,
    }
    proc = subprocess.run(
        [sys.executable, "-c", "import backend.config as c; print(len(c.SECRET_KEY))"],
        env=clean_env,
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode == 0, proc.stderr
    assert int(proc.stdout.strip()) >= 48
