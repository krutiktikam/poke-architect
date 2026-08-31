import os
import logging
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Load environment variables (override stale OS environment variables with .env)
load_dotenv(override=True)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Default to SQLite for local development
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./pokemon.db")

# Prepare a safe version of the URL for logging (redact password)
safe_url = SQLALCHEMY_DATABASE_URL  # default, in case we can't parse
try:
    if "://" in SQLALCHEMY_DATABASE_URL:
        scheme, rest = SQLALCHEMY_DATABASE_URL.split("://", 1)
        if "@" in rest:
            credentials, hostpart = rest.split("@", 1)
            if ":" in credentials:
                username, _ = credentials.split(":", 1)
                safe_credentials = f"{username}:****"
                safe_url = f"{scheme}://{safe_credentials}@{hostpart}"
            else:
                safe_url = SQLALCHEMY_DATABASE_URL
        else:
            safe_url = SQLALCHEMY_DATABASE_URL
    else:
        safe_url = SQLALCHEMY_DATABASE_URL
except Exception:
    # If parsing fails, we just use a placeholder
    safe_url = "<REDACTED DUE TO PARSING ERROR>"

logger.info(f"Connecting to database type: {SQLALCHEMY_DATABASE_URL.split('://')[0]}")
logger.info(f"Database URL: {safe_url}")

# PostgreSQL URL from Render/Heroku/Supabase often starts with postgres://
# but SQLAlchemy needs postgresql://
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Render/Supabase usually require SSL for PostgreSQL
if SQLALCHEMY_DATABASE_URL.startswith("postgresql"):
    if "sslmode" not in SQLALCHEMY_DATABASE_URL:
        if "?" in SQLALCHEMY_DATABASE_URL:
            SQLALCHEMY_DATABASE_URL += "&sslmode=require"
        else:
            SQLALCHEMY_DATABASE_URL += "?sslmode=require"
    logger.info("SSL mode 'require' ensured for PostgreSQL connection.")

connect_args = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

try:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args=connect_args,
        pool_pre_ping=True,
        pool_recycle=3600
    )
    logger.info("Database engine created successfully.")
except Exception as e:
    logger.error(f"Failed to create database engine: {e}")
    logger.error(f"Database URL (redacted): {safe_url}")
    raise e

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
