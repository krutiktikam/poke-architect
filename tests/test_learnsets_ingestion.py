"""
Unit tests for the learnsets ingestion stage in scripts/populate_extended.py.

Covers:
(a) --all stage list does NOT contain 'learnsets'
(b) Happy path: pokemon_move_methods and pokemon_moves rows land with correct
    version_group_id, method_id, level, order, generation_id, and learn_method
(c) Idempotency: running populate_learnsets twice yields identical row counts
(d) Orphan handling: unknown pokemon_id, move_id, version_group_id, and method_id
    are skipped and recorded under exact orphan counter keys
(e) Duplicate natural keys within one batch do not crash upsert
(f) Prerequisite failure: empty moves table raises RuntimeError
(g) ID alignment guard: move names mismatching CSV identifiers raises RuntimeError
"""

import os
from collections import Counter
from typing import Dict

import pytest
from sqlalchemy import create_engine, event, func, select
from sqlalchemy.orm import Session

from backend.database import Base
from backend.models import (
    Generation,
    Move,
    Pokemon,
    PokemonMove,
    PokemonMoveMethod,
    VersionGroup,
)
from scripts.populate_extended import (
    ALL_STAGES_ORDER,
    OPT_IN_STAGES,
    STAGE_DEPENDENCY_ORDER,
    _check_id_alignment,
    populate_learnsets,
)


@pytest.fixture
def db_session():
    """
    Creates an isolated in-memory SQLite database with foreign keys enforced.
    Pre-populates baseline Pokemon, Move, and VersionGroup records.
    """
    engine = create_engine("sqlite:///:memory:")

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    session = Session(engine)

    # Seed baseline Pokemon
    session.add_all([
        Pokemon(
            id=1,
            name="bulbasaur",
            type1="Grass",
            hp=45,
            attack=49,
            defense=49,
            special_attack=65,
            special_defense=65,
            speed=45,
            region="kanto",
            generation=1,
        ),
        Pokemon(
            id=25,
            name="pikachu",
            type1="Electric",
            hp=35,
            attack=55,
            defense=40,
            special_attack=50,
            special_defense=50,
            speed=90,
            region="kanto",
            generation=1,
        ),
    ])

    # Seed baseline Moves
    session.add_all([
        Move(id=22, name="vine-whip", type="Grass", pp=25, priority=0, damage_class="physical"),
        Move(id=73, name="leech-seed", type="Grass", pp=10, priority=0, damage_class="status"),
        Move(id=85, name="thunderbolt", type="Electric", pp=15, priority=0, damage_class="special"),
    ])

    # Seed baseline Generation and VersionGroup
    session.add(Generation(id=1, identifier="generation-i"))
    session.add(VersionGroup(id=1, identifier="red-blue", generation_id=1, order=1))
    session.commit()

    yield session

    session.close()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def _write_csv(directory: str, filename: str, content: str) -> str:
    path = os.path.join(directory, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    return path


def _create_minimal_fixtures(csv_dir: str, pokemon_moves_content: str) -> None:
    _write_csv(
        csv_dir,
        "pokemon_move_methods.csv",
        "id,identifier\n1,level-up\n2,egg\n3,tutor\n4,machine\n",
    )
    _write_csv(
        csv_dir,
        "pokemon_move_method_prose.csv",
        "pokemon_move_method_id,local_language_id,name,description\n"
        "1,9,Level up,Learned by leveling up.\n"
        "4,9,Machine,Learned by TM/HM.\n",
    )
    _write_csv(
        csv_dir,
        "moves.csv",
        "id,identifier\n22,vine-whip\n73,leech-seed\n85,thunderbolt\n",
    )
    _write_csv(
        csv_dir,
        "pokemon_species.csv",
        "id,identifier\n1,bulbasaur\n25,pikachu\n",
    )
    _write_csv(
        csv_dir,
        "pokemon_moves.csv",
        pokemon_moves_content,
    )


def test_all_stage_list_does_not_contain_learnsets():
    """
    Ensure 'learnsets' is opt-in and NOT in STAGE_DEPENDENCY_ORDER,
    but is present in OPT_IN_STAGES and ALL_STAGES_ORDER.
    """
    assert "learnsets" not in STAGE_DEPENDENCY_ORDER
    assert "learnsets" in OPT_IN_STAGES
    assert "learnsets" in ALL_STAGES_ORDER
    assert ALL_STAGES_ORDER == STAGE_DEPENDENCY_ORDER + OPT_IN_STAGES


def test_happy_path_learnsets_ingestion(db_session: Session, tmp_path):
    """
    Happy path: methods + a few pokemon_moves rows land with correct
    version_group_id, method_id, level, order; legacy generation_id and learn_method are filled.
    """
    csv_dir = str(tmp_path)
    pm_content = (
        "pokemon_id,version_group_id,move_id,pokemon_move_method_id,level,order\n"
        "1,1,73,1,7,1\n"
        "1,1,22,1,13,2\n"
        "25,1,85,4,0,\n"
    )
    _create_minimal_fixtures(csv_dir, pm_content)

    counts = populate_learnsets(db_session, csv_dir=csv_dir)

    assert counts.get("pokemon_move_methods", 0) == 4
    assert counts.get("pokemon_moves", 0) == 3

    # Check methods in DB
    methods = {
        m.identifier: m.name
        for m in db_session.scalars(select(PokemonMoveMethod)).all()
    }
    assert methods["level-up"] == "Level up"
    assert methods["machine"] == "Machine"
    assert methods["egg"] == "Egg"  # Fallback title-cased

    # Check pokemon_moves rows in DB
    moves = db_session.scalars(select(PokemonMove).order_by(PokemonMove.id)).all()
    assert len(moves) == 3

    m1 = next(m for m in moves if m.pokemon_id == 1 and m.move_id == 73)
    assert m1.version_group_id == 1
    assert m1.method_id == 1
    assert m1.level == 7
    assert m1.order == 1
    assert m1.generation_id == 1
    assert m1.learn_method == "level-up"

    m2 = next(m for m in moves if m.pokemon_id == 1 and m.move_id == 22)
    assert m2.version_group_id == 1
    assert m2.method_id == 1
    assert m2.level == 13
    assert m2.order == 2
    assert m2.generation_id == 1
    assert m2.learn_method == "level-up"

    m3 = next(m for m in moves if m.pokemon_id == 25 and m.move_id == 85)
    assert m3.version_group_id == 1
    assert m3.method_id == 4
    assert m3.level == 0
    assert m3.order is None
    assert m3.generation_id == 1
    assert m3.learn_method == "machine"


def test_idempotency_running_twice_leaves_count_unchanged(db_session: Session, tmp_path):
    """
    Running populate_learnsets twice on the same session leaves row counts unchanged.
    """
    csv_dir = str(tmp_path)
    pm_content = (
        "pokemon_id,version_group_id,move_id,pokemon_move_method_id,level,order\n"
        "1,1,73,1,7,1\n"
        "1,1,22,1,13,2\n"
    )
    _create_minimal_fixtures(csv_dir, pm_content)

    counts1 = populate_learnsets(db_session, csv_dir=csv_dir)
    assert counts1.get("pokemon_moves") == 2

    pm_count_1 = db_session.scalar(select(func.count(PokemonMove.id)))
    pmm_count_1 = db_session.scalar(select(func.count(PokemonMoveMethod.id)))

    # Second run
    counts2 = populate_learnsets(db_session, csv_dir=csv_dir)
    pm_count_2 = db_session.scalar(select(func.count(PokemonMove.id)))
    pmm_count_2 = db_session.scalar(select(func.count(PokemonMoveMethod.id)))

    assert pm_count_1 == pm_count_2 == 2
    assert pmm_count_1 == pmm_count_2 == 4


def test_orphan_handling(db_session: Session, tmp_path):
    """
    Orphan handling: unknown pokemon_id / move_id / version_group_id / method_id
    rows are skipped and counted under exact expected keys.
    """
    csv_dir = str(tmp_path)
    pm_content = (
        "pokemon_id,version_group_id,move_id,pokemon_move_method_id,level,order\n"
        "1,1,73,1,7,1\n"
        "9999,1,73,1,7,1\n"  # unknown pokemon_id
        "1,1,9999,1,7,1\n"  # unknown move_id
        "1,9999,73,1,7,1\n"  # unknown version_group_id
        "1,1,73,9999,7,1\n"  # unknown method_id
    )
    _create_minimal_fixtures(csv_dir, pm_content)

    orphans: Dict[str, int] = {}
    counts = populate_learnsets(db_session, csv_dir=csv_dir, orphan_counts=orphans)

    assert counts.get("pokemon_moves") == 1
    assert orphans.get("learnset: pokemon_id not in pokemon (forms unsupported)") == 1
    assert orphans.get("learnset: missing move_id") == 1
    assert orphans.get("learnset: missing version_group_id") == 1
    assert orphans.get("learnset: missing method_id") == 1


def test_duplicate_natural_keys_within_batch(db_session: Session, tmp_path):
    """
    Duplicate natural keys within one batch do not crash upsert;
    last value in batch updates earlier fields.
    """
    csv_dir = str(tmp_path)
    pm_content = (
        "pokemon_id,version_group_id,move_id,pokemon_move_method_id,level,order\n"
        "1,1,73,1,7,1\n"
        "1,1,73,1,7,99\n"  # duplicate key (1, 1, 73, 1, 7) with order=99
    )
    _create_minimal_fixtures(csv_dir, pm_content)

    counts = populate_learnsets(db_session, csv_dir=csv_dir)
    assert counts.get("pokemon_moves") == 1

    row = db_session.scalar(select(PokemonMove).where(PokemonMove.pokemon_id == 1))
    assert row is not None
    assert row.order == 99


def test_prerequisite_failure_empty_moves_raises(db_session: Session, tmp_path):
    """
    Prerequisite failure: empty moves table raises RuntimeError.
    """
    csv_dir = str(tmp_path)
    _create_minimal_fixtures(csv_dir, "pokemon_id,version_group_id,move_id,pokemon_move_method_id,level,order\n")

    # Clear moves table
    db_session.query(PokemonMove).delete()
    db_session.query(Move).delete()
    db_session.commit()

    with pytest.raises(RuntimeError) as exc_info:
        populate_learnsets(db_session, csv_dir=csv_dir)

    assert "Prerequisite tables missing or empty: moves (run scripts/populate_moves_natures.py)" in str(exc_info.value)


def test_id_alignment_guard_move_mismatch_raises(db_session: Session, tmp_path):
    """
    ID alignment guard: move names mismatching CSV identifiers beyond 2% raises RuntimeError.
    """
    csv_dir = str(tmp_path)
    _create_minimal_fixtures(csv_dir, "pokemon_id,version_group_id,move_id,pokemon_move_method_id,level,order\n")

    # Corrupt a move name in DB
    move = db_session.get(Move, 22)
    assert move is not None
    move.name = "completely-wrong-name"
    db_session.commit()

    with pytest.raises(RuntimeError) as exc_info:
        populate_learnsets(db_session, csv_dir=csv_dir)

    assert "ID alignment check failed for moves" in str(exc_info.value)


def test_id_alignment_form_suffixed_names_match():
    """
    Form-suffixed names ('Deoxys-normal' vs 'deoxys', 'Nidoran♀' vs 'nidoran-f')
    count as matches and do not raise or count as mismatches.
    """
    db_names = {
        386: "Deoxys-normal",
        29: "Nidoran♀",
        413: "Wormadam-plant",
        487: "Giratina-altered",
    }
    csv_idents = {
        386: "deoxys",
        29: "nidoran-f",
        413: "wormadam",
        487: "giratina",
    }
    # Should complete cleanly without error
    _check_id_alignment("pokemon", db_names, csv_idents)


def test_id_alignment_genuinely_misaligned_ids_raise():
    """
    Genuinely misaligned IDs (e.g. DB id 1 named 'Charmander' vs CSV id 1 'bulbasaur')
    across > 2% of rows still raise RuntimeError.
    """
    # 50 aligned rows, 2 misaligned rows -> 2/52 = 3.85% > 2%
    db_names = {i: f"pokemon-{i}" for i in range(1, 51)}
    csv_idents = {i: f"pokemon-{i}" for i in range(1, 51)}

    db_names[100] = "Charmander"
    csv_idents[100] = "bulbasaur"
    db_names[101] = "Squirtle"
    csv_idents[101] = "caterpie"

    with pytest.raises(RuntimeError) as exc_info:
        _check_id_alignment("pokemon", db_names, csv_idents)

    err = str(exc_info.value)
    assert "ID alignment check failed for pokemon" in err
    assert "exceeds threshold 0.02" in err
    assert "ID 100: DB='Charmander' vs CSV='bulbasaur'" in err


def test_id_alignment_zero_overlap_raises():
    """
    Zero-overlap between database and CSV IDs still raises RuntimeError.
    """
    db_names = {1: "bulbasaur", 2: "ivysaur"}
    csv_idents = {3: "venusaur", 4: "charmander"}

    with pytest.raises(RuntimeError) as exc_info:
        _check_id_alignment("pokemon", db_names, csv_idents)

    assert "zero overlapping IDs between database and CSV" in str(exc_info.value)


def test_populate_learnsets_tolerates_form_suffixes(db_session: Session, tmp_path):
    """
    End-to-end populate_learnsets test: verifies that form-suffixed names
    (e.g. 'Deoxys-normal', 'Nidoran♀') in the Pokemon table pass preflight ID alignment.
    """
    csv_dir = str(tmp_path)
    db_session.add(Pokemon(id=386, name="Deoxys-normal", type1="Psychic", generation=3, region="hoenn"))
    db_session.add(Pokemon(id=29, name="Nidoran♀", type1="Poison", generation=1, region="kanto"))
    db_session.commit()

    _create_minimal_fixtures(
        csv_dir,
        "pokemon_id,version_group_id,move_id,pokemon_move_method_id,level,order\n"
        "386,1,85,4,0,\n",
    )
    # Append deoxys and nidoran-f to pokemon_species.csv
    with open(os.path.join(csv_dir, "pokemon_species.csv"), "a", encoding="utf-8") as f:
        f.write("386,deoxys\n29,nidoran-f\n")

    counts = populate_learnsets(db_session, csv_dir=csv_dir)
    assert counts.get("pokemon_moves") == 1

