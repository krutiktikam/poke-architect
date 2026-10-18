"""
Unit tests for the CSV-based PokéArchitect ingestion pipeline.
Covers:
(a) Running --all twice yields identical row counts (idempotency)
(b) Orphan rows are skipped and reported without crashing
(c) English names are correctly selected from translation CSVs
(d) from_species_id is derived correctly for branching chains (Eevee-style)
(e) Missing required CSV column raises a clear error
"""

import os
import httpx
import pytest
from sqlalchemy import create_engine, event, func, select
from sqlalchemy.orm import Session

from backend.database import Base
from backend.models import (
    Berry,
    BerryFirmness,
    BerryFlavor,
    BerryFlavorMap,
    DataMeta,
    Encounter,
    EncounterCondition,
    EncounterConditionValue,
    encounter_condition_value_map,
    EncounterMethod,
    Evolution,
    EvolutionChain,
    EvolutionTrigger,
    Generation,
    Item,
    ItemCategory,
    ItemEffect,
    ItemPocket,
    Location,
    LocationArea,
    Pokemon,
    PokemonSpecies,
    Region,
    Type,
    Version,
    VersionGroup,
)
from scripts.populate_extended import (
    FILE_FOR_NAMES,
    STAGE_DEPENDENCY_ORDER,
    download_file,
    populate_encounter_methods_and_conditions,
    preflight_check,
    read_csv_rows,
    run_pipeline,
)

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures", "pokeapi_csv")


@pytest.fixture
def db_session():
    """
    Creates an isolated in-memory SQLite database with foreign keys enforced.
    Pre-populates basic Pokémon records to satisfy foreign keys for encounter tests.
    """
    engine = create_engine("sqlite:///:memory:")

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)

    session = Session(engine)

    # Seed baseline Pokémon records so encounter & evolution FKs can resolve
    seed_pokemon = [
        Pokemon(id=25, name="Pikachu", type1="Electric", hp=35, attack=55, defense=40, special_attack=50, special_defense=50, speed=90, sprite_url="", region="kanto", generation=1),
        Pokemon(id=133, name="Eevee", type1="Normal", hp=55, attack=55, defense=50, special_attack=45, special_defense=65, speed=55, sprite_url="", region="kanto", generation=1),
        Pokemon(id=134, name="Vaporeon", type1="Water", hp=130, attack=65, defense=60, special_attack=110, special_defense=95, speed=65, sprite_url="", region="kanto", generation=1),
        Pokemon(id=135, name="Jolteon", type1="Electric", hp=65, attack=65, defense=60, special_attack=110, special_defense=95, speed=130, sprite_url="", region="kanto", generation=1),
        Pokemon(id=136, name="Flareon", type1="Fire", hp=65, attack=130, defense=60, special_attack=95, special_defense=110, speed=65, sprite_url="", region="kanto", generation=1),
    ]
    session.add_all(seed_pokemon)
    session.commit()

    yield session

    session.close()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def test_idempotency_running_all_twice(db_session: Session):
    """
    (a) Running --all twice yields identical row counts across all tables.
    """
    # First execution
    counts_run1, _ = run_pipeline(
        session=db_session,
        stages=STAGE_DEPENDENCY_ORDER,
        csv_dir=FIXTURES_DIR,
        ref="test-ref",
        dry_run=False,
    )

    # Snapshot all table row counts
    tables_to_check = [
        Generation,
        Type,
        Region,
        VersionGroup,
        Version,
        ItemPocket,
        ItemCategory,
        Item,
        ItemEffect,
        BerryFirmness,
        BerryFlavor,
        Berry,
        BerryFlavorMap,
        Location,
        LocationArea,
        EncounterMethod,
        EncounterCondition,
        EncounterConditionValue,
        Encounter,
        EvolutionTrigger,
        EvolutionChain,
        PokemonSpecies,
        Evolution,
        DataMeta,
    ]

    snapshot1 = {
        model.__tablename__: db_session.execute(
            select(
                func.count(
                    model.id
                    if hasattr(model, "id")
                    else (model.item_id if hasattr(model, "item_id") else getattr(model, "key"))
                )
            )
        ).scalar()
        for model in tables_to_check
    }
    # Also check association table
    snapshot1["encounter_condition_value_map"] = db_session.execute(
        select(func.count(encounter_condition_value_map.c.encounter_id))
    ).scalar()

    # Second execution
    counts_run2, _ = run_pipeline(
        session=db_session,
        stages=STAGE_DEPENDENCY_ORDER,
        csv_dir=FIXTURES_DIR,
        ref="test-ref",
        dry_run=False,
    )

    snapshot2 = {
        model.__tablename__: db_session.execute(
            select(
                func.count(
                    model.id
                    if hasattr(model, "id")
                    else (model.item_id if hasattr(model, "item_id") else getattr(model, "key"))
                )
            )
        ).scalar()
        for model in tables_to_check
    }
    snapshot2["encounter_condition_value_map"] = db_session.execute(
        select(func.count(encounter_condition_value_map.c.encounter_id))
    ).scalar()

    assert snapshot1 == snapshot2, f"Row counts differ after second run: {snapshot1} vs {snapshot2}"
    assert snapshot1["regions"] == 1
    assert snapshot1["versions"] == 2
    assert snapshot1["evolutions"] == 3
    assert snapshot1["item_effects"] >= 3


def test_orphan_rows_skipped_and_reported(db_session: Session):
    """
    (b) Orphan rows (with missing foreign key targets) are skipped and reported.
    Never crashes on orphans.
    """
    table_counts, orphan_counts = run_pipeline(
        session=db_session,
        stages=STAGE_DEPENDENCY_ORDER,
        csv_dir=FIXTURES_DIR,
        ref="test-ref",
        dry_run=False,
    )

    # 1. Berry with missing item_id 9999 was skipped
    berries = db_session.scalars(select(Berry.id)).all()
    assert 1 in berries
    assert 2 not in berries  # Berry id 2 had invalid item_id 9999
    assert orphan_counts.get("berry: missing item_id", 0) >= 1

    # 2. Location with missing region_id 9999 was skipped or handled
    locations = db_session.scalars(select(Location.id)).all()
    assert 1 in locations
    assert 2 in locations
    assert orphan_counts.get("location: missing region_id", 0) >= 1

    # 3. Location Area with missing location_id 9999 was skipped
    areas = db_session.scalars(select(LocationArea.id)).all()
    assert 1 in areas
    assert 999 not in areas
    assert orphan_counts.get("location_area: missing location_id", 0) >= 1

    # 4. Encounter with missing pokemon_id 9999 was skipped
    encounters = db_session.scalars(select(Encounter.id)).all()
    assert 1 in encounters
    assert 2 in encounters
    assert 3 not in encounters  # Encounter 3 had invalid pokemon_id 9999
    assert orphan_counts.get("encounter: missing pokemon_id", 0) >= 1

    # 5. Evolution with missing to_species_id 9999 was skipped
    evolutions = db_session.scalars(select(Evolution.id)).all()
    assert 1 in evolutions
    assert 2 in evolutions
    assert 3 in evolutions
    assert 4 not in evolutions  # Evolution 4 had invalid evolved_species_id 9999
    assert orphan_counts.get("evolution: missing to_species_id", 0) >= 1

    # 6. ItemEffect with missing item_id 9999 was skipped
    effects = db_session.scalars(select(ItemEffect.item_id)).all()
    assert 1 in effects
    assert 9999 not in effects
    assert orphan_counts.get("item_effects: missing item_id in items", 0) >= 1


def test_english_names_selected(db_session: Session):
    """
    (c) English names (local_language_id == 9) are selected, ignoring foreign translations.
    """
    run_pipeline(
        session=db_session,
        stages=STAGE_DEPENDENCY_ORDER,
        csv_dir=FIXTURES_DIR,
        ref="test-ref",
        dry_run=False,
    )

    # Region name should be English "Kanto", not foreign
    region = db_session.scalar(select(Region).where(Region.id == 1))
    assert region is not None
    assert region.name == "Kanto"

    # Version names: English "Red" and "Blue" (not "Rouge" / "Bleu")
    v_red = db_session.scalar(select(Version).where(Version.id == 1))
    v_blue = db_session.scalar(select(Version).where(Version.id == 2))
    assert v_red is not None and v_red.name == "Red"
    assert v_blue is not None and v_blue.name == "Blue"

    # Location name: English "Canalave City" (not "Joliberges")
    loc1 = db_session.scalar(select(Location).where(Location.id == 1))
    assert loc1 is not None
    assert loc1.name == "Canalave City"

    # Generation name: English "Generation I" (not "Génération I")
    gen1 = db_session.scalar(select(Generation).where(Generation.id == 1))
    assert gen1 is not None
    assert gen1.name == "Generation I"


def test_from_species_id_derived_for_branching_chain(db_session: Session):
    """
    (d) from_species_id is derived correctly for a branching chain (Eevee -> Vaporeon, Jolteon, Flareon).
    """
    run_pipeline(
        session=db_session,
        stages=STAGE_DEPENDENCY_ORDER,
        csv_dir=FIXTURES_DIR,
        ref="test-ref",
        dry_run=False,
    )

    # Verify PokemonSpecies derives evolves_from_species_id correctly
    vaporeon_spec = db_session.scalar(select(PokemonSpecies).where(PokemonSpecies.id == 134))
    jolteon_spec = db_session.scalar(select(PokemonSpecies).where(PokemonSpecies.id == 135))
    flareon_spec = db_session.scalar(select(PokemonSpecies).where(PokemonSpecies.id == 136))

    assert vaporeon_spec is not None
    assert vaporeon_spec.evolves_from_species_id == 133
    assert vaporeon_spec.evolution_chain_id == 67

    assert jolteon_spec is not None
    assert jolteon_spec.evolves_from_species_id == 133
    assert jolteon_spec.evolution_chain_id == 67

    assert flareon_spec is not None
    assert flareon_spec.evolves_from_species_id == 133
    assert flareon_spec.evolution_chain_id == 67

    # Verify all 3 edges in the evolutions table point from_species_id == 133
    evos = db_session.scalars(select(Evolution).where(Evolution.chain_id == 67)).all()
    assert len(evos) == 3

    evo_by_to = {e.to_species_id: e for e in evos}

    assert 134 in evo_by_to
    assert evo_by_to[134].from_species_id == 133
    assert evo_by_to[134].trigger_item_id == 83  # Water Stone

    assert 135 in evo_by_to
    assert evo_by_to[135].from_species_id == 133
    assert evo_by_to[135].trigger_item_id == 84  # Thunder Stone

    assert 136 in evo_by_to
    assert evo_by_to[136].from_species_id == 133
    assert evo_by_to[136].trigger_item_id == 85  # Fire Stone


def test_missing_required_csv_column_raises_error(tmp_path):
    """
    (e) A missing required CSV column raises a clear error.
    """
    bad_csv = tmp_path / "bad_items.csv"
    # Header missing "category_id"
    bad_csv.write_text("id,identifier,cost\n1,master-ball,0\n", encoding="utf-8")

    with pytest.raises(ValueError) as excinfo:
        read_csv_rows(str(bad_csv), required_columns=["id", "identifier", "category_id"])

    assert "missing required column(s)" in str(excinfo.value)
    assert "category_id" in str(excinfo.value)


def test_404_is_not_retried(tmp_path, monkeypatch):
    """
    Verify that HTTP 404 is not retried and immediately raises FileNotFoundError
    with the exact URL and git ref.
    """
    call_count = 0

    def mock_get(self, url, **kwargs):
        nonlocal call_count
        call_count += 1
        req = httpx.Request("GET", url)
        return httpx.Response(404, request=req)

    monkeypatch.setattr(httpx.Client, "get", mock_get)

    target_file = str(tmp_path / "test.csv")
    with pytest.raises(FileNotFoundError) as exc_info:
        download_file("https://example.com/test.csv", target_file, max_retries=5, ref="my-ref")

    assert "HTTP 404" in str(exc_info.value)
    assert "https://example.com/test.csv" in str(exc_info.value)
    assert "my-ref" in str(exc_info.value)
    assert call_count == 1, f"Expected 404 not to be retried, but called {call_count} times"


def test_preflight_lists_missing_files(tmp_path):
    """
    Verify that preflight_check identifies and returns missing files.
    """
    empty_dir = str(tmp_path / "empty_csvs")
    os.makedirs(empty_dir, exist_ok=True)

    missing = preflight_check(["encounter_meta", "evolutions"], ref="test-ref", csv_dir=empty_dir)
    assert len(missing) > 0
    assert "encounter_methods.csv" in missing
    assert "encounter_method_prose.csv" in missing
    assert "evolution_triggers.csv" in missing
    assert "evolution_trigger_prose.csv" in missing

    # With full fixture directory, missing should be empty
    missing_none = preflight_check(["encounter_meta", "evolutions"], ref="test-ref", csv_dir=FIXTURES_DIR)
    assert len(missing_none) == 0


def test_missing_name_files_abort_stage_execution(db_session: Session, tmp_path):
    """
    Verify that missing name files (e.g. encounter_method_prose.csv) abort stage execution with FileNotFoundError.
    """
    custom_dir = tmp_path / "partial_csvs"
    custom_dir.mkdir()
    (custom_dir / "encounter_methods.csv").write_text("id,identifier,order\n1,walk,1\n", encoding="utf-8")
    # Notice: encounter_method_prose.csv is intentionally missing

    with pytest.raises(FileNotFoundError) as exc_info:
        populate_encounter_methods_and_conditions(
            session=db_session,
            csv_dir=str(custom_dir),
            ref="test-ref",
        )

    assert "encounter_method_prose.csv" in str(exc_info.value)


def test_item_effects_english_selection_and_idempotence(db_session: Session):
    """
    Verify:
    1. Only English prose (local_language_id == '9') is ingested into item_effects.
    2. Items with only non-English prose (e.g. Thunder Stone id=84) do not have an ItemEffect row.
    3. Running populate_item_effects repeatedly is idempotent.
    """
    run_pipeline(
        session=db_session,
        stages=STAGE_DEPENDENCY_ORDER,
        csv_dir=FIXTURES_DIR,
        ref="test-ref",
        dry_run=False,
    )

    # Item 1 (Master Ball): has French (5) and English (9)
    eff1 = db_session.scalar(select(ItemEffect).where(ItemEffect.item_id == 1))
    assert eff1 is not None
    assert eff1.short_effect == "Catches a wild Pokémon every time."
    assert "Catches a wild Pokémon without fail." in eff1.effect
    assert "sans échouer" not in eff1.effect

    # Item 2 (Ultra Ball): English only
    eff2 = db_session.scalar(select(ItemEffect).where(ItemEffect.item_id == 2))
    assert eff2 is not None
    assert eff2.short_effect == "Tries to catch a wild Pokémon. Success rate is 2x."

    # Item 84 (Thunder Stone): Japanese only in fixture -> no ItemEffect row
    eff84 = db_session.scalar(select(ItemEffect).where(ItemEffect.item_id == 84))
    assert eff84 is None

    # Item 85: Not in item_prose.csv -> no ItemEffect row
    eff85 = db_session.scalar(select(ItemEffect).where(ItemEffect.item_id == 85))
    assert eff85 is None

    # Idempotence: re-run pipeline stage
    from scripts.populate_extended import populate_item_effects
    orphans = {}
    counts = populate_item_effects(session=db_session, csv_dir=FIXTURES_DIR, ref="test-ref", dry_run=False, orphan_counts=orphans)
    assert counts.get("item_effects") == 3
    assert orphans.get("item_effects: missing item_id in items", 0) == 1

    # Verify rows still unchanged
    eff1_after = db_session.scalar(select(ItemEffect).where(ItemEffect.item_id == 1))
    assert eff1_after.short_effect == "Catches a wild Pokémon every time."

