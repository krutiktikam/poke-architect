# PokéArchitect Backend

The REST API and analytics engine for PokéArchitect, built with FastAPI, SQLAlchemy 2.0, Alembic, and PostgreSQL / SQLite. Exposes game-aware Pokémon encyclopedia data, heuristic battle advice, team management, and Google OAuth authentication.

---

## Getting Started

### Prerequisites
- **Python**: 3.11+ (Render uses Python 3.11.0; local development tested on Python 3.13.5)
- **Virtual Environment**: `.venv` recommended

### Installation & Local Setup
```bash
# From repository root, create and activate virtual environment
python -m venv .venv

# Windows PowerShell:
.venv\Scripts\Activate.ps1
# Linux/macOS:
source .venv/bin/activate

# Install production and development dependencies
pip install -r requirements.txt -r backend/requirements-dev.txt

# Run database schema migrations
alembic -c backend/alembic.ini upgrade head

# Start local Uvicorn development server
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```
Interactive API documentation will be available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

## Environment Variables

Configure environment variables in `.env` in the repository root. **Never commit real secrets or production credentials.**

| Variable Name | Description | Default / Example Value |
| :--- | :--- | :--- |
| `DATABASE_URL` | SQLAlchemy connection string | `sqlite:///./pokemon.db` (local)<br>`postgresql://user:pass@host:5432/db` (prod) |
| `SECRET_KEY` | Session signing and JWT secret key | `your-secret-key-change-it-in-prod` |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID | `your-google-client-id.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 Client Secret | `your-google-client-secret` |
| `GOOGLE_REDIRECT_URI` | Full callback URL registered in Google Cloud Console | `http://localhost:8000/api/auth/google/callback` |
| `FRONTEND_URL` | Frontend origin for OAuth redirect resolution | `http://localhost:5173` |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins or `*` | `http://localhost:5173,https://poke-architect.vercel.app` |
| `APP_API_VERSION` | API version string for ETag cache busting | `v1.0.0` (falls back to `GIT_SHA` / `RENDER_GIT_COMMIT`) |
| `PORT` | Port to bind for production web servers (e.g. Render) | `8000` |

---

## Database Migrations & Ingestion

### Migrations (Alembic)
```bash
# Apply all pending migrations to the active DATABASE_URL
alembic -c backend/alembic.ini upgrade head

# Create a new migration revision
alembic -c backend/alembic.ini revision -m "describe_schema_change"
```

### Data Ingestion Pipeline
```bash
# Ingest all data from official PokéAPI CSVs (downloads if not cached)
# WARNING: Writes directly to whatever DATABASE_URL points at!
python scripts/populate_extended.py --all

# Dry run mode to verify counts without committing changes
python scripts/populate_extended.py --all --dry-run

# Ingest from a local CSV directory pinned to a specific Git commit SHA
python scripts/populate_extended.py --all --csv-dir ./local_csvs --ref master
```

---

## Testing & Static Analysis

```bash
# Run backend test suite with Pytest (safely isolated in temp SQLite)
pytest tests/ -v

# Run Ruff static checks for undefined names and imports
ruff check backend scripts tests --select F821,F401,F811

# Export OpenAPI schema for frontend type generation (uses scratch SQLite DB)
python scripts/export_openapi.py
```

---

## Folder Map

```text
backend/
├── migrations/             # Alembic migration revisions
│   ├── versions/           # 0001_baseline, 0002_world, 0003_item_effects
│   ├── env.py              # Alembic environment and SQLAlchemy metadata hook
│   └── script.py.mako      # Migration file template
├── models/                 # SQLAlchemy 2.0 ORM models
│   ├── __init__.py         # Aggregator & core models (Pokemon, Move, Item, User)
│   ├── world.py            # Regional models (Region, Location, Encounter, DataMeta)
│   └── evolution.py        # Evolution models (EvolutionChain, EvolutionTrigger, Evolution)
├── routers/                # Modular FastAPI route controllers
│   ├── compendium.py       # Abilities, items, moves, natures
│   ├── encounters.py       # Location encounters filtered by game version
│   ├── evolutions.py       # Directed species evolution tree
│   ├── items_extended.py   # Item pockets, categories, and berries
│   ├── locations.py        # Regional location directories
│   └── meta.py             # Data version and cache invalidation metadata
├── alembic.ini             # Alembic configuration
├── auth.py                 # Google OAuth 2.0 flow & authentication endpoints
├── database.py             # Engine initialization, SessionLocal, and get_db dependency
├── http_cache.py           # ETag computation, Cache-Control, and 304 middleware
├── main.py                 # App entry point, middleware assembly, root routers
├── ml_recommender.py       # Heuristic machine learning team recommender
├── requirements-dev.txt    # Pinned test & lint dependencies (pytest, httpx, ruff)
├── requirements.txt        # Production runtime dependencies
├── schemas.py              # Pydantic request/response schemas
├── start.py                # Production entry script executing migrations on boot
├── teams.py                # Team persistence, sharing, and battle simulations
└── utils.py                # Battle intelligence, STAB, type coverage, and stats
```

---

## Common Problems & Troubleshooting

### 1. Running Tests Without Touching Production Database
`tests/conftest.py` automatically binds `DATABASE_URL` to a temporary SQLite file before `backend.main` or `backend.database` can be imported. A runtime guard immediately aborts the test run if `engine.url` is not SQLite.

### 2. Render Deployment Commands
Render web services execute the command declared in `render.yaml` and `Procfile`:
```bash
alembic -c backend/alembic.ini upgrade head && gunicorn -w 1 -k uvicorn.workers.UvicornWorker backend.main:app
```
Migrations run automatically on boot before traffic is served.

### 3. PostgreSQL URL Dialect Normalization
Cloud providers like Render and Supabase often format database connection strings with the legacy `postgres://` scheme. `backend/database.py` automatically normalizes this to `postgresql://` and enforces `sslmode=require` as required by SQLAlchemy 2.0.
