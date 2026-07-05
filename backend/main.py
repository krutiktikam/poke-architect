import os
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from .database import engine, get_db, Base, SessionLocal
from .models import Pokemon, TypeEfficacy
from .schemas import PokemonBase, TeamAnalysisResponse, TeamComparisonResponse
from .utils import calculate_team_stats, calculate_type_coverage, suggest_pokemon, generate_tactical_advice, detect_team_archetype, calculate_health_score, calculate_win_probability
from . import auth, teams
import json
from fastapi.responses import JSONResponse

from sqlalchemy import text

app = FastAPI(title="Pokémon Team Architect API")

# Robust CORS Configuration
env_origins = os.getenv("ALLOWED_ORIGINS", "")
origins = [o.strip() for o in env_origins.split(",") if o.strip()]

# If "*" is in origins, we use allow_origin_regex to bypass FastAPI's credential restriction
if "*" in origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=".*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"]
    )
else:
    if not origins:
        origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "https://poke-architect.vercel.app",
        ]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=r"https://poke-architect-.*\.vercel\.app",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"]
    )

# Session Middleware
app.add_middleware(
    SessionMiddleware, 
    secret_key=os.getenv("SECRET_KEY", "your-session-secret-change-it")
)

@app.on_event("startup")
async def startup_event():
    print("BOOT: Application starting up...")
    try:
        # 1. Create tables if they don't exist
        print("BOOT: Syncing database schema...")
        Base.metadata.create_all(bind=engine)
        
        # 2. Database-agnostic column check and addition
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        
        # Get columns for 'pokemon' table
        try:
            columns_info = inspector.get_columns('pokemon')
            columns = [c['name'] for c in columns_info]
            print(f"BOOT: Detected columns: {columns}")
        except Exception as e:
            print(f"BOOT WARN: Could not inspect columns: {e}. Attempting manual sync...")
            columns = []
        
        with engine.connect() as conn:
            # Helper to add column if missing
            def add_column_if_missing(col_name, col_type):
                if col_name not in columns:
                    print(f"BOOT: Column '{col_name}' is missing. Adding it now...")
                    try:
                        conn.execute(text(f"ALTER TABLE pokemon ADD COLUMN {col_name} {col_type};"))
                        conn.commit()
                        print(f"BOOT: Successfully added '{col_name}' column.")
                    except Exception as e:
                        if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                            print(f"BOOT: Column '{col_name}' already exists (ignoring duplicate error).")
                        else:
                            print(f"BOOT ERROR: Failed to add '{col_name}': {e}")

            add_column_if_missing('role', 'VARCHAR')
            add_column_if_missing('tier', "VARCHAR DEFAULT 'N/A'")
            add_column_if_missing('usage_rate', 'FLOAT DEFAULT 0.0')
                
        # 3. Inform about data state (don't auto-train/compute to save memory)
        db = SessionLocal()
        try:
            p_count = db.query(Pokemon).count()
            if p_count == 0:
                print("BOOT: Database is empty. Please run seeding scripts manually.")
            else:
                null_roles = db.query(Pokemon).filter(Pokemon.role == None).count()
                if null_roles > 0:
                    print(f"BOOT INFO: {null_roles} Pokémon missing roles. Run 'train_role_model.py' to fix.")
                
                na_tiers = db.query(Pokemon).filter(Pokemon.tier == 'N/A').count()
                if na_tiers > 1000: 
                    print("BOOT INFO: Meta-Intelligence (Tiers) missing. Run 'update_meta_data.py' to fix.")
        finally:
            db.close()
                
        print("BOOT: Application ready.")
    except Exception as e:
        import traceback
        print(f"BOOT ERROR: Startup failed: {e}")
        print(traceback.format_exc())

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback
    error_msg = str(exc)
    print(f"GLOBAL ERROR: {error_msg}")
    print(traceback.format_exc())
    
    response = JSONResponse(
        status_code=500,
        content={
            "detail": "Internal Server Error", 
            "error": error_msg,
            "type": type(exc).__name__
        },
    )
    
    # MANUALLY add CORS headers to error responses to prevent "No Access-Control-Allow-Origin"
    origin = request.headers.get("origin")
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        
    return response

@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected", "engine": engine.name}
    except Exception as e:
        return {"status": "error", "database": str(e)}

@app.get("/api/test-cors")
def test_cors():
    return {"message": "CORS is working if you can see this"}

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
    try:
        query = db.query(Pokemon)
        if search:
            query = query.filter(Pokemon.name.ilike(f"%{search}%"))
        if type:
            query = query.filter((Pokemon.type1 == type) | (Pokemon.type2 == type))
        if generation:
            query = query.filter(Pokemon.generation == generation)
        return query.limit(limit).all()
    except Exception as e:
        import traceback
        print(f"POKEMON ROUTE ERROR: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")

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

from sqlalchemy import func

@app.get("/api/analytics/global")
def get_global_analytics(db: Session = Depends(get_db)):
    # 1. Stats by Generation (Ordered)
    gen_stats = db.query(
        Pokemon.generation,
        func.avg(Pokemon.attack).label("avg_atk"),
        func.avg(Pokemon.speed).label("avg_spe"),
        func.avg(Pokemon.hp).label("avg_hp")
    ).group_by(Pokemon.generation).order_by(Pokemon.generation).all()
    
    gen_trends = [{
        "generation": f"Gen {g[0]}",
        "attack": round(float(g[1]), 1),
        "speed": round(float(g[2]), 1),
        "hp": round(float(g[3]), 1)
    } for g in gen_stats]
    
    # 2. Comprehensive Type Distribution (Counting both Type 1 and Type 2)
    t1_counts = db.query(Pokemon.type1, func.count(Pokemon.id)).group_by(Pokemon.type1).all()
    t2_counts = db.query(Pokemon.type2, func.count(Pokemon.id)).filter(Pokemon.type2 != None).group_by(Pokemon.type2).all()
    
    # Merge counts
    merged_counts = {}
    for t_name, count in t1_counts:
        merged_counts[t_name] = merged_counts.get(t_name, 0) + count
    for t_name, count in t2_counts:
        merged_counts[t_name] = merged_counts.get(t_name, 0) + count
        
    type_dist = [{"type": t, "count": c} for t, c in sorted(merged_counts.items(), key=lambda x: x[1], reverse=True)]
    
    # 3. Individual Pokémon Stats for Scatter Plot
    all_p = db.query(Pokemon).all()
    pokemon_stats = [{
        "name": p.name,
        "type1": p.type1,
        "type2": p.type2,
        "avg_stat": round(((p.hp or 0) + (p.attack or 0) + (p.defense or 0) + 
                          (p.special_attack or 0) + (p.special_defense or 0) + (p.speed or 0)) / 6, 1),
        "generation": p.generation
    } for p in all_p]
    
    return {
        "generation_trends": gen_trends,
        "type_distribution": type_dist,
        "pokemon_stats": pokemon_stats
    }
from fastapi.responses import Response
import csv
import io

@app.get("/api/analytics/export/pokemon")
def export_pokemon_csv(db: Session = Depends(get_db)):
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        "id", "name", "type1", "type2", "hp", "attack", "defense", 
        "special_attack", "special_defense", "speed", "bst", 
        "generation", "region", "is_legendary", "is_mythical", 
        "role", "tier", "usage_rate"
    ])
    
    pokemon_list = db.query(Pokemon).all()
    for p in pokemon_list:
        bst = (p.hp or 0) + (p.attack or 0) + (p.defense or 0) + \
              (p.special_attack or 0) + (p.special_defense or 0) + (p.speed or 0)
        writer.writerow([
            p.id, p.name, p.type1, p.type2 or "", p.hp, p.attack, p.defense,
            p.special_attack, p.special_defense, p.speed, bst,
            p.generation, p.region or "", p.is_legendary, p.is_mythical,
            p.role or "", p.tier or "N/A", p.usage_rate or 0.0
        ])
        
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=pokemon_data.csv"}
    )

@app.get("/api/analytics/export/teams")
def export_teams_csv(db: Session = Depends(get_db)):
    from .models import SavedTeam, User
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        "team_id", "team_name", "user_id", "user_name", "created_at",
        "pokemon_1", "pokemon_2", "pokemon_3", "pokemon_4", "pokemon_5", "pokemon_6"
    ])
    
    teams_list = db.query(SavedTeam).all()
    all_p = db.query(Pokemon.id, Pokemon.name).all()
    p_map = {p[0]: p[1] for p in all_p}
    
    for t in teams_list:
        user_name = "Anonymous"
        if t.user_id:
            user_obj = db.query(User).filter(User.id == t.user_id).first()
            if user_obj:
                user_name = user_obj.name
                
        try:
            p_ids = json.loads(t.team_data) if t.team_data else []
        except Exception:
            p_ids = []
            
        p_names = [p_map.get(pid, "") for pid in p_ids]
        p_names += [""] * (6 - len(p_names))
        
        writer.writerow([
            t.id, t.name or "Unnamed Team", t.user_id or "", user_name, t.created_at,
            p_names[0], p_names[1], p_names[2], p_names[3], p_names[4], p_names[5]
        ])
        
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=teams_data.csv"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

