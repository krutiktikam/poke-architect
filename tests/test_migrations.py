import argparse
from pathlib import Path

import pytest
from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from sqlalchemy import create_engine

import backend.models
import backend.models.evolution
import backend.models.world
from backend.database import Base


def _get_alembic_config(db_url: str) -> Config:
    backend_dir = Path(__file__).resolve().parent.parent / "backend"
    ini_path = backend_dir / "alembic.ini"
    cfg = Config(str(ini_path))
    cfg.set_main_option("script_location", str(backend_dir / "migrations"))
    cfg.set_main_option("sqlalchemy.url", db_url)
    cfg.cmd_opts = argparse.Namespace(x=[f"db={db_url}"])
    return cfg


def _filter_target_diffs(diffs):
    target_tables = {"pokemon_moves", "pokemon_move_methods"}
    relevant = []

    def mentions_target(obj):
        if obj is None:
            return False
        if isinstance(obj, str):
            return obj in target_tables
        table_obj = getattr(obj, "table", None)
        if table_obj is not None:
            tname = getattr(table_obj, "name", str(table_obj))
            if tname in target_tables:
                return True
        name = getattr(obj, "name", None)
        if name in target_tables:
            return True
        return any(t in str(obj) for t in target_tables)

    for diff in diffs:
        if isinstance(diff, (list, tuple)):
            if any(mentions_target(item) for item in diff):
                relevant.append(diff)
        elif mentions_target(diff):
            relevant.append(diff)

    return relevant


def test_migrations_clean_head_and_downgrade(tmp_path, monkeypatch):
    db_file = tmp_path / "test_migration.db"
    db_url = f"sqlite:///{db_file.as_posix()}"

    monkeypatch.setenv("DATABASE_URL", db_url)
    cfg = _get_alembic_config(db_url)

    # 1. upgrade head from an empty DB succeeds
    command.upgrade(cfg, "head")

    # Verify schema against Base.metadata using compare_metadata
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False},
    )

    try:
        with engine.connect() as connection:
            mc = MigrationContext.configure(
                connection,
                opts={
                    "compare_type": True,
                    "compare_server_default": True,
                },
            )
            diffs = compare_metadata(mc, Base.metadata)
            target_diffs = _filter_target_diffs(diffs)
            assert target_diffs == [], f"Unexpected schema diffs for target tables: {target_diffs}"

        # 2. downgrade -1 then upgrade head succeeds
        command.downgrade(cfg, "-1")
        command.upgrade(cfg, "head")

        with engine.connect() as connection:
            mc = MigrationContext.configure(
                connection,
                opts={
                    "compare_type": True,
                    "compare_server_default": True,
                },
            )
            diffs = compare_metadata(mc, Base.metadata)
            target_diffs = _filter_target_diffs(diffs)
            assert target_diffs == [], f"Unexpected schema diffs after re-upgrade: {target_diffs}"
    finally:
        engine.dispose()
