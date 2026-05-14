import os
import sys
from sqlalchemy import create_engine, text

# Add parent directory to path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def migrate():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL environment variable not set.")
        return

    # Handle postgres:// vs postgresql://
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)

    # Ensure SSL for production DBs
    if "sslmode" not in database_url and "localhost" not in database_url:
        if "?" in database_url:
            database_url += "&sslmode=require"
        else:
            database_url += "?sslmode=require"

    print(f"Connecting to database to add 'role' column...")
    engine = create_engine(database_url)
    
    with engine.connect() as conn:
        try:
            # Check if role column already exists
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='pokemon' AND column_name='role';
            """))
            
            if result.fetchone():
                print("Column 'role' already exists. No migration needed.")
            else:
                print("Adding 'role' column to 'pokemon' table...")
                conn.execute(text("ALTER TABLE pokemon ADD COLUMN role VARCHAR;"))
                conn.commit()
                print("Successfully added 'role' column.")
        except Exception as e:
            print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
