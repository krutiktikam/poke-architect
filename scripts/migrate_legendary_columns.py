import sqlite3
import os

DB_NAME = "pokemon.db"

def migrate():
    if not os.path.exists(DB_NAME):
        print("Database not found.")
        return

    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    print("Adding columns is_legendary and is_mythical to pokemon table...")
    try:
        cursor.execute("ALTER TABLE pokemon ADD COLUMN is_legendary BOOLEAN DEFAULT 0")
        cursor.execute("ALTER TABLE pokemon ADD COLUMN is_mythical BOOLEAN DEFAULT 0")
        conn.commit()
        print("Migration successful.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("Columns already exist.")
        else:
            print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
