# 🚀 PokéArchitect - Startup Guide

This guide explains how to set up and run the PokéArchitect ecosystem, including the AI/ML data pipeline.

## 📋 Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **npm**

## 🛠️ Initial Setup

### 1. Backend Environment
```bash
# Create virtual environment
python -m venv venv

# Activate venv (Windows)
.\venv\Scripts\activate

# Activate venv (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Frontend Environment
```bash
cd frontend
npm install
cd ..
```

---

## 🧠 The AI/ML Data Pipeline
Before running the app, you must populate the database and train the models.

### Step 1: Extract Data (ETL)
Fetches 1025+ Pokémon from PokéAPI and builds the core database.
```bash
python scripts/etl_pipeline.py
```

### Step 2: Train Role Clusters (Unsupervised ML)
Uses K-Means to categorize Pokémon into archetypes based on stats.
```bash
python scripts/train_role_model.py
```

### Step 3: Compute Similarity (Similarity Engine)
Calculates the Cosine Similarity matrix for the recommendation engine.
```bash
python scripts/compute_similarity.py
```

---

## 🏃 Running the Application

### The Easy Way (Multi-Process)
Run the automated startup script which launches both Backend and Frontend:
```bash
python start.py
```

### The Manual Way
**Terminal 1 (Backend):**
```bash
uvicorn backend.main:app --reload --port 8000
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

---

## 🌐 Deployment
- **Frontend:** Deployed to **Vercel**.
- **Backend:** Deployed to **Render**.
- **Database:** Uses **Supabase (PostgreSQL)** in production.
