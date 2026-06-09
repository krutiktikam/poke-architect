import pandas as pd
import joblib
import os
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score

def train_model():
    print("🚀 AI: Training Win-Probability Model...")
    
    if not os.path.exists("match_data.csv"):
        print("ERROR: match_data.csv not found. Run generate_battle_data.py first.")
        return

    # 1. Load Data
    df = pd.read_csv("match_data.csv")
    
    X = df.drop("winner", axis=1)
    y = df["winner"]
    
    # 2. Split Data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # 3. Scale Features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # 4. Train Model
    model = LogisticRegression()
    model.fit(X_train_scaled, y_train)
    
    # 5. Evaluate
    y_pred = model.predict(X_test_scaled)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"✅ AI: Model trained with Accuracy: {accuracy:.4f}")
    
    # 6. Save Model and Scaler
    model_dir = "backend/models/ml"
    os.makedirs(model_dir, exist_ok=True)
    
    joblib.dump(model, os.path.join(model_dir, "win_predictor.joblib"))
    joblib.dump(scaler, os.path.join(model_dir, "scaler.joblib"))
    print(f"📦 AI: Model saved to {model_dir}")

if __name__ == "__main__":
    train_model()
