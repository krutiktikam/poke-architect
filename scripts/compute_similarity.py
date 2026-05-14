import pandas as pd
import os
import sys
import json
from sqlalchemy import text
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import StandardScaler

# Add parent directory to path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.database import engine, SessionLocal
from backend.models import Pokemon, PokemonSimilarity

def compute_similarities():
    print("🚀 AI: Computing Pokémon similarity matrix...")
    
    # 1. Load Data from DB
    db = SessionLocal()
    try:
        # Load pokemon into a DataFrame
        query = db.query(Pokemon)
        pokemon_list = query.all()
        
        if not pokemon_list:
            print("ERROR: No Pokémon found in database to compute similarities.")
            return

        data = []
        for p in pokemon_list:
            data.append({
                'id': p.id,
                'hp': p.hp or 0,
                'attack': p.attack or 0,
                'defense': p.defense or 0,
                'special_attack': p.special_attack or 0,
                'special_defense': p.special_defense or 0,
                'speed': p.speed or 0,
                'type1': p.type1,
                'type2': p.type2
            })
        
        df = pd.DataFrame(data)

        # 2. Feature Engineering
        # Stats features
        stats_features = ['hp', 'attack', 'defense', 'special_attack', 'special_defense', 'speed']
        X_stats = df[stats_features]

        # Normalize stats
        scaler = StandardScaler()
        X_stats_scaled = scaler.fit_transform(X_stats)

        # Type features (One-Hot Encoding)
        # Get all unique types
        all_types = list(set(df['type1'].tolist() + df['type2'].dropna().tolist()))
        type_matrix = pd.DataFrame(0, index=df.index, columns=all_types)

        for idx, row in df.iterrows():
            type_matrix.loc[idx, row['type1']] = 1
            if row['type2']:
                type_matrix.loc[idx, row['type2']] = 1

        # Combine Stats and Types (Stats carry more weight in this heuristic)
        X_combined = pd.concat([pd.DataFrame(X_stats_scaled), type_matrix.reset_index(drop=True)], axis=1)

        # 3. Compute Similarity
        print("AI: Calculating cosine similarity...")
        similarity_matrix = cosine_similarity(X_combined)

        # 4. Extract Top 5 Similar Pokemon for each
        similarity_results = []
        for idx, row in enumerate(similarity_matrix):
            # Get indices of top 6 (including self)
            # argsort sorts ascending, so we take the last 6
            similar_indices = row.argsort()[-6:-1][::-1] 
            similar_ids = df.iloc[similar_indices]['id'].tolist()
            
            similarity_results.append({
                "pokemon_id": int(df.iloc[idx]['id']),
                "similar_ids": json.dumps([int(sid) for sid in similar_ids])
            })

        # 5. Save to Database
        print(f"AI: Saving {len(similarity_results)} similarity records to database...")
        
        with engine.begin() as conn:
            # Clear existing similarities
            conn.execute(text("DELETE FROM pokemon_similarity"))
            
            # Bulk insert
            conn.execute(
                text("INSERT INTO pokemon_similarity (pokemon_id, similar_ids) VALUES (:pokemon_id, :similar_ids)"),
                similarity_results
            )

        print("✅ AI: Similarity matrix computed and saved!")

    finally:
        db.close()

if __name__ == "__main__":
    compute_similarities()
