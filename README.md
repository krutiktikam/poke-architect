# PokéArchitect 🏛️

**PokéArchitect** is a professional full-stack Pokémon Team Builder designed for the modern web. It allows trainers to curate teams, analyze their structural strengths and weaknesses, and optimize their composition using a sleek, responsive interface.

## 🚀 Features

- **Decoupled Architecture**: High-performance FastAPI (Python) backend paired with a responsive Vite/React frontend.
- **Data Engineering (ETL)**: A custom data pipeline that extracts data from PokéAPI, transforms it for efficiency, and loads it into a local SQLite database.
- **Team Analysis**: Real-time visualization of team base stats (Radar Chart) and type coverage (Weakness/Resistance analysis).
- **Advanced Filtering**: Search and filter the catalog by name or type instantly.
- **AI-Lite Suggestions**: Algorithmic member suggestions to cover gaps in your team's type coverage.
- **Modern UI**: Styled with Tailwind CSS v4, featuring a responsive "Team Dock" for a seamless mobile experience.

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Recharts, Lucide-React.
- **Backend**: FastAPI, SQLAlchemy, Pydantic, Uvicorn.
- **Database**: SQLite (managed via SQLAlchemy).
- **Data Source**: [PokéAPI](https://pokeapi.co/).

## 🚦 Getting Started

### 1. Prerequisites
- Python 3.10+
- Node.js 18+

### 2. Setup
```bash
# Initialize Python virtual environment
python -m venv venv
.\venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Run the ETL pipeline to populate the database
python scripts/etl_pipeline.py

# Install Frontend dependencies
cd frontend
npm install
cd ..
```

### 3. Run the Application
Use the provided `start.py` script to launch both the backend and frontend simultaneously:
```bash
python start.py
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:8000](http://localhost:8000)

## 📁 Project Structure

- `backend/`: FastAPI application logic and database models.
- `frontend/`: React SPA built with Vite.
- `scripts/`: ETL pipeline and data scripts.
- `pokemon.db`: Local SQLite database (generated after running ETL).
- `start.py`: Utility script to run the full stack.

---
Built with ❤️ for a professional portfolio.
