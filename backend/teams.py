import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .database import get_db
from .models import SavedTeam, Pokemon, User
from .auth import get_current_user
from .schemas import PokemonBase

router = APIRouter(prefix="/api/teams", tags=["teams"])

@router.post("/")
async def save_team(
    name: str, 
    pokemon_ids: List[int], 
    is_public: bool = False, 
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if not 1 <= len(pokemon_ids) <= 6:
        raise HTTPException(status_code=400, detail="Team must have 1-6 Pokémon")
    
    # Store as JSON string
    team = SavedTeam(
        user_id=user.id,
        name=name,
        team_data=json.dumps(pokemon_ids),
        is_public=is_public
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
