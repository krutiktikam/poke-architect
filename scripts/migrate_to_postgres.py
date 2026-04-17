import os
import sqlite3
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from backend.models import Base, Pokemon, TypeEfficacy

# Database URLs
SQLITE_DB = 'pokemon.db'
POSTGRES_URL = os.getenv("DATABASE_URL")

if not POSTGRES_URL:
    print("Error: DATABASE_URL environment variable is not set.")
    exit(1)

# Fix for postgres:// vs postgresql://
if POSTGRES_URL.startswith("postgres://"):
    POSTGRES_URL = POSTGRES_URL.replace("postgres://", "postgresql://", 1)

print(f"Connecting to Postgres: {POSTGRES_URL.split('@')[-1]}...")
pg_engine = create_engine(POSTGRES_URL)

# Ensure tables exist
print("Creating tables if they don't exist...")
Base.metadata.create_all(bind=pg_engine)

# Connect to SQLite using standard sqlite3 for robustness
print(f"Reading from SQLite: {SQLITE_DB}...")
sqlite_conn = sqlite3.connect(SQLITE_DB)
sqlite_conn.row_factory = sqlite3.Row
cursor = sqlite_conn.cursor()

# Get Type Efficacy
print("Migrating TypeEfficacy...")
efficacies = cursor.execute("SELECT * FROM type_efficacy").fetchall()
with pg_engine.begin() as pg_conn:
    # Clear existing to be safe
    pg_conn.execute(text("DELETE FROM type_efficacy"))
    for row in efficacies:
        pg_conn.execute(
            text("INSERT INTO type_efficacy (damage_type, target_type, damage_factor) VALUES (:d, :t, :f)"),
            {"d": row["damage_type"], "t": row["target_type"], "f": row["damage_factor"]}
        )
print(f"Migrated {len(efficacies)} type efficacy records.")

# Get Pokemon
print("Migrating Pokemon...")
pokemons = cursor.execute("SELECT * FROM pokemon").fetchall()
with pg_engine.begin() as pg_conn:
    # Clear existing to be safe
    pg_conn.execute(text("DELETE FROM pokemon"))
    for p in pokemons:
        pg_conn.execute(
            text("""
                INSERT INTO pokemon 
                (id, name, type1, type2, hp, attack, defense, special_attack, special_defense, speed, sprite_url, region, generation) 
                VALUES (:id, :n, :t1, :t2, :hp, :atk, :df, :sa, :sd, :sp, :img, :reg, :gen)
            """),
            {
                "id": p["id"], "n": p["name"], "t1": p["type1"], "t2": p["type2"],
                "hp": p["hp"], "atk": p["attack"], "df": p["defense"],
                "sa": p["special_attack"], "sd": p["special_defense"], "sp": p["speed"],
                "img": p["sprite_url"], "reg": p["region"], "gen": p["generation"]
            }
        )
print(f"Migrated {len(pokemons)} Pokémon records.")

sqlite_conn.close()
print("Migration SUCCESSFUL! Check your website now.")
