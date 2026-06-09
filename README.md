# ⚔️ PokéArchitect

**PokéArchitect** is a high-fidelity, mathematically optimized Pokémon team-building and diagnostic platform. Designed for both competitive strategists and casual trainers, it utilizes advanced heuristics and real-time data analytics to help you build the ultimate six-Pokémon roster.

---

## 🚀 Status: PROJECT FINISHED ✅

This project has completed its development lifecycle. All core features including team optimization, deep analytics, secure authentication, and global community features are fully operational and deployed.

### ✨ Key Features
- **Synergy-Driven Builder**: Real-time "Live Analysis" as you build, detecting weaknesses and suggesting tactical reinforcements.
- **Deep Diagnostic Suite**: Advanced radar charts and vulnerability matrices to visualize your team's statistical and type-based performance.
- **Heuristic Intelligence Engine**: Automatically detects team archetypes (e.g., Hyper Offense, Bulky Stall) and provides actionable tactical advice.
- **Global Showcase & Comparison**: Securely save your teams via Google OAuth, share them with the community, and compare them side-by-side with a win-probability simulator.
- **High-Fidelity UI**: A sleek, dark glassmorphic design built for high performance and modern aesthetics.
- **Elite Certificate Export**: Generate and download a professional-grade "Architect Blueprint" of your final team.

---

## 🏗️ System Architecture

PokéArchitect is built with a modern, decoupled **Client-Server Architecture**:

- **Frontend**: React (TypeScript) + Vite + Tailwind CSS. Uses `framer-motion` for fluid animations and `recharts` for complex data visualization.
- **Backend**: FastAPI (Python) + SQLAlchemy. Implements a high-performance heuristic engine for team analysis and recommendations.
- **Database**: PostgreSQL (Production) / SQLite (Local). Stores 1025+ Pokémon (Gens 1-9) with enriched metadata.
- **Deployment**: Frontend hosted on **Vercel**, Backend hosted on **Render**.

---

## 🛠️ Technical Implementation

### Heuristic Intelligence
The system analyzes teams across three dimensions:
1.  **Defensive Synergy**: Calculating cumulative type multipliers to identify critical gaps and immunities.
2.  **Statistical Balance**: Analyzing average Base Stat Totals (BST) and role distribution.
3.  **Meta Relevance**: Cross-referencing team members against common competitive threats and providing specific counters.

### Performance Optimization
- **Lean Deployment**: Optimized for resource-constrained environments (Render Free Tier) by stripping heavy dependencies and utilizing efficient Python workers.
- **CORS-Hardened**: Secure cross-origin communication with strict environment-driven origin validation.
- **Database-Agnostic Schema**: Seamlessly syncs between local development and cloud production environments.

---

## 📂 Project Structure (Summary)
- `backend/`: Core API, authentication, and heuristic logic.
- `frontend/`: React application, UI components, and state management.
- `scripts/`: Data ETL pipelines and database management tools.
- `Procfile` & `render.yaml`: Production deployment configurations.

---

## 🚀 Getting Started

1.  **Backend**: `pip install -r requirements.txt` -> `python start.py`
2.  **Frontend**: `cd frontend && npm install` -> `npm run dev`

---

*PokéArchitect - Engineered for the perfect roster.*
