import requests
import sys
import os
import time

# Add parent directory to path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import SessionLocal, engine, Base
from backend.models import Pokemon, TypeEfficacy

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
                # 1. Fetch Pokemon Base Data
                p_res = requests.get(f"https://pokeapi.co/api/v2/pokemon/{i}")
                p_res.raise_for_status()
                p_data = p_res.json()
                
                # 2. Fetch Species Data for Legendary/Mythical status
                s_res = requests.get(f"https://pokeapi.co/api/v2/pokemon-species/{i}")
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
                
                if i % 50 == 0:
                    db.commit()
                    print(f"Progress: {i}/{limit}...")
                
                time.sleep(0.01) # Polite sleep
            except Exception as e:
                print(f"Error fetching ID {i}: {e}")

        db.commit()
        print("Pokémon data seeded.")

        print("Fetching type effectiveness data...")
        types_response = requests.get("https://pokeapi.co/api/v2/type")
        types_data = types_response.json()['results']
        
        for type_info in types_data:
            type_name = type_info['name']
            if type_name in ['unknown', 'shadow']:
                continue
                
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
        print("Type efficacy data seeded.")
        print("Database Seeding Complete!")

    finally:
        db.close()

if __name__ == "__main__":
    # You can pass a smaller limit for testing, e.g., seed_data(151)
    seed_data()
