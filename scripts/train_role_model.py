import pandas as pd
import os
import sys
from sqlalchemy import text
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

# Add parent directory to path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.database import engine, SessionLocal
from backend.models import Pokemon

def train_roles():
    print("🚀 ML: Training role classification model...")
    
    # 1. Load Data from DB
    db = SessionLocal()
    try:
        # Load pokemon into a DataFrame
        query = db.query(Pokemon)
        pokemon_list = query.all()
        
        if not pokemon_list:
            print("ERROR: No Pokémon found in database to train on.")
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
                'speed': p.speed or 0
            })
        
        df = pd.DataFrame(data)

        # 2. Preprocessing
        features = ['hp', 'attack', 'defense', 'special_attack', 'special_defense', 'speed']
        X = df[features]

        # Normalize stats
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        # 3. Clustering
        n_clusters = 7
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        df['cluster'] = kmeans.fit_predict(X_scaled)

        # 4. Analyze Clusters to assign Role Names
        cluster_means = df.groupby('cluster')[features].mean()

        # Automated naming based on top stats
        role_mapping = {}
        for i in range(n_clusters):
            stats = cluster_means.loc[i]
            if stats['speed'] > 100 and (stats['attack'] > 90 or stats['special_attack'] > 90):
                role_mapping[i] = "Fast Attacker"
            elif stats['hp'] > 90 and (stats['defense'] > 90 or stats['special_defense'] > 90):
                role_mapping[i] = "Tank/Wall"
            elif stats['attack'] > 110 or stats['special_attack'] > 110:
                role_mapping[i] = "Wallbreaker"
            elif stats['speed'] > 110:
                role_mapping[i] = "Speed Specialist"
            else:
                role_mapping[i] = "Balanced"

        df['role'] = df['cluster'].map(role_mapping)

        # 5. Save back to Database
        print(f"ML: Updating {len(df)} Pokémon with roles...")
        
        # Use bulk update for efficiency
        with engine.begin() as conn:
            for _, row in df.iterrows():
                conn.execute(
                    text("UPDATE pokemon SET role = :role WHERE id = :id"),
                    {"role": row['role'], "id": row['id']}
                )
        
        print("✅ ML: Database updated with generated roles!")

    finally:
        db.close()

if __name__ == "__main__":
    train_roles()
