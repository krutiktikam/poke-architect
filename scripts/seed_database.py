import requests
import sys
import os
import time
from dotenv import load_dotenv

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Add parent directory to path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(override=True)

import json
from backend.database import SessionLocal, engine, Base
from backend.models import Pokemon, TypeEfficacy, User, SavedTeam

def seed_sample_teams(db):
    if db.query(SavedTeam).count() == 0:
        demo_user = db.query(User).filter(User.email == "architect@poke.ai").first()
        if not demo_user:
            demo_user = User(
                email="architect@poke.ai",
                name="Red (Champion)",
                google_id="demo-user-red",
                avatar_url="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png"
            )
            db.add(demo_user)
            db.commit()
            db.refresh(demo_user)
            
        sample_teams = [
            {"name": "Gen 9 Meta Balance", "pokemon_ids": [984, 1000, 987, 887, 1002, 1003]},
            {"name": "Kanto Elite Roster", "pokemon_ids": [3, 6, 9, 25, 130, 149]},
            {"name": "Hyper Offense Sweep", "pokemon_ids": [445, 212, 130, 887, 637, 984]},
            {"name": "Bulky Stall Synergy", "pokemon_ids": [748, 980, 242, 227, 472, 130]}
        ]
        
        for st in sample_teams:
            team = SavedTeam(
                user_id=demo_user.id,
                name=st["name"],
                team_data=json.dumps(st["pokemon_ids"]),
                is_public=True
            )
            db.add(team)
        db.commit()
        print("Sample community teams seeded successfully.")

def get_generation_and_region(pokemon_id):
    if 1 <= pokemon_id <= 151:
        return 1, "Kanto"
    elif 152 <= pokemon_id <= 251:
        return 2, "Johto"
    elif 252 <= pokemon_id <= 386:
        return 3, "Hoenn"
    elif 387 <= pokemon_id <= 493:
        return 4, "Sinnoh"
    elif 494 <= pokemon_id <= 649:
        return 5, "Unova"
    elif 650 <= pokemon_id <= 721:
        return 6, "Kalos"
    elif 722 <= pokemon_id <= 809:
        return 7, "Alola"
    elif 810 <= pokemon_id <= 905:
        return 8, "Galar"
    elif 906 <= pokemon_id <= 1025:
        return 9, "Paldea"
    return 0, "Unknown"

def seed_data(limit=1025):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        print(f"Fetching {limit} Pokémon...")
        for i in range(1, limit + 1):
            try:
                # Check if already exists to save time/requests on retries
                existing = db.query(Pokemon).filter(Pokemon.id == i).first()
                if existing and existing.sprite_url:
                    if i % 50 == 0:
                        print(f"Skipping ID {i} (already exists)...")
                    continue

                # 1. Fetch Pokemon Base Data
                p_res = requests.get(f"https://pokeapi.co/api/v2/pokemon/{i}", timeout=10)
                p_res.raise_for_status()
                p_data = p_res.json()
                
                # 2. Fetch Species Data for Legendary/Mythical status
                s_res = requests.get(f"https://pokeapi.co/api/v2/pokemon-species/{i}", timeout=10)
                s_res.raise_for_status()
                s_data = s_res.json()
                
                stats = {stat['stat']['name']: stat['base_stat'] for stat in p_data['stats']}
                types = [t['type']['name'] for t in p_data['types']]
                gen, region = get_generation_and_region(i)
                
                pokemon = Pokemon(
                    id=p_data['id'],
                    name=p_data['name'].capitalize(),
                    type1=types[0],
                    type2=types[1] if len(types) > 1 else None,
                    hp=stats.get('hp'),
                    attack=stats.get('attack'),
                    defense=stats.get('defense'),
                    special_attack=stats.get('special-attack'),
                    special_defense=stats.get('special-defense'),
                    speed=stats.get('speed'),
                    sprite_url=p_data['sprites']['other']['official-artwork']['front_default'] or p_data['sprites']['front_default'],
                    region=region,
                    generation=gen,
                    is_legendary=s_data.get('is_legendary', False),
                    is_mythical=s_data.get('is_mythical', False)
                )
                
                db.merge(pokemon)
                db.commit()
                
                if i % 10 == 0:
                    print(f"Progress: {i}/{limit}...")
                
                if i % 50 == 0:
                    print("Taking a breather for 10 seconds...")
                    time.sleep(10)
                
                time.sleep(0.05) 
            except Exception as e:
                db.rollback() # CRITICAL: Reset the transaction on error
                print(f"Error fetching ID {i}: {e}")
                time.sleep(1) # Wait a bit before next attempt

        print("Pokémon data seeded.")

        print("Fetching type effectiveness data...")
        types_response = requests.get("https://pokeapi.co/api/v2/type")
        types_data = types_response.json()['results']
        
        for type_info in types_data:
            type_name = type_info['name']
            if type_name in ['unknown', 'shadow']:
                continue
                
            try:
                details = requests.get(type_info['url']).json()
                damage_relations = details['damage_relations']
                
                mapping = {
                    'double_damage_to': 2.0,
                    'half_damage_to': 0.5,
                    'no_damage_to': 0.0
                }
                
                for relation, factor in mapping.items():
                    for target in damage_relations[relation]:
                        efficacy = TypeEfficacy(
                            damage_type=type_name,
                            target_type=target['name'],
                            damage_factor=factor
                        )
                        db.merge(efficacy)
                db.commit()
            except Exception as e:
                db.rollback()
                print(f"Error with type {type_name}: {e}")
        
        print("Type efficacy data seeded.")
        
        # Seed initial public community teams
        seed_sample_teams(db)
        
        print("Database Seeding Complete!")

    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
