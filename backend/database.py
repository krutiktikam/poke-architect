import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Default to SQLite for local development, use PostgreSQL URL for production (Supabase/Render)
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./pokemon.db")

# PostgreSQL URL from Render/Heroku/Supabase often starts with postgres://
# but SQLAlchemy needs postgresql://
if "postgresql" in SQLALCHEMY_DATABASE_URL or "postgres" in SQLALCHEMY_DATABASE_URL:
    if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
        SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    # Render/Supabase usually require SSL
    if "sslmode" not in SQLALCHEMY_DATABASE_URL:
        if "?" in SQLALCHEMY_DATABASE_URL:
            SQLALCHEMY_DATABASE_URL += "&sslmode=require"
        else:
            SQLALCHEMY_DATABASE_URL += "?sslmode=require"

connect_args = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args=connect_args,
    pool_pre_ping=True, # Verifies connection is alive before using it
    pool_recycle=3600    # Re-connect every hour to avoid stale connections
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
