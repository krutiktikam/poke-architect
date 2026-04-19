import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .database import get_db
from .models import SavedTeam, Pokemon, User
from .auth import get_current_user
from .schemas import PokemonBase, TeamCreate

router = APIRouter(prefix="/api/teams", tags=["teams"])

@router.post("/")
async def save_team(
    team_in: TeamCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if not 1 <= len(team_in.pokemon_ids) <= 6:
        raise HTTPException(status_code=400, detail="Team must have 1-6 Pokémon")
    
    # Store as JSON string
    team = SavedTeam(
        user_id=user.id,
        name=team_in.name,
        team_data=json.dumps(team_in.pokemon_ids),
        is_public=team_in.is_public
    )
    db.add(team)
    db.commit()
    db.refresh(team)
    return {"id": team.id, "message": "Team saved successfully"}

@router.get("/")
async def get_my_teams(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    teams = db.query(SavedTeam).filter(SavedTeam.user_id == user.id).all()
    # Parse JSON back
    result = []
    for t in teams:
        result.append({
            "id": t.id,
            "name": t.name,
            "pokemon_ids": json.loads(t.team_data),
            "is_public": t.is_public,
            "created_at": t.created_at
        })
    return result

@router.get("/public")
async def get_public_teams(db: Session = Depends(get_db)):
    teams = db.query(SavedTeam).filter(SavedTeam.is_public == True).all()
    result = []
    for t in teams:
        # Fetch pokemon details for summary
        p_ids = json.loads(t.team_data)
        pokemon = db.query(Pokemon).filter(Pokemon.id.in_(p_ids)).all()
        result.append({
            "id": t.id,
            "name": t.name,
            "owner": t.owner.name,
            "pokemon": [p.sprite_url for p in pokemon],
            "pokemon_ids": p_ids,
            "created_at": t.created_at
        })
    return result

@router.get("/leaderboard")
async def get_leaderboard(db: Session = Depends(get_db)):
    teams = db.query(SavedTeam).filter(SavedTeam.is_public == True).all()
    
    efficacies = db.query(TypeEfficacy).all()
    eff_map = {}
    for e in efficacies:
        if e.damage_type not in eff_map:
            eff_map[e.damage_type] = {}
        eff_map[e.damage_type][e.target_type] = e.damage_factor

    from .utils import calculate_type_coverage
    
    scored_teams = []
    for t in teams:
        try:
            p_ids = json.loads(t.team_data)
            if not p_ids:
                continue
                
            pokemon = db.query(Pokemon).filter(Pokemon.id.in_(p_ids)).all()
            if not pokemon:
                continue
            
            # Power Rating Calculation
            # 1. BST contribution
            total_bst = sum((p.hp or 0) + (p.attack or 0) + (p.defense or 0) + 
                          (p.special_attack or 0) + (p.special_defense or 0) + (p.speed or 0) 
                          for p in pokemon)
            avg_bst = total_bst / len(pokemon)
            
            # 2. Coverage contribution
            coverage = calculate_type_coverage(pokemon, eff_map)
            weaknesses = sum(1 for score in coverage.values() if score > 0)
            resistances = sum(1 for score in coverage.values() if score < 0)
            
            power_score = (avg_bst / 10) - (weaknesses * 2) + (resistances * 1)
            
            scored_teams.append({
                "id": t.id,
                "name": t.name,
                "owner": t.owner.name if t.owner else "Unknown",
                "pokemon": [p.sprite_url for p in pokemon],
                "power_score": round(power_score, 1),
                "created_at": t.created_at
            })
        except Exception as e:
            print(f"Error scoring team {t.id}: {e}")
            continue
        
    # Sort by power_score descending
    scored_teams.sort(key=lambda x: x["power_score"], reverse=True)
    return scored_teams[:10]

@router.delete("/{team_id}")
async def delete_team(
    team_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    team = db.query(SavedTeam).filter(SavedTeam.id == team_id, SavedTeam.user_id == user.id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found or unauthorized")
    
    db.delete(team)
    db.commit()
    return {"message": "Team deleted successfully"}
