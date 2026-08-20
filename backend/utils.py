import os
from typing import List, Dict
from .models import Pokemon, TypeEfficacy

def get_tier_weight(tier):
    weights = {"Uber": 5, "OU": 4, "UU": 3, "RU": 2, "NU": 1, "PU": 0.5, "N/A": 0}
    return weights.get(tier, 0)

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
            
            # Weighted scoring for team coverage
            if multiplier >= 4.0:
                coverage[atk_type] += 2.0 # Critical weakness
            elif multiplier >= 2.0:
                coverage[atk_type] += 1.0 # Standard weakness
            elif multiplier == 0.0:
                coverage[atk_type] -= 1.5 # Immunity is very valuable
            elif multiplier <= 0.5:
                coverage[atk_type] -= 1.0 # Standard resistance
                
    return coverage

def suggest_pokemon(current_team: List[Pokemon], all_pokemon: List[Pokemon], efficacy_map: Dict[str, Dict[str, float]]) -> List[Dict]:
    # Try ML recommender first
    try:
        from .ml_recommender import team_recommender
        if team_recommender.is_trained:
            ml_suggestions = team_recommender.suggest_pokemon_for_team(
                current_team, all_pokemon, efficacy_map, top_n=5
            )
            suggestions = []
            for sug in ml_suggestions:
                p = sug["pokemon"]
                suggestions.append({
                    "id": p.id, "name": p.name, "type1": p.type1, "type2": p.type2,
                    "hp": p.hp, "attack": p.attack, "defense": p.defense,
                    "special_attack": p.special_attack, "special_defense": p.special_defense,
                    "speed": p.speed, "sprite_url": p.sprite_url, "region": p.region,
                    "generation": p.generation, "is_legendary": p.is_legendary, "is_mythical": p.is_mythical,
                    "reasoning": sug["reasoning"], "role": p.role or "Balanced",
                    "score": sug["score"]
                })
            return suggestions
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"ML recommender failed, falling back to heuristic: {e}")
    if not current_team:
        return []
    
    # Allow suggestions even if team is full (for swapping)
    is_full = len(current_team) >= 6
        
    coverage = calculate_type_coverage(current_team, efficacy_map)
    weak_types = [t for t, score in coverage.items() if score > 0]
    
    # Calculate team's average speed to see if they need a speed boost
    avg_speed = sum(p.speed or 0 for p in current_team) / len(current_team)
    needs_speed = avg_speed < 85

    scored_suggestions = []
    
    for p in all_pokemon:
        if p.id in [tp.id for tp in current_team]:
            continue
            
        reasoning = []
        defensive_score = 0
        p_types = [p.type1]
        if p.type2:
            p_types.append(p.type2)
            
        # 1. Defensive Synergy
        covered_weaknesses = []
        for wt in weak_types:
            multiplier = 1.0
            for pt in p_types:
                multiplier *= efficacy_map.get(wt, {}).get(pt, 1.0)
            
            if multiplier < 1.0:
                defensive_score += (1.0 - multiplier) * 15
                covered_weaknesses.append(wt)
            if multiplier == 0:
                defensive_score += 25
                reasoning.append(f"Immune to {wt} attacks")
        
        if covered_weaknesses and not any("Immune" in r for r in reasoning):
            reasoning.append(f"Resists key weaknesses: {', '.join(covered_weaknesses[:2])}")

        # 2. Stat Quality & Role Fit
        bst = (p.hp or 0) + (p.attack or 0) + (p.defense or 0) + \
              (p.special_attack or 0) + (p.special_defense or 0) + (p.speed or 0)
        
        # Penalize non-fully evolved pokemon (rough heuristic: BST < 450)
        evolution_penalty = 1.0
        if bst < 450 and not p.is_legendary:
            evolution_penalty = 0.5
            
        stat_score = (bst / 100) * evolution_penalty
        
        # 3. Speed Utility
        speed_bonus = 0
        if needs_speed and (p.speed or 0) > 110:
            speed_bonus = 15
            reasoning.append("High Speed utility")

        # 4. Offensive Utility (Can it hit the things the team is weak to?)
        offensive_bonus = 0
        countered_types = []
        for wt in weak_types:
            # Check if p's STAB can hit wt super effectively
            for pt in p_types:
                if efficacy_map.get(pt, {}).get(wt, 1.0) > 1.0:
                    offensive_bonus += 12
                    countered_types.append(wt)
                    break
        
        if countered_types:
            reasoning.append(f"Offensive counter to {', '.join(countered_types[:2])}")
        
        role = p.role or "Balanced"
        total_score = (defensive_score * 2.0) + stat_score + speed_bonus + offensive_bonus
        
        if total_score > 20: # Only suggest if actually helpful
            # Create a dictionary that matches the schema
            p_dict = {
                "id": p.id, "name": p.name, "type1": p.type1, "type2": p.type2,
                "hp": p.hp, "attack": p.attack, "defense": p.defense,
                "special_attack": p.special_attack, "special_defense": p.special_defense,
                "speed": p.speed, "sprite_url": p.sprite_url, "region": p.region,
                "generation": p.generation, "is_legendary": p.is_legendary, "is_mythical": p.is_mythical,
                "reasoning": list(set(reasoning))[:3], # Max 3 unique reasons
                "role": role,
                "score": total_score # Temporary for sorting
            }
            scored_suggestions.append(p_dict)
                
    scored_suggestions.sort(key=lambda x: x["score"], reverse=True)
    return scored_suggestions[:5]

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

def calculate_win_probability(team_a: List[Pokemon], team_b: List[Pokemon], efficacy_map: Dict[str, Dict[str, float]]) -> float:
    """Returns probability (0.0 to 1.0) that Team A wins against Team B using a heuristic model."""
    if not team_a or not team_b:
        return 0.5
        
    # Features Extraction
    bst_a = sum((p.hp or 0) + (p.attack or 0) + (p.defense or 0) + (p.special_attack or 0) + (p.special_defense or 0) + (p.speed or 0) for p in team_a)
    bst_b = sum((p.hp or 0) + (p.attack or 0) + (p.defense or 0) + (p.special_attack or 0) + (p.special_defense or 0) + (p.speed or 0) for p in team_b)
    
    spe_a = sum(p.speed or 0 for p in team_a) / len(team_a)
    spe_b = sum(p.speed or 0 for p in team_b) / len(team_b)
    
    meta_a = sum(get_tier_weight(p.tier) for p in team_a)
    meta_b = sum(get_tier_weight(p.tier) for p in team_b)
    
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

    # Heuristic-based win probability
    score_a = (bst_a / 3000) * 0.4 + (spe_a / 100) * 0.1 + (type_score_a / 36) * 0.3 + (meta_a / 30) * 0.2
    score_b = (bst_b / 3000) * 0.4 + (spe_b / 100) * 0.1 + (type_score_b / 36) * 0.3 + (meta_b / 30) * 0.2
    
    total = score_a + score_b
    return score_a / total if total > 0 else 0.5

def generate_tactical_advice(coverage: Dict[str, float]) -> List[str]:
    advice = []
    
    # Sort types by vulnerability score
    vulnerabilities = sorted(coverage.items(), key=lambda x: x[1], reverse=True)
    
    major_weakness = [t for t, score in vulnerabilities if score >= 2.0]
    moderate_weakness = [t for t, score in vulnerabilities if 0 < score < 2.0]
    
    # Meta Threats based on major weaknesses
    meta_threats = {
        "ground": "Garchomp / Landorus (Earthquake)",
        "fire": "Charizard / Volcarona (Flamethrower)",
        "water": "Palafin / Kyogre (Surfing/Jet Punch)",
        "fighting": "Lucario / Annihilape (Close Combat)",
        "ghost": "Gengar / Dragapult (Shadow Ball)",
        "fairy": "Flutter Mane / Sylveon (Moonblast)",
        "steel": "Gholdengo / Scizor (Bullet Punch)",
        "ice": "Iron Bundle / Baxcalibur (Ice Beam/Glaive Rush)",
        "dragon": "Roaring Moon / Dragonite (Outrage/Draco Meteor)"
    }
    
    if major_weakness:
        threats = [meta_threats.get(t, t) for t in major_weakness[:2]]
        advice.append(f"Critical Gap: Your team is heavily vulnerable to {', '.join(major_weakness[:2])} types. Watch out for threats like {', '.join(threats)}.")
    
    if len(moderate_weakness) > 3:
        advice.append(f"Caution: You have multiple minor weaknesses. A balanced 'Steel' or 'Fairy' type could help shore up your general defenses.")

    # Check for resistances
    resistances = [t for t, score in vulnerabilities if score <= -2.0]
    if len(resistances) > 2:
        advice.append(f"Strength: You have excellent defensive coverage against {', '.join(resistances[:2])} attacks.")
    
    if not advice:
        advice.append("Your team is fairly balanced, but watch out for specific dual-type threats.")
        
    return advice
