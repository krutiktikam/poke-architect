import requests
import os
import sys
from sqlalchemy import text

# Add parent directory to path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.database import SessionLocal
from backend.models import Pokemon

TIERS = {
    "gen9ubers": "Uber",
    "gen9ou": "OU",
    "gen9uu": "UU",
    "gen9ru": "RU",
    "gen9nu": "NU",
    "gen9pu": "PU"
}

def update_meta_data():
    print("🚀 AI: Updating Pokémon Meta-Relevance (Tiers & Usage)...")
    
    db = SessionLocal()
    try:
        # 1. Reset current meta data
        db.execute(text("UPDATE pokemon SET tier = 'N/A', usage_rate = 0.0"))
        db.commit()
        
        for format_id, tier_name in TIERS.items():
            print(f"AI: Fetching usage data for {format_id}...")
            try:
                # Use the unofficial but optimized API
                url = f"https://data.pkmn.cc/stats/{format_id}.json"
                response = requests.get(url, timeout=10)
                if response.status_code != 200:
                    print(f"WARN: Could not fetch {format_id}. Skipping...")
                    continue
                
                data = response.json()
                # data.pkmn.cc format: {"pokemon": {"Name": {"usage": 0.123, ...}, ...}}
                # Some files might have different top-level keys depending on the tool that generated them
                # Usually it's 'pokemon'
                pokemon_usage = data.get('pokemon', {})
                
                for name, stats in pokemon_usage.items():
                    usage = stats.get('usage', 0.0) * 100 # Convert to percentage
                    
                    # Try to find the pokemon by name (case-insensitive)
                    # Note: Smogon names might have suffixes like '-Mega' or '-Gmax'
                    # We'll try to match the base name
                    base_name = name.split('-')[0]
                    
                    # Update if it's the first time we see this pokemon or if it's in a higher tier
                    # (Tiers are processed in order of priority)
                    p = db.query(Pokemon).filter(Pokemon.name.ilike(base_name)).first()
                    if p and (p.tier == 'N/A' or usage > p.usage_rate):
                        p.tier = tier_name
                        p.usage_rate = round(usage, 2)
                
                db.commit()
                print(f"✅ AI: Tier {tier_name} synchronized.")
                
            except Exception as e:
                print(f"ERROR: Failed to update format {format_id}: {e}")

        print("🏆 AI: Meta-Intelligence update complete!")

    finally:
        db.close()

if __name__ == "__main__":
    update_meta_data()
