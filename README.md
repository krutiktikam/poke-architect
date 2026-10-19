# ⚔️ PokéArchitect

**PokéArchitect** is a high-fidelity, mathematically optimized Pokémon Encyclopedia and Battle Analytics platform. Evolving from an advanced competitive team builder into a full game-aware compendium, PokéArchitect unifies comprehensive mainline game data—including over 114,000 wild encounter records, multi-branching evolution graphs, 2,200+ items organized by bag pocket, and game-version filtering—with deep battle diagnostics, archetype detection, and win-probability simulation.

---

## 🗺️ Project Roadmap & Phase Status

| Phase | Milestone | Status |
| :--- | :--- | :--- |
| **Phase 1** | Database Model Expansion & Alembic Migrations | `Complete` ✅ |
| **Phase 2** | High-Performance CSV Ingestion & Preflight Validation | `Complete` ✅ |
| **Phase 3** | Extended FastAPI Routers, Indexes & ETag Caching | `Complete` ✅ |
| **Phase 4** | Frontend Game-Aware Views, Evolution Trees & Item Drawers | `In Progress` ⏳ (NEXT) |
| **Phase 5** | Mobile (Capacitor) & Desktop (Tauri) Distribution | `Planned` 📋 |

---

## 📊 Ingested Dataset Metrics

The platform is backed by an exhaustive, verified dataset imported from PokéAPI / Veekun canonical data sources:

| Entity / Resource | Record Count | Description |
| :------------------------- | :----------- | :------------------------------------------------------------------ |
| **Wild Encounters** | 114,780 | Game-specific wild encounters across encounter methods and rate slots |
| **Encounter Condition Maps** | 109,058 | Granular weather, time-of-day, season, and radar condition mappings |
| **Items** | 2,223 | Complete mainline item catalog with bag pockets, categories, and costs |
| **Location Areas** | 1,539 | Sub-locations and specific areas where wild Pokémon reside |
| **Locations** | 1,104 | Canonical mainline Pokémon world locations across all regions |
| **Pokémon Species** | 1,025 | Species records linking National Dex entries, evolution chains, & forms |
| **Directed Evolution Edges** | 676 | Exhaustive branch-level evolution requirements, triggers, items, and levels |
| **Berries** | 68 | Growth times, firmness, soil dryness rates, and flavor profiles |
| **Encounter Methods** | 66 | Walking, surfing, fishing (old/good/super rod), rock smash, headbutt, etc. |
| **Item Categories** | 54 | Granular item categorizations mapped into canonical player bag pockets |
| **Game Versions** | 53 | Mainline game releases (Red, Blue, Emerald, Platinum, Scarlet, Violet...) |
| **Version Groups** | 32 | Clustered release editions sharing encounter distributions and mechanics |

---

## ✨ Key Features

- **Game-Aware Encyclopedia**: Explore complete wild encounters by location area and game version, multi-stage branching evolution trees with triggers and requirements, and a categorized item pocket drawer.
- **Synergy-Driven Builder**: Real-time "Live Analysis" as you build, detecting weaknesses and suggesting tactical reinforcements.
- **Deep Diagnostic Suite**: Advanced radar charts and vulnerability matrices to visualize your team's statistical and type-based performance.
- **Heuristic Intelligence Engine**: Automatically detects team archetypes (e.g., Hyper Offense, Bulky Stall) and provides actionable tactical advice.
- **Global Showcase & Comparison**: Securely save your teams via Google OAuth, share them with the community, and compare them side-by-side with a win-probability simulator.
- **High-Fidelity UI**: A sleek, dark glassmorphic design built for high performance and modern aesthetics.
- **Elite Certificate Export**: Generate and download a professional-grade "Architect Blueprint" of your final team.

---

## 🏗️ System Architecture

PokéArchitect follows a modern client-server architecture. For detailed architecture diagrams, data flows, and deployment information, please see [ARCHITECTURE.md](ARCHITECTURE.md).

**Overview**:
- **Frontend**: React (TypeScript) + Vite + Tailwind CSS
- **Backend**: FastAPI (Python 3.9+) + SQLAlchemy 2.x
- **Database**: PostgreSQL (Supabase / Render in Production) / SQLite (Local Development)
- **Deployment**: Frontend on Vercel, Backend on Render

---

## 🛠️ Technical Implementation

### Heuristic Intelligence
The system analyzes teams across three dimensions:
1. **Defensive Synergy**: Calculating cumulative type multipliers to identify critical gaps and immunities.
2. **Statistical Balance**: Analyzing average Base Stat Totals (BST) and role distribution.
3. **Meta Relevance**: Cross-referencing team members against common competitive threats and providing specific counters.

### High-Performance Data Pipeline & Caching
- **CSV-First Ingestion Design**: Zero HTTP rate-limiting by downloading static PokeAPI/Veekun CSV datasets. Fast-fail HTTP preflight check (`preflight_check`) prevents broken mid-run migrations on missing upstream files.
- **Dialect-Specific Idempotent UPSERT**: Robust `ON CONFLICT DO UPDATE` engine using PostgreSQL dialect for Supabase/Render and SQLite fallback for local development. Chunked batch operations (`BATCH_SIZE = 1,000 - 5,000`).
- **HTTP 304 ETag Caching**: Smart weak ETags computed over payloads and salted with `APP_API_VERSION` / `GIT_SHA` / `RENDER_GIT_COMMIT`. Returns HTTP 304 Not Modified without touching the database when client revalidates (`If-None-Match`).
  - `Cache-Control: public, max-age=86400` on encyclopedia endpoints.
  - `Cache-Control: no-cache` on `/api/meta/data-version`.
- **Query Optimization & Indexing**: N+1 queries eliminated via SQLAlchemy `selectinload` and `joinedload`. Composite compound indexes optimized for hot paths:
  - `encounters(pokemon_id, version_id)`
  - `encounters(location_area_id, version_id)`
  - `evolutions(from_species_id)`
- **Lean Deployment**: Optimized for resource-constrained environments (Render Free Tier) by stripping heavy dependencies and utilizing efficient Python workers.
- **CORS-Hardened**: Secure cross-origin communication with strict environment-driven origin validation.

---

## 📂 Project Structure
- `backend/`: Core API, authentication, and heuristic logic
- `frontend/`: React application, UI components, and state management
- `scripts/`: Data ETL pipelines and database management tools
- `ARCHITECTURE.md`: Detailed system architecture documentation
- `Procfile` & `render.yaml`: Production deployment configurations

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.9+)
- Git

### Backend Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/poke-architect.git
cd poke-architect

# Backend setup
cd backend
pip install -r requirements.txt
cp .env.example .env  # Edit .env with your configuration
python start.py
```

### Frontend Setup
```bash
# Frontend setup
cd frontend
npm install
cp .env.example .env  # Edit .env with your configuration
npm run dev
```

### Environment Variables
Create `.env` files in both `backend/` and `frontend/` directories:

**Backend (.env)**:
```
SECRET_KEY=your-secret-key-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
DATABASE_URL=postgresql://user:password@localhost/poke_architect
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

**Frontend (.env)**:
```
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### Database Migrations & Data Ingestion
1. **Apply Database Migrations (Alembic)**:
   ```bash
   alembic -c backend/alembic.ini upgrade head
   ```
2. **Run CSV Ingestion Pipeline (Preflight Validation + Batch Upsert)**:
   ```bash
   # Ingest full canonical dataset (all 12+ entities) from PokeAPI/Veekun CSVs:
   python scripts/populate_extended.py --all --ref master

   # Populate item holdable flags (dry-run with diff report to preview changes safely):
   python scripts/populate_extended.py --item-flags --dry-run --item-flags-report diff.csv

   # Ingest/update item holdable flags against target database:
   python scripts/populate_extended.py --item-flags

   # Or run specific stages individually:
   python scripts/populate_extended.py --stages items,item_flags,item_effects,berries,locations,encounters,evolutions
   ```
   > [!NOTE]
   > **Held-Item Picker Definition (`is_holdable`)**: In PokéArchitect, `is_holdable` means "worth offering in a held-item picker" (items with tactical/combat effects in battle), rather than PokéAPI's bag-attachment flag. The rule evaluates:
   > `rule = (holdable-active/passive OR category in INCLUDE set OR forced-include) - forced-exclude - (ball / medicine / key pockets)`

   > [!WARNING]
   > Ingestion commands write directly to whatever database `DATABASE_URL` points at in your environment or `backend/.env`. Always verify your active connection target and execute with `--dry-run` first before modifying production databases.

   > [!NOTE]
   > The pipeline automatically runs a preflight check to verify remote CSV URLs before opening database sessions, gracefully falls back to GitHub main/master refs, and uses dialect-specific upserts (PostgreSQL / SQLite) for idempotent re-runs.

---

## 📜 Available Scripts

### Backend
- `python start.py` - Start the development server (FastAPI + Uvicorn)
- `python scripts/populate_extended.py --all --ref master` - Run complete CSV ingestion pipeline
- `python scripts/populate_extended.py --item-flags` - Ingest/update battle-holdable item flags (`is_holdable`)
- `python -m pytest` - Run automated test suite (API Phase 3, ingestion unit & integration tests)
- `pip install -r backend/requirements.txt` - Install backend Python dependencies
- `alembic -c backend/alembic.ini upgrade head` - Apply database schema migrations

### Frontend
- `npm run dev` - Start development server at http://localhost:5173
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint for code quality
- `npm test` - Run tests

---

## 🔌 API Endpoints

Interactive Swagger UI documentation is available at `/docs` when the backend is running.

### Encyclopedia & Game-Aware Endpoints (Cached with HTTP 304 ETags)
- `GET /api/pokemon/{id}/encounters` - Wild encounters grouped by location area and game version with active conditions
- `GET /api/pokemon/{id}/evolutions` - Full branching evolution chain, triggers (level, trade, item), and requirements
- `GET /api/locations` - Paginated locations with region filtering (`limit`, `offset`, `region_id`)
- `GET /api/locations/{id}` - Location details with location areas and wild encounter distributions
- `GET /api/items/pockets` - Canonical item pockets containing grouped item categories and items (including `is_holdable` flag and short effect summary)
- `GET /api/berries` - Full berry compendium with firmness, soil dryness, growth times, and flavor ratings
- `GET /api/versions` - Game versions ordered by version group order and ID
- `GET /api/regions` - World regions (Kanto, Johto, Hoenn, Sinnoh, Unova, Kalos, Alola, Galar, Paldea)
- `GET /api/meta/data-version` - Ingestion timestamp and data version metadata (`Cache-Control: no-cache` with revalidation)

### Core Pokémon Endpoints
- `GET /api/health` - Health check endpoint
- `GET /api/pokemon` - Get Pokémon list with filtering options
- `GET /api/pokemon/batch` - Get multiple Pokémon by IDs
- `GET /api/pokemon/{id}` - Get single Pokémon details
- `GET /api/moves` - Get list of moves with filtering (type, damage class)
- `GET /api/moves/{id}` - Get specific move details
- `GET /api/natures` - Get list of natures with filtering
- `GET /api/natures/{id}` - Get specific nature details
- `GET /api/abilities` - Get list of abilities with filtering
- `GET /api/abilities/{id}` - Get specific ability details
- `GET /api/items` - Get list of items with filtering (`?holdable=true|false`, `?sort=name`, pagination)
- `GET /api/items/{id}` - Get specific item details (including `is_holdable` and `effect`)
- `GET /api/analytics/global` - Get global statistics
- `GET /api/analytics/export/pokemon` - Export Pokémon data as CSV
- `GET /api/analytics/export/teams` - Export teams data as CSV

### Authentication Endpoints
- `GET /auth/login` - Initiate Google OAuth flow
- `GET /auth/callback` - Handle OAuth callback
- `GET /auth/me` - Get current user information
- `POST /auth/logout` - Logout user

### Team Endpoints
- `POST /api/team-analysis` - Analyze team composition and get recommendations
- `POST /api/compare-teams` - Compare two teams and get win probability
- `POST /teams` - Save a team
- `GET /teams` - Get user's saved teams
- `GET /teams/{id}` - Get specific team details
- `PUT /teams/{id}` - Update a team
- `DELETE /teams/{id}` - Delete a team

---

## 🧪 Testing

The project includes unit, integration, and API tests covering database models, ETag caching semantics, and CSV ingestion:

### Running Backend Tests
```bash
# Run all tests with pytest
python -m pytest

# Run specific test suites:
python -m pytest tests/test_api_phase3.py
python -m pytest tests/test_populate_extended.py
```
*Current test suite: 26 passed test cases covering Phase 3 routers, caching behaviors, and preflight validation.*

### Running Frontend Tests
```bash
cd frontend
npm test
```

---

## 🤝 Contribution Guidelines

We welcome contributions to PokéArchitect! Please follow these guidelines:

1. Fork the repository
2. Create a new branch for your feature (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Ensure your code follows the existing style and conventions
5. Add tests for new functionality where applicable
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Pokémon data sourced from various community projects
- Built with ❤️ for the Pokémon competitive community
- Special thanks to all contributors and users

---

*PokéArchitect - Engineered for the perfect roster.*
