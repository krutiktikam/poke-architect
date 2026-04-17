import os
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from .database import engine, get_db, Base
from .models import Pokemon, TypeEfficacy
from .schemas import PokemonBase, TeamAnalysisResponse
from .utils import calculate_team_stats, calculate_type_coverage, suggest_pokemon, generate_tactical_advice, detect_team_archetype

# Base.metadata.create_all(bind=engine) # Not needed as ETL created it

app = FastAPI(title="Pokémon Team Architect API")

# Default origins for development
origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "message": "Welcome to the PokéArchitect API",
        "docs": "/docs",
        "status": "online"
    }

@app.get("/api/pokemon", response_model=List[PokemonBase])
def get_pokemon(
    db: Session = Depends(get_db), 
    limit: int = 250, 
    search: Optional[str] = None,
    type: Optional[str] = None,
    generation: Optional[int] = None
):
    query = db.query(Pokemon)
    if search:
        query = query.filter(Pokemon.name.contains(search.capitalize()))
    if type:
        query = query.filter((Pokemon.type1 == type) | (Pokemon.type2 == type))
    if generation:
        query = query.filter(Pokemon.generation == generation)
    return query.limit(limit).all()

@app.get("/api/pokemon/{pokemon_id}", response_model=PokemonBase)
def get_single_pokemon(pokemon_id: int, db: Session = Depends(get_db)):
    pokemon = db.query(Pokemon).filter(Pokemon.id == pokemon_id).first()
    if not pokemon:
        raise HTTPException(status_code=404, detail="Pokémon not found")
    return pokemon

@app.post("/api/team-analysis", response_model=TeamAnalysisResponse)
def analyze_team(
    pokemon_ids: List[int], 
    db: Session = Depends(get_db),
    target_generation: Optional[int] = Query(None)
):
    if not pokemon_ids:
        return {"total_stats": {}, "type_coverage": {}, "suggestions": [], "advice": [], "archetype": "None"}
    
    if len(pokemon_ids) > 6:
        raise HTTPException(status_code=400, detail="Team can have max 6 Pokémon")
    
    team = db.query(Pokemon).filter(Pokemon.id.in_(pokemon_ids)).all()
    
    # Pre-fetch efficacy map for logic
    efficacies = db.query(TypeEfficacy).all()
    eff_map = {}
    for e in efficacies:
        if e.damage_type not in eff_map:
            eff_map[e.damage_type] = {}
        eff_map[e.damage_type][e.target_type] = e.damage_factor
        
    stats = calculate_team_stats(team)
    coverage = calculate_type_coverage(team, eff_map)
    
    # Contextual Suggestions
    query = db.query(Pokemon)
    if target_generation:
        query = query.filter(Pokemon.generation <= target_generation)
    
    all_p = query.limit(1025).all()
    suggestions = suggest_pokemon(team, all_p, eff_map)
    advice = generate_tactical_advice(coverage)
    archetype = detect_team_archetype(team)
    
    return {
        "total_stats": stats,
        "type_coverage": coverage,
        "suggestions": suggestions,
        "advice": advice,
        "archetype": archetype
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
