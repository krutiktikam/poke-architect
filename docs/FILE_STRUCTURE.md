# PokéArchitect Project File Structure

This document provides a map of the PokéArchitect repository, documenting the roles of key directories, architectural boundaries, and conventions for adding new capabilities.

---

## Repository Tree

The block below is generated from `git ls-files`. To regenerate this tree after adding or removing files, run:
```bash
python scripts/gen_file_tree.py
```

<!-- tree:start -->
```text
poke_architect/
├── .github/ # GitHub Actions CI/CD workflows and automated maintenance jobs
│   └── workflows/ # Automated workflows (e.g. keep_alive.yml pinging backend on Render)
│       └── keep_alive.yml
├── Power BI/ # Power BI dashboard reports and battle data modeling artifacts
│   └── pokemon_dv.pbix
├── backend/ # FastAPI application backend, SQLAlchemy models, and Alembic migrations
│   ├── migrations/ # Alembic schema migrations (0001_baseline, 0002_world, 0003_item_effects)
│   │   ├── versions/
│   │   │   └── ... (3 files/subdirs)
│   │   ├── README
│   │   ├── env.py
│   │   └── script.py.mako
│   ├── models/ # Modular SQLAlchemy ORM definitions (models/__init__.py, world.py, evolution.py)
│   │   ├── __init__.py
│   │   ├── evolution.py
│   │   └── world.py
│   ├── routers/ # Modular FastAPI endpoint routers (compendium, encounters, evolutions, etc.)
│   │   ├── compendium.py
│   │   ├── encounters.py
│   │   ├── evolutions.py
│   │   ├── items_extended.py
│   │   ├── locations.py
│   │   └── meta.py
│   ├── __init__.py
│   ├── alembic.ini # Alembic migration configuration pointing to backend/migrations
│   ├── auth.py # Google OAuth 2.0 flow and JWT/session management endpoints
│   ├── database.py # SQLAlchemy engine setup, SessionLocal provider, and get_db dependency
│   ├── http_cache.py # Weak ETag generation, Cache-Control headers, and 304 Not Modified middleware
│   ├── main.py # FastAPI application entry point, CORS config, and root routes
│   ├── ml_recommender.py # Machine learning recommendation heuristic engine for team composition
│   ├── requirements-dev.txt # Pinned development and testing dependencies (pytest, httpx, ruff)
│   ├── requirements.txt # Pinned production dependencies (FastAPI, SQLAlchemy, uvicorn, etc.)
│   ├── schemas.py # Pydantic models for request validation and response serialization
│   ├── start.py # Production boot script running Alembic migrations before starting Uvicorn
│   ├── teams.py # Team persistence, public sharing, and team battle comparison endpoints
│   └── utils.py # Team statistics, type coverage, STAB heuristics, and archetype detectors
├── frontend/ # React 19 + TypeScript + Vite + Tailwind CSS frontend application
│   ├── public/ # Static assets (PWA icons, favicon, web app manifest)
│   │   ├── favicon.svg
│   │   └── icons.svg
│   ├── src/ # React application source code (components, context, pages, api hooks)
│   │   ├── api/ # API client, TanStack Query options, and OpenAPI generated TypeScript types
│   │   │   └── ... (4 files/subdirs)
│   │   ├── assets/
│   │   │   └── ... (3 files/subdirs)
│   │   ├── components/ # UI components (Compendium, Builder, Navigation, Sheet modals)
│   │   │   └── ... (15 files/subdirs)
│   │   ├── context/ # React context providers (AuthContext, TeamContext, VersionContext, VisualQualityContext)
│   │   │   └── ... (11 files/subdirs)
│   │   ├── hooks/
│   │   │   └── ... (1 files/subdirs)
│   │   ├── pages/ # Route views (Builder, Pokedex, Analysis, Analytics, Community, Leaderboard)
│   │   │   └── ... (9 files/subdirs)
│   │   ├── App.css
│   │   ├── App.tsx
│   │   ├── config.ts
│   │   ├── index.css
│   │   ├── main.tsx
│   │   ├── types.ts
│   │   └── vite-pwa.d.ts
│   ├── tests/ # Frontend unit, component, and accessibility test suites (Vitest + MSW)
│   │   ├── e2e/ # Playwright end-to-end integration and Axe accessibility test suites
│   │   │   └── ... (3 files/subdirs)
│   │   ├── fixtures/ # MSW mock API response payloads for unit and component testing
│   │   │   └── ... (1 files/subdirs)
│   │   ├── msw/
│   │   │   └── ... (2 files/subdirs)
│   │   ├── berryDetail.test.tsx
│   │   ├── dataVersion.test.ts
│   │   ├── dehydrateFilter.test.ts
│   │   ├── encounterModal.test.tsx
│   │   ├── evolutionTree.test.tsx
│   │   ├── gameVersionSelector.test.tsx
│   │   ├── heroBackground.test.tsx
│   │   ├── itemBagDrawer.test.tsx
│   │   ├── qualityResolver.test.ts
│   │   ├── serverStatusNotice.test.tsx
│   │   ├── setup.ts
│   │   ├── sheet.test.tsx
│   │   ├── smoke.test.ts
│   │   ├── useBackToClose.test.tsx
│   │   └── versionPersistence.test.tsx
│   ├── .gitignore
│   ├── .npmrc
│   ├── README.md
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json # Frontend NPM dependencies, build scripts, test commands, and size budgets
│   ├── playwright.config.ts # Playwright end-to-end test runner configuration across projects
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vercel.json
│   └── vite.config.ts # Vite configuration with React, Tailwind CSS 4, and Vite PWA plugins
├── scripts/ # Database seeding, CSV ingestion pipelines, and OpenAPI export utilities
│   ├── etl_pipeline.py
│   ├── export_openapi.py # Exports live FastAPI OpenAPI JSON schema to frontend/openapi.json
│   ├── gen_file_tree.py # Generates the file tree block in docs/FILE_STRUCTURE.md
│   ├── migrate_to_postgres.py
│   ├── populate_extended.py # CLI ingestion pipeline importing official PokéAPI CSV data into database
│   ├── populate_items_abilities.py
│   ├── populate_moves_natures.py
│   ├── seed_database.py
│   └── update_meta_data.py
├── tests/ # Backend regression and integration test suites (pytest + FastAPI TestClient)
│   ├── fixtures/ # Isolated CSV fixtures for testing data ingestion and schema migrations
│   │   └── pokeapi_csv/
│   │       └── ... (35 files/subdirs)
│   ├── conftest.py # Pytest configuration with temp SQLite isolation and engine safety guard
│   ├── test_api_phase3.py
│   ├── test_populate_extended.py
│   └── test_team_analysis_stab.py
├── .gitignore # Exclusion rules for local environments, build artifacts, and databases
├── ARCHITECTURE.md # High-level architectural overview linking to detailed system design docs
├── DEBUG_SUMMARY.txt
├── Procfile # Deployment declaration for Render / PaaS web service execution
├── README.md # Primary project encyclopedia, quickstart guide, endpoint listing, and verification
├── package-lock.json
├── package.json
├── render.yaml # Render blueprint declaring API web service, build/start commands, and environment
├── requirements.txt
└── start.py
```
<!-- tree:end -->

---

## Directory Roles & Architecture Boundaries

| Directory | Layer / Purpose | Key Responsibilities |
| :--- | :--- | :--- |
| `backend/` | Application Server | FastAPI application setup, middleware, configuration, routing, and database sessions. |
| `backend/models/` | Data Persistence | SQLAlchemy 2.0 ORM declarations partitioned into `__init__.py`, `world.py`, and `evolution.py`. |
| `backend/routers/` | HTTP Presentation | Modular endpoint routers exposing read-only encyclopedia, auth, and team analysis APIs. |
| `backend/migrations/`| Schema Evolution | Alembic revision files and runtime environment configuring database migrations. |
| `frontend/src/` | Client Application | React 19 UI with TanStack Query data fetching, Zustand/Context state, and Tailwind CSS. |
| `frontend/src/api/` | Client Data Layer | Typed queries, data-version cache decorators, and auto-generated OpenAPI type contracts. |
| `frontend/src/components/` | Presentation UI | Interactive compendium drawers, modal sheets, and battle analysis widgets. |
| `frontend/src/context/` | Client State | React providers managing session authentication, team composition, game versions, and visual power modes. |
| `frontend/tests/` | Frontend Testing | Vitest unit/component tests, accessibility checks (`jest-axe`), and Mock Service Worker (MSW) handlers. |
| `frontend/tests/e2e/` | Browser Integration | Playwright end-to-end integration and Axe accessibility audits across desktop and mobile viewports. |
| `scripts/` | Tooling & Pipeline | Offline CSV ingestion (`populate_extended.py`), OpenAPI export, and maintenance utilities. |
| `tests/` | Backend Testing | Pytest test suites, temp SQLite database fixtures, and ingestion verification tests. |
| `docs/` | Documentation | Architecture specifications, system design, and repository guidelines. |

---

## "Where Do I Add...?" Reference Guide

When introducing new functionality to PokéArchitect, use this quick guide to locate the right files to create and edit:

| Goal / Task | File / Directory Locations | Required Steps & Conventions |
| :--- | :--- | :--- |
| **New API Endpoint** | `backend/routers/<domain>.py`<br>`backend/main.py` | 1. Implement route in matching router (or create new router in `backend/routers/`).<br>2. Mount router in `backend/main.py`.<br>3. Check `backend/http_cache.py`: if read-only, ensure caching or add to `EXCLUDED_PREFIXES` if dynamic.<br>4. Run `python scripts/export_openapi.py` and `npm run gen:api` in `frontend`. |
| **New Model + Migration** | `backend/models/<domain>.py`<br>`backend/migrations/versions/` | 1. Declare SQLAlchemy model inheriting from `backend.database.Base`.<br>2. Export model in `backend/models/__init__.py`.<br>3. Generate migration: `alembic -c backend/alembic.ini revision -m "add_table_name"`.<br>4. Implement `upgrade()` and `downgrade()`. Run `alembic -c backend/alembic.ini upgrade head`. |
| **New Ingestion Stage** | `scripts/populate_extended.py`<br>`tests/test_populate_extended.py` | 1. Add stage name to `STAGE_DEPENDENCY_ORDER` and parser flags in `main()`.<br>2. Register required CSVs in `preflight_check()`.<br>3. Implement idempotent `populate_<stage>()` function with upsert logic.<br>4. Add fixture files to `tests/fixtures/pokeapi_csv/` and test in `tests/test_populate_extended.py`. |
| **New Frontend Component** | `frontend/src/components/<Domain>/`<br>`frontend/tests/` | 1. Create component with Tailwind styling and Framer Motion transitions.<br>2. Wrap modal/drawer components in the reusable `Sheet` primitive with `useBackToClose`.<br>3. Lazy-load heavy drawers with `React.lazy` and `Suspense`.<br>4. Write unit/accessibility test with Vitest + `@testing-library/react` + `jest-axe`. |
| **New Frontend Test** | `frontend/tests/<feature>.test.tsx`<br>`frontend/tests/e2e/<feature>.spec.ts` | 1. For component logic: add Vitest test file in `frontend/tests/` using MSW handlers.<br>2. For end-to-end user flows: add Playwright test in `frontend/tests/e2e/`. |
| **New Backend Test** | `tests/test_<feature>.py` | 1. Create test file in `tests/`.<br>2. Use `client` and `db_session` fixtures from `tests/conftest.py` (which guarantees temp SQLite isolation).<br>3. Run `pytest tests/test_<feature>.py -v`. |
