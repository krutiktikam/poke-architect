# PokéArchitect System Design & Technical Specification

## 1. Overview, Goals & Non-Goals

### Overview
PokéArchitect is a full-stack, game-aware Pokémon Encyclopedia and Battle Analytics platform. It unifies a relational database of mainline Pokémon knowledge (114,000+ wild encounter records, multi-branching evolution graphs, 2,200+ bag items, berries, locations, and game versions) with real-time heuristic team-building intelligence and win-probability analysis.

### System Goals
- **Game-Aware Context**: Allow users to filter wild obtainability, encounter rates, and location encounters by specific mainline Pokémon games (Red through Scarlet/Violet) or view aggregate cross-game encounter availability.
- **Battle Intelligence**: Provide instant team synergy feedback, STAB optimization alerts, physical/special move split warnings, offensive type coverage audits, and simulated win-probability against archetypal teams.
- **Bandwidth & Latency Efficiency**: Minimize database load and client network payload sizes through weak ETag HTTP caching, server 304 Not Modified short-circuits, and client-side IndexedDB persistence.
- **Responsive & Accessible**: Support seamless navigation across desktop and mobile devices with touch gestures, browser history back-button integration (`useBackToClose`), bottom sheets, high-contrast states, and automated WCAG 2.1 AA compliance.
- **Hardware-Aware Rendering**: Provide adaptive visual quality tiers (`auto`, `high`, `low`) that unmount heavy WebGL / canvas elements on low-power devices, reduced-motion preferences, or hidden browser tabs.

### Non-Goals
- **In-Browser Battle Engine**: PokéArchitect does not implement an interactive turn-by-turn battle simulator (like Pokémon Showdown). It evaluates static team composition synergy and projected advantages.
- **Direct Rom-Hacking or Save-File Editing**: The platform operates purely as an encyclopedia and team builder; it does not read, export, or modify binary `.sav` files.
- **Real-Time Multiplayer Lobby**: Team sharing is asynchronous (public team links and leaderboards) rather than live socket-based peer-to-peer rooms.

---

## 2. High-Level System Architecture

The PokéArchitect deployment topology consists of three primary runtime tiers plus an offline data ingestion pipeline:

```mermaid
flowchart TD
    subgraph ClientTier["Client Tier (User Device)"]
        Browser["Web Browser / Installed PWA"]
        SW["Service Worker (Precached App Shell)"]
        IDB["IndexedDB (React Query Cache)"]
        Browser <--> SW
        Browser <--> IDB
    end

    subgraph HostingTier["Static Hosting (Vercel)"]
        VercelCDN["Vercel Edge Network"]
        StaticAssets["Vite SPA Bundle (HTML, CSS, JS)"]
        VercelCDN --> StaticAssets
    end

    subgraph APITier["Application API Tier (Render)"]
        Gunicorn["Gunicorn Process Manager"]
        FastAPIApp["FastAPI Application"]
        ETagCache["HttpCacheMiddleware (ETag / 304)"]
        Gunicorn --> FastAPIApp
        FastAPIApp --> ETagCache
    end

    subgraph DatabaseTier["Persistence Tier (Supabase)"]
        PostgresDB[("PostgreSQL 15 Database")]
    end

    subgraph ExternalSources["External Data Sources"]
        PokeAPIRepo["PokeAPI CSV Repository (GitHub)"]
        GoogleAuth["Google Identity Services (OAuth 2.0)"]
    end

    subgraph IngestionPipeline["Ingestion Pipeline (Local / CI)"]
        ETLScript["scripts/populate_extended.py"]
    end

    Browser -- "1. Fetches App Shell" --> VercelCDN
    Browser -- "2. Authenticates via OAuth" --> GoogleAuth
    Browser -- "3. REST API Requests (ETag / If-None-Match)" --> ETagCache
    ETagCache -- "4. Reads / Writes Relational Entities" --> PostgresDB
    GoogleAuth -- "5. OAuth Callback & User Info" --> FastAPIApp

    PokeAPIRepo -- "A. Clones / Downloads CSVs at pinned ref" --> ETLScript
    ETLScript -- "B. Preflights, Validates, and Upserts Data" --> PostgresDB
```

---

## 3. Backend Architecture & Design

### Layering & Routers
The backend is structured into clear architectural layers:
1. **Presentation / Routing Layer** (`backend/routers/`, `backend/auth.py`, `backend/teams.py`): Parses HTTP requests, validates payloads with Pydantic schemas, and serializes responses.
   - `routers/compendium.py`: Abilities, items (supports `?holdable=true|false` and `?sort=name`), moves, and natures.
   - `routers/encounters.py`: Location encounters aggregated by area and filtered by `version_id`.
   - `routers/evolutions.py`: Directed species evolution trees.
   - `routers/items_extended.py`: Bag pockets (including `is_holdable` item indicators), categories, items, effects, and berries.
   - `routers/locations.py`: Regions and location directories.
   - `routers/meta.py`: Data version metadata (`/api/meta/data-version`).
2. **Business / Analytics Layer** (`backend/utils.py`, `backend/ml_recommender.py`): Pure domain logic computing team statistics, type weakness/resistance matrices, STAB warnings, stat optimization checks, and archetype classifications.
3. **Caching / Middleware Layer** (`backend/http_cache.py`): Intercepts GET requests, checks `If-None-Match`, and computes weak ETags salted with the current data version.
4. **Data Access / ORM Layer** (`backend/database.py`, `backend/models/`): SQLAlchemy 2.0 declarative models managing connections, session scopes, and transactions.

### Query Strategy & Encounter Aggregation
- **Query Bounds & Joins**: Endpoints avoid N+1 query traps by using eager joins or batching queries. For example, `/api/items/pockets` loads all pockets and categories in a single bounded query.
- **Encounter Aggregation at Query Time**: Rather than storing pre-nested regional JSON blobs, encounters are stored as normalized relational rows in `encounters`. When `/api/pokemon/{id}/encounters` is called:
  1. The database queries encounter records filtered by `pokemon_id` and optional `version_id`.
  2. The router groups flat encounter rows in-memory into: `Region -> Location -> LocationArea -> Encounters`.
  3. Condition values (`night`, `swarm`, `radar`) are collapsed into readable condition strings.
  4. Encounter spots with identical parameters are merged to compute consolidated probability percentages.

---

## 4. Database Schema & Data Model

The relational database schema is partitioned into modular SQLAlchemy models across `backend/models/`.

```mermaid
erDiagram
    REGIONS ||--o{ LOCATIONS : contains
    LOCATIONS ||--o{ LOCATION_AREAS : divides
    LOCATION_AREAS ||--o{ ENCOUNTERS : spots
    VERSIONS ||--o{ ENCOUNTERS : occurs_in
    VERSION_GROUPS ||--o{ VERSIONS : groups
    REGIONS ||--o{ VERSION_GROUPS : associated_with
    ENCOUNTER_METHODS ||--o{ ENCOUNTERS : method
    ENCOUNTERS ||--o{ ENCOUNTER_CONDITION_VALUE_MAP : conditioned_by
    ENCOUNTER_CONDITION_VALUES ||--o{ ENCOUNTER_CONDITION_VALUE_MAP : maps
    ENCOUNTER_CONDITIONS ||--o{ ENCOUNTER_CONDITION_VALUES : categorizes

    POKEMON ||--o{ ENCOUNTERS : wild_spawns
    POKEMON_SPECIES ||--o{ POKEMON : forms
    EVOLUTION_CHAINS ||--o{ POKEMON_SPECIES : chains
    POKEMON_SPECIES ||--o{ EVOLUTIONS : evolves_to
    EVOLUTION_TRIGGERS ||--o{ EVOLUTIONS : triggered_by

    ITEM_POCKETS ||--o{ ITEM_CATEGORIES : contains
    ITEM_CATEGORIES ||--o{ ITEMS : organizes
    ITEMS ||--o| ITEM_EFFECTS : described_by
    ITEMS ||--o| BERRIES : item_link
    BERRY_FIRMNESSES ||--o{ BERRIES : firmness
    BERRIES ||--o{ BERRY_FLAVOR_MAP : exhibits
    BERRY_FLAVORS ||--o{ BERRY_FLAVOR_MAP : flavor

    USERS ||--o{ SAVED_TEAMS : creates
    DATA_META {
        string key PK
        string value
    }
```

### Core Entities
- **Versions & World**: `regions`, `version_groups`, `versions`, `locations`, `location_areas`.
- **Encounters**: `encounters`, `encounter_methods`, `encounter_conditions`, `encounter_condition_values`, `encounter_condition_value_map`. Preserves integer `chance` spawn probabilities and retains `NULL` chance for gift and static encounters.
- **Evolutions**: `pokemon_species`, `evolution_chains`, `evolution_triggers`, `evolutions`. Stores directed graph edges containing target species, trigger IDs, minimum levels, held items, evolution items, time of day, and happiness.
- **Bag & Items**: `item_pockets` (8 mainline pockets), `item_categories`, `items` (including `is_holdable` boolean indicating battle-relevant held items), `item_effects` (short effect summary and detailed prose).
- **Berries**: `berries`, `berry_firmnesses`, `berry_flavors`, `berry_flavor_map` (potency values for Spicy, Dry, Sweet, Bitter, Sour).
- **Data Versioning**: `data_meta` key-value table tracking `pokeapi_ref`, `ingested_at`, and `schema_revision`.

---

## 5. High-Performance Data Pipeline

The data ingestion script [`scripts/populate_extended.py`](file:///C:/Users/Krutik/CODING/01_Live_WebApps/poke_architect/scripts/populate_extended.py) downloads and ingests official PokéAPI CSV tables into the database.

### Dependency Sequence
Ingestion stages must execute in strict dependency order:
```text
reference -> pockets -> items -> item_flags -> item_effects -> berries -> locations -> encounter_meta -> encounters -> evolutions
```

### Item Holdable Ingestion Stage (`populate_item_flags`)
- **Definition of `is_holdable`**: In PokéArchitect, `is_holdable` strictly denotes an item that is **"worth offering in a held-item picker"**—meaning it provides an active, passive, or tactical battle effect when held by a Pokémon during combat. This deliberately distinguishes it from PokéAPI's native `holdable` flag, which merely denotes bag-level attachability (and inappropriately includes Poké Balls and Potions while omitting battle berries and modern post-Gen 4 held items).
- **Rule Formulation**:
  ```text
  rule = (flag holdable-active/passive OR category in INCLUDE set OR forced-include)
         - forced-exclude
         - (ball / medicine / key-item pockets)
  ```
- **Included Categories**:
  - `held-items` (Assault Vest, Heavy-Duty Boots, Booster Energy, Rocky Helmet, Eviolite, etc.)
  - `choice` (Choice Band, Choice Scarf, Choice Specs)
  - `bad-held-items` (Flame Orb, Toxic Orb, Iron Ball, Sticky Barb)
  - `plates` (Flame Plate, Pixie Plate, etc.)
  - `species-specific` (Light Ball, Thick Club, Soul Dew, Drives, Rusted Sword/Shield)
  - `type-enhancement` (Black Belt, Charcoal, Magnet, Mystic Water, etc.)
  - `jewels` (Fire Gem, Normal Gem, etc.)
  - `mega-stones` (Charizardite X, Gengarite, etc.)
  - `memories` (Silvally RKS memory drives)
  - Combat berry categories in the `berries` pocket: `medicine` (Lum, Sitrus, Oran), `other` (Kee, Maranga, Enigma), `in-a-pinch` (Liechi, Salac, Custap), `picky-healing` (Figy, Wiki), `type-protection` (Yache, Chople, Roseli).
- **Excluded Pockets**: `pokeballs`, `medicine`, `key`.
- **Explicit Overrides**:
  - `HELD_ITEM_FORCED_EXCLUDE`: Non-battle training items (`exp-share`, `lucky-egg`, `amulet-coin`, `soothe-bell`, `everstone`, etc.), contest scarves (`red-scarf`, etc.), form-change nectars, and Wonder Launcher items (`pass-orb`).
  - `HELD_ITEM_FORCED_INCLUDE`: Individual battle-relevant overrides if any items reside in non-standard categories.
- **Reporting & Dry-Run**:
  The stage supports generating a diff CSV of all items changing state:
  ```bash
  # Step 1: Run migration
  alembic -c backend/alembic.ini upgrade head

  # Step 2: Validate with dry-run and write audit diff report
  python scripts/populate_extended.py --item-flags --dry-run --item-flags-report diff.csv

  # Step 3: Populate target database
  python scripts/populate_extended.py --item-flags
  ```
  > [!WARNING]
  > The pipeline script writes directly to whichever database `DATABASE_URL` points at in your environment or `backend/.env`. Always verify target database credentials and run `--dry-run` first before applying migrations or ingestion scripts.

### Preflight Verification & Hardening
1. **Preflight Check**: Before opening database sessions or starting transaction blocks, `preflight_check()` issues HTTP HEAD/GET requests against the GitHub raw CSV endpoints for the specified `--ref`. If any CSV returns HTTP 404 or connection failures, the pipeline halts immediately.
2. **Fast-Fail on 4xx**: The pipeline does not retry client errors (4xx), except 408 (Request Timeout) and 429 (Rate Limit). A 404 error raises `FileNotFoundError` immediately.
3. **Idempotent Upserts**: Stages use SQL `ON CONFLICT (...) DO UPDATE` or pre-loaded lookup sets to guarantee that re-running `populate_extended.py --all` multiple times produces identical row counts without duplicate key errors.
4. **Data Version Emission**: Upon completing an ingestion run, the script records the Git commit ref and ISO timestamp in `data_meta`, automatically triggering cache busting across the platform.

---

## 6. HTTP Caching & Invalidation Architecture

To achieve high throughput on free-tier hosting, read-only encyclopedia requests are cached using weak HTTP ETags and browser IndexedDB caching:

```mermaid
sequenceDiagram
    autonumber
    actor Client as Web Browser / Client
    participant MW as HttpCacheMiddleware
    participant DB as Supabase PostgreSQL

    Note over Client, DB: First Request (Cold Cache)
    Client->>MW: GET /api/pokemon/25/encounters?version_id=1
    MW->>DB: Resolves current data_version ('master:2026-10-18T10:44:44')
    MW->>DB: Executes route handler & queries encounter data
    MW->>MW: Computes ETag: W/"sha256(v1.0.0:master:...)"
    MW-->>Client: 200 OK<br/>ETag: W/"..."<br/>Cache-Control: public, max-age=86400, stale-while-revalidate=604800

    Note over Client, DB: Subsequent Request (Revalidation)
    Client->>MW: GET /api/pokemon/25/encounters?version_id=1<br/>If-None-Match: W/"..."
    MW->>MW: Matches ETag in-memory (60s data_version cache)
    MW-->>Client: 304 Not Modified (Zero DB Queries)
```

### Key Caching Rules
- **Weak ETag Salt**: `ETag = W/"sha256(APP_API_VERSION + ':' + data_version + ':' + path + '?' + query)[:16]"`.
- **Cache-Control Policy**: `public, max-age=86400, stale-while-revalidate=604800` (24h browser cache, 7-day stale revalidation).
- **Excluded Endpoints**: Dynamic endpoints (`/api/auth/*`, `/api/teams/*`, `/api/team-analysis`, `/api/compare-teams`, `/api/analytics/*`, `/api/health`) are excluded from ETag middleware.
- **Uncached Metadata**: `/api/meta/data-version` emits `Cache-Control: no-cache` so the client can always poll for fresh database version timestamps.
- **IndexedDB Persistence**: TanStack Query persists cache entries into client IndexedDB via `idb-keyval`. Queries include the current `data_version` in their query keys (`formatUrlWithDataVersion`), ensuring that any database re-ingestion automatically invalidates stale client data.

---

## 7. Frontend Architecture

### Context & State Hierarchy
The frontend application wraps the component tree in dedicated contexts:
- **`QueryClientProvider`**: Manages server state, background revalidation, and IndexedDB persistence.
- **`VersionProvider`**: Holds the selected mainline game version. Persists the active version in `localStorage` under the canonical key `poke_architect_selected_version_id`. Migrates legacy `selectedVersionId` automatically.
- **`VisualQualityProvider`**: Resolves visual tier (`auto`, `high`, `low`). Automatically detects `prefers-reduced-motion` and applies `data-quality="high|low"` to the root `<html>` element.
- **`AuthProvider`**: Manages Google OAuth JWT tokens, user profile info, and login/logout state.
- **`TeamContext`**: Stores the active team loadout (up to 6 Pokémon, items, moves, abilities, natures).

### Modal & Sheet Navigation
All drawer and modal views (`EncounterModal`, `ItemBagDrawer`, `PokedexDetailModal`) utilize the shared `Sheet` primitive. The `useBackToClose` hook binds both the keyboard `Escape` key and the browser's `popstate` event:
- Opening a modal pushes a synthetic hash (`#modal`) into browser history.
- Tapping the mobile hardware/gesture Back button pops the history entry and closes the drawer cleanly without navigating away from the page.

### Code Splitting & Performance
Heavy visual components are lazy-loaded via `React.lazy` and wrapped in `Suspense`:
- `EncounterModal`
- `EvolutionTree`
- `ItemBagDrawer`
- `BerryDetail`
- `HeroCanvasSlot` (3D background slot)

Bundle thresholds are enforced via `.size-limit.json` (main bundle budget: ~300 kB brotli).

---

## 8. Authentication & Security

```mermaid
sequenceDiagram
    autonumber
    actor User as User Browser
    participant FE as Frontend (/builder)
    participant BE as Backend (/api/auth)
    participant Google as Google Identity Provider
    participant DB as PostgreSQL

    User->>FE: Clicks "Login with Google"
    FE->>BE: GET /api/auth/google/login
    BE-->>User: 302 Redirect to Google OAuth Consent Screen
    User->>Google: Authenticates & grants 'openid email profile' permissions
    Google-->>BE: 302 Redirect to /api/auth/google/callback?code=...
    BE->>Google: Exchanges code for Access Token & ID Token
    Google-->>BE: Returns user profile (email, name, picture, sub)
    BE->>DB: Finds or creates User record
    BE->>BE: Signs HS256 JWT access_token (1-week expiry)
    BE-->>User: 307 Redirect to ${FRONTEND_URL}/auth/callback?token=JWT
    User->>FE: Mounts /auth/callback, extracts token
    FE->>FE: Stores token in localStorage & updates AuthContext
    FE-->>User: Navigates to /builder
```

---

## 9. Deployment Topology & Environments

| Component | Platform | Build Command | Start Command / Routing |
| :--- | :--- | :--- | :--- |
| **Frontend** | Vercel | `npm run build` | Static Single Page Application (SPA rewrite to `index.html`) |
| **Backend** | Render (Free Tier) | `pip install -r requirements.txt` | `alembic -c backend/alembic.ini upgrade head && gunicorn -w 1 -k uvicorn.workers.UvicornWorker backend.main:app` |
| **Database** | Supabase | Managed PostgreSQL 15 | `DATABASE_URL` with SSL mode enforced (`sslmode=require`) |
| **Keep-Alive** | GitHub Actions | Cron schedule (`*/14 * * * *`) | Sends HTTP GET to `/api/health` to reduce Render cold starts |

### Environment Variables Matrix (Names & Placeholders Only)

| Environment Variable | Service | Purpose |
| :--- | :--- | :--- |
| `DATABASE_URL` | Backend | PostgreSQL connection URI (`postgresql://user:pass@host:5432/db`) |
| `SECRET_KEY` | Backend | JWT signing secret and session encryption key |
| `GOOGLE_CLIENT_ID` | Backend | Google OAuth 2.0 Web Client ID |
| `GOOGLE_CLIENT_SECRET`| Backend | Google OAuth 2.0 Client Secret |
| `GOOGLE_REDIRECT_URI` | Backend | OAuth callback URL (`http://localhost:8000/api/auth/google/callback`) |
| `FRONTEND_URL` | Backend | Origin for OAuth return redirects (`http://localhost:5173` or Vercel URL) |
| `ALLOWED_ORIGINS` | Backend | CORS origins list (`http://localhost:5173,https://poke-architect.vercel.app`) |
| `APP_API_VERSION` | Backend | API semantic version for ETag generation (falls back to `GIT_SHA` / `RENDER_GIT_COMMIT`) |
| `VITE_API_BASE_URL` | Frontend | Production API endpoint including `/api` suffix |
| `VITE_API_URL` | Frontend | Fallback API endpoint without `/api` suffix |

---

## 10. Testing Strategy & Safety Guardrails

| Layer | Runner / Framework | Target Scope | Key Guardrails |
| :--- | :--- | :--- | :--- |
| **Backend Unit / API** | Pytest + FastAPI TestClient | Endpoint response shapes, STAB heuristics, error codes | `tests/conftest.py` redirects `DATABASE_URL` to a temp SQLite file; aborts if engine URL is not SQLite. |
| **Backend Static Analysis**| Ruff | Undefined variables, unused imports, duplicate symbols | Enforces zero F821 undefined symbols across `backend`, `scripts`, and `tests`. |
| **Frontend Unit & A11y** | Vitest + MSW + `jest-axe` | Component rendering, drawer state, keyboard traps, WCAG A11y | Intercepts HTTP calls with MSW fixtures; verifies zero axe violations. |
| **Frontend E2E (Mocked)**| Playwright | End-to-end user workflows, tab switches, version selection | Runs in parallel across Desktop Chrome and Pixel 7 viewports. |
| **Frontend E2E (Live)** | Playwright (`--project=live`)| Live API integration against real running backend | Asserts live Pokémon encounter lookups, evolution trees, and real pocket counts. |
| **Bundle Budget** | `@size-limit/preset-app` | Production bundle output size in brotli kB | Prevents bundle bloat across main and vendor chunks. |

---

## 11. Key Architectural Decisions & Trade-Offs

| Decision | Chosen Approach | Alternative Considered | Rationale & Trade-Off |
| :--- | :--- | :--- | :--- |
| **Data Ingestion** | Bulk CSV ingestion from pinned PokéAPI GitHub ref | Crawling live PokeAPI REST/GraphQL endpoints | Ingesting static CSVs is orders of magnitude faster (minutes vs days), strictly deterministic, and avoids API rate limiting. |
| **Encounter Aggregation** | Group raw normalized encounter rows at query time | Denormalized nested JSON columns in PostgreSQL | Allows flexible filtering by `version_id`, `method`, or location area while maintaining relational integrity. |
| **HTTP Caching** | Weak ETags computed from Data Version + Path + Query | Content-hash (MD5 of body) | Weak ETags salted by data version allow immediate 304 Not Modified responses without querying or serializing database records. |
| **Client State Persistence**| TanStack Query persisted to IndexedDB (`idb-keyval`)| Service worker runtime caching | IndexedDB query persistence allows seamless cache invalidation via query keys without risk of stale worker cache bugs. |
| **Free-Tier Hosting** | Render Free Tier + GitHub Actions Keep-Alive Cron | Paid persistent dedicated instance | Keeps deployment costs zero while mitigating cold starts using an automated 14-minute HTTP health ping. |

---

## 12. Planned Enhancements & Roadmap

The following capabilities are planned for future phases:
- **PWA Offline Mode Hardening (Planned)**: Full offline encyclopedia caching of top Pokémon, items, and moves via enhanced Workbox runtime strategies.
- **Android App via Capacitor (Planned)**: Native Android packaging utilizing the Capacitor bridge to bundle the React PWA into an `.apk`.
- **Desktop Application via Tauri (Planned)**: Native desktop distribution for Windows and macOS wrapping the client with a lightweight Rust webview.
- **Interactive 3D Hero Canvas (Planned)**: Interactive Three.js / shader canvas plugged into the `<HeroBackground>` slot.
