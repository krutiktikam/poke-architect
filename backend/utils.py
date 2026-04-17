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
    # Types the team is weakest to (score > 0)
    weak_types = [t for t, score in coverage.items() if score > 0]
    
    scored_suggestions = []
    
    for p in all_pokemon:
        if p.id in [tp.id for tp in current_team]:
            continue
            
        # 1. Defensive Score: How many team weaknesses does this Pokémon resist?
        defensive_score = 0
        p_types = [p.type1]
        if p.type2:
            p_types.append(p.type2)
            
        for wt in weak_types:
            multiplier = 1.0
            for pt in p_types:
                multiplier *= efficacy_map.get(wt, {}).get(pt, 1.0)
            
            if multiplier < 1.0:
                defensive_score += (1.0 - multiplier) * 10 # Resistance is good
            if multiplier == 0:
                defensive_score += 15 # Immunity is great
        
        # 2. Stat Quality Score (BST normalized)
        bst = (p.hp or 0) + (p.attack or 0) + (p.defense or 0) + \
              (p.special_attack or 0) + (p.special_defense or 0) + (p.speed or 0)
        stat_score = bst / 100
        
        # Total Heuristic
        total_score = (defensive_score * 2.0) + stat_score
        
        scored_suggestions.append((p, total_score))
                
    # Sort by score descending
    scored_suggestions.sort(key=lambda x: x[1], reverse=True)
    return [s[0] for s in scored_suggestions[:5]]

def detect_team_archetype(pokemon_list: List[Pokemon]) -> str:
    if not pokemon_list:
        return "Unknown"
        
    avg_speed = sum(p.speed or 0 for p in pokemon_list) / len(pokemon_list)
    avg_offense = sum((p.attack or 0) + (p.special_attack or 0) for p in pokemon_list) / (len(pokemon_list) * 2)
    avg_bulk = sum((p.hp or 0) + (p.defense or 0) + (p.special_defense or 0) for p in pokemon_list) / (len(pokemon_list) * 3)
    
    if avg_speed > 95 and avg_offense > 100:
        return "Hyper Offense"
    elif avg_bulk > 90 and avg_speed < 70:
        return "Bulky Stall"
    elif avg_offense > 110 and avg_bulk < 70:
        return "Glass Cannon"
    elif avg_speed > 80 and avg_offense > 85 and avg_bulk > 80:
        return "Balanced"
    
    return "Mixed"

def calculate_health_score(pokemon_list: List[Pokemon], coverage: Dict[str, float]) -> str:
    if not pokemon_list:
        return "F"
    
    # 1. Coverage Score (Lower is better, means fewer weaknesses)
    weakness_count = sum(1 for score in coverage.values() if score > 0)
    major_weakness_count = sum(1 for score in coverage.values() if score >= 2.0)
    
    # 2. Stat Score (BST)
    avg_bst = sum((p.hp or 0) + (p.attack or 0) + (p.defense or 0) + 
                  (p.special_attack or 0) + (p.special_defense or 0) + (p.speed or 0) 
                  for p in pokemon_list) / len(pokemon_list)
    
    # 3. Synergy Score (Archetype diversity)
    # For now, let's just use a simple formula
    score = 100
    score -= weakness_count * 5
    score -= major_weakness_count * 15
    
    if avg_bst > 540:
        score += 20
    elif avg_bst > 480:
        score += 10
        
    if score >= 90: return "S"
    if score >= 75: return "A"
    if score >= 60: return "B"
    if score >= 40: return "C"
    return "D"

def generate_tactical_advice(coverage: Dict[str, float]) -> List[str]:
    advice = []
    
    # Sort types by vulnerability score
    vulnerabilities = sorted(coverage.items(), key=lambda x: x[1], reverse=True)
    
    major_weakness = [t for t, score in vulnerabilities if score >= 2.0]
    moderate_weakness = [t for t, score in vulnerabilities if 0 < score < 2.0]
    
    if major_weakness:
        advice.append(f"Critical Gap: Your team is heavily vulnerable to {', '.join(major_weakness[:2])} types. Consider adding a defensive pivot with resistance to these.")
    
    if len(moderate_weakness) > 3:
        advice.append(f"Caution: You have multiple minor weaknesses. A balanced 'Steel' or 'Fairy' type could help shore up your general defenses.")

    # Check for resistances
    resistances = [t for t, score in vulnerabilities if score <= -2.0]
    if len(resistances) > 2:
        advice.append(f"Strength: You have excellent defensive coverage against {', '.join(resistances[:2])} attacks.")
    
    if not advice:
        advice.append("Your team is fairly balanced, but watch out for specific dual-type threats.")
        
    return advice
