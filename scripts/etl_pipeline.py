import sqlite3
import requests
import time

DB_NAME = "pokemon.db"

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

def setup_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS pokemon (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            type1 TEXT NOT NULL,
            type2 TEXT,
            hp INTEGER,
            attack INTEGER,
            defense INTEGER,
            special_attack INTEGER,
            special_defense INTEGER,
            speed INTEGER,
            sprite_url TEXT,
            region TEXT,
            generation INTEGER
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS type_efficacy (
            damage_type TEXT,
            target_type TEXT,
            damage_factor REAL,
            PRIMARY KEY (damage_type, target_type)
        )
    ''')
    conn.commit()
    return conn

def fetch_pokemon_data(limit=151):
    print(f"Fetching first {limit} Pokémon...")
    pokemon_list = []
    for i in range(1, limit + 1):
        try:
            response = requests.get(f"https://pokeapi.co/api/v2/pokemon/{i}")
            response.raise_for_status()
            data = response.json()
            
            stats = {stat['stat']['name']: stat['base_stat'] for stat in data['stats']}
            types = [t['type']['name'] for t in data['types']]
            
            gen, region = get_generation_and_region(data['id'])
            pokemon_list.append({
                'id': data['id'],
                'name': data['name'].capitalize(),
                'type1': types[0],
                'type2': types[1] if len(types) > 1 else None,
                'hp': stats.get('hp'),
                'attack': stats.get('attack'),
                'defense': stats.get('defense'),
                'special_attack': stats.get('special-attack'),
                'special_defense': stats.get('special-defense'),
                'speed': stats.get('speed'),
                'sprite_url': data['sprites']['other']['official-artwork']['front_default'] or data['sprites']['front_default'],
                'region': region,
                'generation': gen
            })
            if i % 10 == 0:
                print(f"Loaded {i}/{limit}...")
            # Respect rate limits even if PokéAPI is generous
            # time.sleep(0.05) 
        except Exception as e:
            print(f"Error fetching Pokémon {i}: {e}")
    return pokemon_list

def fetch_type_efficacy():
    print("Fetching type effectiveness data...")
    types_response = requests.get("https://pokeapi.co/api/v2/type")
    types_data = types_response.json()['results']
    
    efficacy_records = []
    for type_info in types_data:
        type_name = type_info['name']
        if type_name in ['unknown', 'shadow']:
            continue
            
        details = requests.get(type_info['url']).json()
        damage_relations = details['damage_relations']
        
        # Mapping: relation_name -> damage_factor
        mapping = {
            'double_damage_to': 2.0,
            'half_damage_to': 0.5,
            'no_damage_to': 0.0
        }
        
        for relation, factor in mapping.items():
            for target in damage_relations[relation]:
                efficacy_records.append((type_name, target['name'], factor))
                
    return efficacy_records

def load_data(conn, pokemon_list, efficacy_records):
    cursor = conn.cursor()
    
    print("Saving Pokémon data to database...")
    cursor.executemany('''
        INSERT OR REPLACE INTO pokemon (id, name, type1, type2, hp, attack, defense, special_attack, special_defense, speed, sprite_url, region, generation)
        VALUES (:id, :name, :type1, :type2, :hp, :attack, :defense, :special_attack, :special_defense, :speed, :sprite_url, :region, :generation)
    ''', pokemon_list)
    
    print("Saving type efficacy data to database...")
    cursor.executemany('''
        INSERT OR REPLACE INTO type_efficacy (damage_type, target_type, damage_factor)
        VALUES (?, ?, ?)
    ''', efficacy_records)
    
    conn.commit()
    print("ETL Process Complete!")

if __name__ == "__main__":
    connection = setup_db()
    
    # Increase limit to fetch all generations (up to Gen 9)
    # Total Pokémon count as of Gen 9 is 1025.
    pkmn_data = fetch_pokemon_data(limit=1025) 
    type_data = fetch_type_efficacy()
    
    load_data(connection, pkmn_data, type_data)
    connection.close()
