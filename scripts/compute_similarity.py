import pandas as pd
import sqlite3
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import StandardScaler, OneHotEncoder
import os
import json

# 1. Load Data
DB_PATH = "pokemon.db"
conn = sqlite3.connect(DB_PATH)
df = pd.read_sql_query("SELECT * FROM pokemon", conn)

# 2. Feature Engineering for Similarity
# Stats features
stats_features = ['hp', 'attack', 'defense', 'special_attack', 'special_defense', 'speed']
X_stats = df[stats_features].fillna(0)

# Normalize stats
scaler = StandardScaler()
X_stats_scaled = scaler.fit_transform(X_stats)

# Type features (One-Hot Encoding)
# We handle type1 and type2 by creating a combined "is_type_X" for all types
all_types = pd.concat([df['type1'], df['type2'].dropna()]).unique()
type_matrix = pd.DataFrame(0, index=df.index, columns=all_types)

for idx, row in df.iterrows():
    type_matrix.loc[idx, row['type1']] = 1
    if row['type2']:
        type_matrix.loc[idx, row['type2']] = 1

# Combine Stats and Types
X_combined = pd.concat([pd.DataFrame(X_stats_scaled), type_matrix.reset_index(drop=True)], axis=1)

# 3. Compute Similarity
similarity_matrix = cosine_similarity(X_combined)

# 4. Extract Top 5 Similar Pokemon for each
similarity_results = []
for idx, row in enumerate(similarity_matrix):
    # Get indices of top 6 (including self)
    similar_indices = row.argsort()[-6:-1][::-1] 
    similar_ids = df.iloc[similar_indices]['id'].tolist()
    
    similarity_results.append((
        int(df.iloc[idx]['id']),
        json.dumps(similar_ids)
    ))

# 5. Save to Database
cursor = conn.cursor()
cursor.execute("DROP TABLE IF EXISTS pokemon_similarity")
cursor.execute('''
    CREATE TABLE pokemon_similarity (
        pokemon_id INTEGER PRIMARY KEY,
        similar_ids TEXT
    )
''')

cursor.executemany(
    "INSERT INTO pokemon_similarity (pokemon_id, similar_ids) VALUES (?, ?)",
    similarity_results
)

conn.commit()
conn.close()

print("Similarity matrix computed and saved to database!")
