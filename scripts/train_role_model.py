import pandas as pd
import sqlite3
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import matplotlib.pyplot as plt
import seaborn as sns
import os

# 1. Load Data
DB_PATH = "pokemon.db"
if not os.path.exists(DB_PATH):
    print(f"Error: {DB_PATH} not found. Please run the ETL pipeline first.")
    exit()

conn = sqlite3.connect(DB_PATH)
df = pd.read_sql_query("SELECT * FROM pokemon", conn)
conn.close()

# 2. Preprocessing
# Select stats for clustering
features = ['hp', 'attack', 'defense', 'special_attack', 'special_defense', 'speed']
X = df[features].fillna(0)

# Normalize stats (Crucial for K-Means)
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# 3. Clustering
# We'll use 7 clusters to represent common archetypes
# (e.g., Physical Sweeper, Special Sweeper, Physical Tank, Special Tank, Balanced, Speedster, Glass Cannon)
kmeans = KMeans(n_clusters=7, random_state=42, n_init=10)
df['cluster'] = kmeans.fit_predict(X_scaled)

# 4. Analyze Clusters to assign Role Names
cluster_means = df.groupby('cluster')[features].mean()
print("Cluster Centers (Average Stats):")
print(cluster_means)

def map_cluster_to_role(row):
    # This logic is based on the cluster_means observed during development
    # In a real scenario, you'd inspect the means and assign names accordingly.
    # For the portfolio, we'll use a data-driven heuristic to name them.
    c = row
    if c['speed'] > 105 and c['attack'] > 100: return "Physical Sweeper"
    if c['speed'] > 105 and c['special_attack'] > 100: return "Special Sweeper"
    if c['hp'] > 100 and c['defense'] > 100: return "Physical Wall"
    if c['hp'] > 100 and c['special_defense'] > 100: return "Special Wall"
    if c['speed'] > 120: return "Speed Specialist"
    if (c['attack'] > 100 or c['special_attack'] > 100) and c['speed'] < 70: return "Slow Wallbreaker"
    return "Balanced"

# Automated naming based on top stats
role_mapping = {}
for i in range(7):
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

# 5. Visualizing (Optional - for the Portfolio)
plt.figure(figsize=(10, 6))
sns.scatterplot(data=df, x='attack', y='speed', hue='role', palette='viridis')
plt.title('Pokémon Roles: Attack vs Speed (K-Means Clusters)')
plt.savefig('notebooks/cluster_visualization.png')
print("Visualization saved to notebooks/cluster_visualization.png")

# 6. Save back to Database
# We need to add the 'role' column to the database if it doesn't exist
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE pokemon ADD COLUMN role TEXT")
except sqlite3.OperationalError:
    # Column already exists
    pass

# Update each pokemon with its new role
update_data = df[['role', 'id']].values.tolist()
cursor.executemany("UPDATE pokemon SET role = ? WHERE id = ?", update_data)

conn.commit()
conn.close()

print("Database updated with ML-generated roles!")
