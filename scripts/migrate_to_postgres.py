import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models import Base, Pokemon, TypeEfficacy
from backend.database import SQLALCHEMY_DATABASE_URL as SQLITE_URL

# This script assumes you have set the DATABASE_URL environment variable to your PostgreSQL connection string
POSTGRES_URL = os.getenv("DATABASE_URL")

if not POSTGRES_URL or POSTGRES_URL.startswith("sqlite"):
    print("Error: Please set DATABASE_URL environment variable to a PostgreSQL connection string.")
    exit(1)

# Fix for postgres:// vs postgresql://
if POSTGRES_URL.startswith("postgres://"):
    POSTGRES_URL = POSTGRES_URL.replace("postgres://", "postgresql://", 1)

print(f"Migrating from SQLite to {POSTGRES_URL.split('@')[-1]}...")

# Create engines
sqlite_engine = create_engine(SQLITE_URL)
postgres_engine = create_engine(POSTGRES_URL)

# Create tables in Postgres
Base.metadata.create_all(bind=postgres_engine)

# Create sessions
SqliteSession = sessionmaker(bind=sqlite_engine)
PostgresSession = sessionmaker(bind=postgres_engine)

sqlite_db = SqliteSession()
postgres_db = PostgresSession()

try:
    # Migrate TypeEfficacy
    print("Migrating TypeEfficacy...")
    efficacies = sqlite_db.query(TypeEfficacy).all()
    for eff in efficacies:
        # Check if already exists to avoid duplicates
        exists = postgres_db.query(TypeEfficacy).filter_by(
            damage_type=eff.damage_type, 
            target_type=eff.target_type
        ).first()
        if not exists:
            # Create a new instance to avoid session conflicts
            new_eff = TypeEfficacy(
                damage_type=eff.damage_type,
                target_type=eff.target_type,
                damage_factor=eff.damage_factor
            )
            postgres_db.add(new_eff)
    postgres_db.commit()
    print(f"Migrated {len(efficacies)} type efficacy records.")

    # Migrate Pokemon
    print("Migrating Pokemon...")
    pokemons = sqlite_db.query(Pokemon).all()
    for p in pokemons:
        exists = postgres_db.query(Pokemon).filter_by(id=p.id).first()
        if not exists:
            new_p = Pokemon(
                id=p.id,
                name=p.name,
                type1=p.type1,
                type2=p.type2,
                hp=p.hp,
                attack=p.attack,
                defense=p.defense,
                special_attack=p.special_attack,
                special_defense=p.special_defense,
                speed=p.speed,
                sprite_url=p.sprite_url,
                region=p.region,
                generation=p.generation
            )
            postgres_db.add(new_p)
    postgres_db.commit()
    print(f"Migrated {len(pokemons)} Pokémon records.")

    print("Migration successful!")

except Exception as e:
    print(f"An error occurred: {e}")
    postgres_db.rollback()
finally:
    sqlite_db.close()
    postgres_db.close()
