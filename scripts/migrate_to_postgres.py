import os
import sys
import sqlite3
from dotenv import load_dotenv

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Add parent directory to path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(override=True)

from sqlalchemy import create_engine, text
from backend.models import Base, Pokemon, TypeEfficacy, User, SavedTeam

# Database URLs
SQLITE_DB = 'pokemon.db'
POSTGRES_URL = os.getenv("DATABASE_URL")

if not POSTGRES_URL:
    print("Error: DATABASE_URL environment variable is not set.")
    sys.exit(1)

# Fix for postgres:// vs postgresql://
if POSTGRES_URL.startswith("postgres://"):
    POSTGRES_URL = POSTGRES_URL.replace("postgres://", "postgresql://", 1)

if "sslmode" not in POSTGRES_URL:
    POSTGRES_URL += "?sslmode=require" if "?" not in POSTGRES_URL else "&sslmode=require"

print(f"Connecting to Postgres: {POSTGRES_URL.split('@')[-1]}...")
pg_engine = create_engine(POSTGRES_URL)

# Ensure tables exist
print("Creating tables in PostgreSQL if they don't exist...")
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
    pg_conn.execute(text("DELETE FROM pokemon"))
    for p in pokemons:
        pg_conn.execute(
            text("""
                INSERT INTO pokemon 
                (id, name, type1, type2, hp, attack, defense, special_attack, special_defense, speed, sprite_url, region, generation, is_legendary, is_mythical, role, tier, usage_rate) 
                VALUES (:id, :n, :t1, :t2, :hp, :atk, :df, :sa, :sd, :sp, :img, :reg, :gen, :leg, :myt, :role, :tier, :usage)
            """),
            {
                "id": p["id"], "n": p["name"], "t1": p["type1"], "t2": p["type2"],
                "hp": p["hp"], "atk": p["attack"], "df": p["defense"],
                "sa": p["special_attack"], "sd": p["special_defense"], "sp": p["speed"],
                "img": p["sprite_url"], "reg": p["region"], "gen": p["generation"],
                "leg": bool(p["is_legendary"]) if "is_legendary" in p.keys() else False,
                "myt": bool(p["is_mythical"]) if "is_mythical" in p.keys() else False,
                "role": p["role"] if "role" in p.keys() else "Balanced",
                "tier": p["tier"] if "tier" in p.keys() else "N/A",
                "usage": p["usage_rate"] if "usage_rate" in p.keys() else 0.0
            }
        )
print(f"Migrated {len(pokemons)} Pokémon records.")

# Migrate Users and SavedTeams if available
try:
    users = cursor.execute("SELECT * FROM users").fetchall()
    if users:
        with pg_engine.begin() as pg_conn:
            for u in users:
                pg_conn.execute(
                    text("INSERT INTO users (id, email, name, google_id, avatar_url, created_at) VALUES (:id, :email, :name, :gid, :avatar, :created) ON CONFLICT (id) DO NOTHING"),
                    {"id": u["id"], "email": u["email"], "name": u["name"], "gid": u["google_id"], "avatar": u["avatar_url"], "created": u["created_at"]}
                )
        print(f"Migrated {len(users)} users.")
        
    teams = cursor.execute("SELECT * FROM saved_teams").fetchall()
    if teams:
        with pg_engine.begin() as pg_conn:
            for t in teams:
                pg_conn.execute(
                    text("INSERT INTO saved_teams (id, user_id, name, team_data, is_public, created_at) VALUES (:id, :uid, :name, :tdata, :pub, :created) ON CONFLICT (id) DO NOTHING"),
                    {"id": t["id"], "uid": t["user_id"], "name": t["name"], "tdata": t["team_data"], "pub": bool(t["is_public"]), "created": t["created_at"]}
                )
        print(f"Migrated {len(teams)} saved teams.")
except Exception as e:
    print(f"User/Team migration note: {e}")

sqlite_conn.close()
print("Migration to PostgreSQL SUCCESSFUL!")
