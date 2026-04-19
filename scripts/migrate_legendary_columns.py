import os
from sqlalchemy import create_engine, text

# Use environment variable or default to the Supabase one provided
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres.iljyewcwtkmhjvjpnvut:Chunchunmaru02@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres")

engine = create_engine(SQLALCHEMY_DATABASE_URL)

def migrate():
    print(f"Migrating database: {SQLALCHEMY_DATABASE_URL.split('@')[-1]}") # Log host safely
    with engine.connect() as conn:
        print("Adding columns is_legendary and is_mythical...")
        try:
            conn.execute(text("ALTER TABLE pokemon ADD COLUMN is_legendary BOOLEAN DEFAULT FALSE"))
            conn.execute(text("ALTER TABLE pokemon ADD COLUMN is_mythical BOOLEAN DEFAULT FALSE"))
            conn.commit()
            print("Migration successful.")
        except Exception as e:
            print(f"Migration error (might already exist): {e}")

if __name__ == "__main__":
    migrate()
