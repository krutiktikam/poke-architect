from typing import List, Dict
from .models import Pokemon, TypeEfficacy

ALL_TYPES = [
    "normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", 
    "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"
]

def calculate_team_stats(pokemon_list: List[Pokemon]) -> Dict[str, int]:
    totals = {
        "hp": 0, "attack": 0, "defense": 0, 
        "special_attack": 0, "special_defense": 0, "speed": 0
    }
    for p in pokemon_list:
        totals["hp"] += p.hp or 0
        totals["attack"] += p.attack or 0
        totals["defense"] += p.defense or 0
        totals["special_attack"] += p.special_attack or 0
        totals["special_defense"] += p.special_defense or 0
        totals["speed"] += p.speed or 0
    return totals

def calculate_type_coverage(pokemon_list: List[Pokemon], efficacy_map: Dict[str, Dict[str, float]]) -> Dict[str, float]:
    # damage_type -> cumulative_multiplier
    # If multiple pokemon are weak to Fire, the multiplier increases.
    # If one is weak and one is resistant, they balance out? 
    # Actually, a better metric is "how many pokemon are weak to this type"
    coverage = {t: 0.0 for t in ALL_TYPES}
    
    for p in pokemon_list:
        p_types = [p.type1]
        if p.type2:
            p_types.append(p.type2)
            
        for atk_type in ALL_TYPES:
            multiplier = 1.0
            for def_type in p_types:
                # How much damage atk_type does to def_type
                factor = efficacy_map.get(atk_type, {}).get(def_type, 1.0)
                multiplier *= factor
            
            # log or track the multiplier for this pokemon
            if multiplier > 1.0:
                coverage[atk_type] += 1.0 # Team has a weakness
            elif multiplier < 1.0:
                coverage[atk_type] -= 1.0 # Team has a resistance
                
    return coverage

def suggest_pokemon(current_team: List[Pokemon], all_pokemon: List[Pokemon], efficacy_map: Dict[str, Dict[str, float]]) -> List[Pokemon]:
    if len(current_team) >= 6 or not current_team:
        return []
        
    coverage = calculate_type_coverage(current_team, efficacy_map)
    # Find the types we are most weak to (highest score)
    weakest_to = sorted(coverage.items(), key=lambda x: x[1], reverse=True)[0][0]
    
    # Suggest pokemon that are resistant or immune to that type
    suggestions = []
    for p in all_pokemon:
        if p.id in [tp.id for tp in current_team]:
            continue
            
        p_types = [p.type1]
        if p.type2:
            p_types.append(p.type2)
            
        multiplier = 1.0
        for def_type in p_types:
            multiplier *= efficacy_map.get(weakest_to, {}).get(def_type, 1.0)
            
        if multiplier < 1.0:
            suggestions.append(p)
            if len(suggestions) >= 5:
                break
                
    return suggestions
