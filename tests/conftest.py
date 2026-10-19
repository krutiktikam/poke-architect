import os
import sys
import tempfile
from pathlib import Path
import pytest
import dotenv

# Ensure project root is in sys.path
_project_root = str(Path(__file__).resolve().parent.parent)
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

# 1. Set DATABASE_URL to a temp SQLite URL BEFORE importing backend.main or backend.database
_temp_db_file = tempfile.NamedTemporaryFile(suffix="_poke_test.db", delete=False)
_temp_db_file.close()
_temp_db_path = _temp_db_file.name.replace("\\", "/")
_sqlite_url = f"sqlite:///{_temp_db_path}"

os.environ["DATABASE_URL"] = _sqlite_url

# Wrap dotenv.load_dotenv to ensure DATABASE_URL is not overwritten by .env during app startup
_orig_load_dotenv = dotenv.load_dotenv


def _safe_load_dotenv(*args, **kwargs):
    res = _orig_load_dotenv(*args, **kwargs)
    os.environ["DATABASE_URL"] = _sqlite_url
    return res


dotenv.load_dotenv = _safe_load_dotenv

# Import database, models, and FastAPI app
from backend.database import Base, engine, SessionLocal, get_db  # noqa: E402
from backend.models import Pokemon, Move, TypeEfficacy, Nature, Item, ItemPocket, ItemCategory  # noqa: E402
from backend.main import app  # noqa: E402

# 2. Guard: Fail the run if the engine URL is not SQLite
if not str(engine.url).startswith("sqlite"):
    raise RuntimeError(
        f"FATAL GUARD TRIGGERED: Database engine URL is not SQLite! Actual engine.url: {engine.url}"
    )


@pytest.fixture(scope="session", autouse=True)
def setup_sqlite_database():
    """
    Ensure all tables exist in the temp SQLite database and seed minimal records.
    """
    Base.metadata.create_all(bind=engine)

    session = SessionLocal()
    try:
        # Seed test Pokemon if not already present
        if not session.query(Pokemon).filter(Pokemon.id == 25).first():
            pikachu = Pokemon(
                id=25,
                name="Pikachu",
                type1="Electric",
                type2=None,
                hp=35,
                attack=55,
                defense=40,
                special_attack=50,
                special_defense=50,
                speed=90,
                sprite_url="http://sprite/25.png",
                region="kanto",
                generation=1,
            )
            charizard = Pokemon(
                id=6,
                name="Charizard",
                type1="Fire",
                type2="Flying",
                hp=78,
                attack=84,
                defense=78,
                special_attack=109,
                special_defense=85,
                speed=100,
                sprite_url="http://sprite/6.png",
                region="kanto",
                generation=1,
            )
            session.add_all([pikachu, charizard])

        # Seed test Moves if not already present
        if not session.query(Move).filter(Move.id == 85).first():
            tb = Move(
                id=85,
                name="Thunderbolt",
                type="Electric",
                power=90,
                accuracy=100,
                pp=15,
                priority=0,
                damage_class="special",
            )
            ft = Move(
                id=53,
                name="Flamethrower",
                type="Fire",
                power=90,
                accuracy=100,
                pp=15,
                priority=0,
                damage_class="special",
            )
            surf = Move(
                id=57,
                name="Surf",
                type="Water",
                power=90,
                accuracy=100,
                pp=15,
                priority=0,
                damage_class="special",
            )
            session.add_all([tb, ft, surf])

        # Seed test Natures if not already present
        if not session.query(Nature).filter(Nature.id == 1).first():
            hardy = Nature(id=1, name="hardy", decreased_stat=None, increased_stat=None)
            adamant = Nature(id=3, name="adamant", decreased_stat="special-attack", increased_stat="attack")
            modest = Nature(id=16, name="modest", decreased_stat="attack", increased_stat="special-attack")
            session.add_all([hardy, adamant, modest])

        # Seed test Items & Pockets if not already present
        if not session.query(Item).filter(Item.id == 1).first():
            pocket = ItemPocket(id=1, name="Items")
            session.add(pocket)
            session.flush()

            cat1 = ItemCategory(id=1, name="Held Items", pocket_id=1)
            cat2 = ItemCategory(id=2, name="Standard Balls", pocket_id=1)
            session.add_all([cat1, cat2])
            session.flush()

            mb = Item(id=1, name="Master Ball", category_id=2, is_holdable=False)
            left = Item(id=211, name="Leftovers", category_id=1, is_holdable=True)
            lo = Item(id=247, name="Life Orb", category_id=1, is_holdable=True)
            pot = Item(id=17, name="Potion", category_id=1, is_holdable=False)
            session.add_all([mb, left, lo, pot])

        # Seed basic TypeEfficacy if empty
        if session.query(TypeEfficacy).count() == 0:
            efficacies = [
                TypeEfficacy(damage_type="electric", target_type="water", damage_factor=2.0),
                TypeEfficacy(damage_type="fire", target_type="grass", damage_factor=2.0),
                TypeEfficacy(damage_type="water", target_type="fire", damage_factor=2.0),
                TypeEfficacy(damage_type="electric", target_type="ground", damage_factor=0.0),
            ]
            session.add_all(efficacies)

        session.commit()
    finally:
        session.close()

    yield

    try:
        os.remove(_temp_db_file.name)
    except OSError:
        pass


@pytest.fixture
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db_session):
    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    from fastapi.testclient import TestClient

    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
