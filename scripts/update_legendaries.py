import requests
import sys
import os
import time

# Add parent directory to path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import SessionLocal, engine
from backend.models import Pokemon, Base

def update_legendaries():
    # Ensure columns exist (Base.metadata.create_all handles this if they are new)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        pokemon_list = db.query(Pokemon).all()
        total = len(pokemon_list)
        print(f"Updating {total} Pokémon...")

        for i, p in enumerate(pokemon_list):
            try:
                # Need to fetch species info for legendary status
                response = requests.get(f"https://pokeapi.co/api/v2/pokemon-species/{p.id}")
                if response.status_code == 200:
                    data = response.json()
                    p.is_legendary = data.get('is_legendary', False)
                    p.is_mythical = data.get('is_mythical', False)
                else:
                    print(f"Skipping ID {p.id}: Species info not found (HTTP {response.status_code})")
                
                if (i + 1) % 50 == 0:
                    db.commit()
                    print(f"Progress: {i + 1}/{total}...")
                
                # Tiny sleep to be polite to PokeAPI
                time.sleep(0.02)
                
            except Exception as e:
                print(f"Error updating ID {p.id}: {e}")
        
        db.commit()
        print("Update complete!")
    finally:
        db.close()

if __name__ == "__main__":
    update_legendaries()
