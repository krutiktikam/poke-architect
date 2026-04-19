import os
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from .database import engine, get_db, Base
from .models import Pokemon, TypeEfficacy
from .schemas import PokemonBase, TeamAnalysisResponse, TeamComparisonResponse
from .utils import calculate_team_stats, calculate_type_coverage, suggest_pokemon, generate_tactical_advice, detect_team_archetype, calculate_health_score, calculate_win_probability
from . import auth, teams

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Pokémon Team Architect API")

# Session Middleware required for OAuth
app.add_middleware(
    SessionMiddleware, 
    secret_key=os.getenv("SECRET_KEY", "your-session-secret-change-it")
)

# Configure origins
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://poke-architect.vercel.app",
]

frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    # Allow comma-separated strings for multiple production origins
    if "," in frontend_url:
        origins.extend([u.strip() for u in frontend_url.split(",")])
    else:
        origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(teams.router)

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

@app.get("/api/pokemon/batch", response_model=List[PokemonBase])
def get_pokemon_batch(
    ids: str = Query(...),
    db: Session = Depends(get_db)
):
    try:
        id_list = [int(i) for i in ids.split(",")]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format. Use comma-separated integers.")
    
    pokemon = db.query(Pokemon).filter(Pokemon.id.in_(id_list)).all()
    # Sort them according to the input IDs to maintain order
    pokemon_map = {p.id: p for p in pokemon}
    return [pokemon_map[i] for i in id_list if i in pokemon_map]

@app.get("/api/pokemon/{pokemon_id}", response_model=PokemonBase)
def get_single_pokemon(pokemon_id: int, db: Session = Depends(get_db)):
    pokemon = db.query(Pokemon).filter(Pokemon.id == pokemon_id).first()
    if not pokemon:
        raise HTTPException(status_code=404, detail="Pokémon not found")
    return pokemon

@app.post("/api/compare-teams", response_model=TeamComparisonResponse)
def compare_teams(
    team_a_ids: List[int],
    team_b_ids: List[int],
    db: Session = Depends(get_db)
):
    team_a = db.query(Pokemon).filter(Pokemon.id.in_(team_a_ids)).all()
    team_b = db.query(Pokemon).filter(Pokemon.id.in_(team_b_ids)).all()
    
    efficacies = db.query(TypeEfficacy).all()
    eff_map = {}
    for e in efficacies:
        if e.damage_type not in eff_map:
            eff_map[e.damage_type] = {}
        eff_map[e.damage_type][e.target_type] = e.damage_factor
        
    prob_a = calculate_win_probability(team_a, team_b, eff_map)
    
    # Generate some simple advantage factors
    factors = []
    
    avg_speed_a = sum(p.speed or 0 for p in team_a) / len(team_a) if team_a else 0
    avg_speed_b = sum(p.speed or 0 for p in team_b) / len(team_b) if team_b else 0
    if avg_speed_a > avg_speed_b + 10:
        factors.append("Team A has a significant speed advantage")
    elif avg_speed_b > avg_speed_a + 10:
        factors.append("Team B has a significant speed advantage")
        
    bst_a = sum((p.hp or 0) + (p.attack or 0) + (p.defense or 0) + (p.special_attack or 0) + (p.special_defense or 0) + (p.speed or 0) for p in team_a)
    bst_b = sum((p.hp or 0) + (p.attack or 0) + (p.defense or 0) + (p.special_attack or 0) + (p.special_defense or 0) + (p.speed or 0) for p in team_b)
    if bst_a > bst_b * 1.1:
        factors.append("Team A has higher overall base stats")
    elif bst_b > bst_a * 1.1:
        factors.append("Team B has higher overall base stats")
        
    return {
        "team_a_win_prob": round(prob_a, 2),
        "team_b_win_prob": round(1.0 - prob_a, 2),
        "advantage_factors": factors
    }

@app.post("/api/team-analysis", response_model=TeamAnalysisResponse)
def analyze_team(
    pokemon_ids: List[int], 
    db: Session = Depends(get_db),
    target_generation: Optional[int] = Query(None)
):
    if not pokemon_ids:
        return {"total_stats": {}, "type_coverage": {}, "suggestions": [], "advice": [], "archetype": "None", "health_score": "F"}
    
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
    health_score = calculate_health_score(team, coverage)
    
    return {
        "total_stats": stats,
        "type_coverage": coverage,
        "suggestions": suggestions,
        "advice": advice,
        "archetype": archetype,
        "health_score": health_score
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
