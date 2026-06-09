import pandas as pd
import random
import os
import sys
import numpy as np

# Add parent directory to path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.database import SessionLocal
from backend.models import Pokemon, TypeEfficacy

def get_tier_weight(tier):
    weights = {
        "Uber": 5,
        "OU": 4,
        "UU": 3,
        "RU": 2,
        "NU": 1,
        "PU": 0.5,
        "N/A": 0
    }
    return weights.get(tier, 0)

def simulate_match(team_a, team_b, efficacy_map):
    # Features
    bst_a = sum((p.hp or 0) + (p.attack or 0) + (p.defense or 0) + (p.special_attack or 0) + (p.special_defense or 0) + (p.speed or 0) for p in team_a)
    bst_b = sum((p.hp or 0) + (p.attack or 0) + (p.defense or 0) + (p.special_attack or 0) + (p.special_defense or 0) + (p.speed or 0) for p in team_b)
    
    spe_a = sum(p.speed or 0 for p in team_a) / len(team_a)
    spe_b = sum(p.speed or 0 for p in team_b) / len(team_b)
    
    meta_a = sum(get_tier_weight(p.tier) for p in team_a)
    meta_b = sum(get_tier_weight(p.tier) for p in team_b)
    
    # Type advantage calculation (similar to heuristic but we'll use it as a feature)
    type_score_a = 0
    type_score_b = 0
    
    for pa in team_a:
        for pb in team_b:
            types_a = [pa.type1] + ([pa.type2] if pa.type2 else [])
            types_b = [pb.type1] + ([pb.type2] if pb.type2 else [])
            
            damage_a_to_b = 1.0
            for ta in types_a:
                for tb in types_b:
                    damage_a_to_b = max(damage_a_to_b, efficacy_map.get(ta, {}).get(tb, 1.0))
            
            damage_b_to_a = 1.0
            for tb in types_b:
                for ta in types_a:
                    damage_b_to_a = max(damage_b_to_a, efficacy_map.get(tb, {}).get(ta, 1.0))
            
            if damage_a_to_b > damage_b_to_a: type_score_a += 1
            elif damage_b_to_a > damage_a_to_b: type_score_b += 1

    # Logic for "True" winner (Label)
    # We'll use a weighted combination with some randomness
    power_a = (bst_a / 3000) * 0.4 + (spe_a / 100) * 0.1 + (type_score_a / 36) * 0.3 + (meta_a / 30) * 0.2
    power_b = (bst_b / 3000) * 0.4 + (spe_b / 100) * 0.1 + (type_score_b / 36) * 0.3 + (meta_b / 30) * 0.2
    
    # Sigmoid to get probability
    prob_a = 1 / (1 + np.exp(-(power_a - power_b) * 10))
    
    # Randomly decide winner based on prob
    winner = 1 if random.random() < prob_a else 0
    
    return {
        "bst_ratio": bst_a / bst_b if bst_b > 0 else 1,
        "speed_diff": spe_a - spe_b,
        "type_advantage_diff": type_score_a - type_score_b,
        "meta_score_diff": meta_a - meta_b,
        "winner": winner
    }

def generate_data(num_matches=20000):
    print(f"🚀 AI: Generating {num_matches} simulated match records...")
    
    db = SessionLocal()
    try:
        pokemon = db.query(Pokemon).all()
        efficacies = db.query(TypeEfficacy).all()
        
        eff_map = {}
        for e in efficacies:
            if e.damage_type not in eff_map: eff_map[e.damage_type] = {}
            eff_map[e.damage_type][e.target_type] = e.damage_factor
            
        data = []
        for i in range(num_matches):
            team_a = random.sample(pokemon, 6)
            team_b = random.sample(pokemon, 6)
            
            match_result = simulate_match(team_a, team_b, eff_map)
            data.append(match_result)
            
            if (i+1) % 5000 == 0:
                print(f"AI: Simulated {i+1} matches...")
                
        df = pd.DataFrame(data)
        df.to_csv("match_data.csv", index=False)
        print("✅ AI: Dataset saved to match_data.csv")
        
    finally:
        db.close()

if __name__ == "__main__":
    generate_data()
