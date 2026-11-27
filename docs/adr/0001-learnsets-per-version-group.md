# 1. Version-Group-Aware Move Learnsets

Date: 2026-11-14
Status: Accepted

## Context

In earlier iterations of PokéArchitect, `pokemon_moves` stored only a `generation_id` and a free-text `learn_method`. It lacked game version group granularity, level requirements, move learning order, and foreign keys to normalized learn method tables.

In Pokémon games, learnsets vary across version groups within the same generation (e.g., Red/Blue vs. Yellow in Generation I, or Ruby/Sapphire vs. Emerald in Generation III). For instance, Bulbasaur learns Vine Whip at level 13 in Red/Blue, but at level 10 in Emerald. Storing learnsets per generation rather than per version group led to loss of fidelity and prevented game-accurate team building.

Additionally, when the learnset ingestion stage was initially added to `STAGE_DEPENDENCY_ORDER`, it broke existing automated test suites (`tests/test_populate_extended.py` and `tests/test_api_phase3.py`) with prerequisite errors (`RuntimeError: Prerequisite tables missing or empty: moves`). Unlike other pipeline stages that are self-contained from CSV files, learnset ingestion requires prerequisite tables (`pokemon` and `moves`) to be seeded in advance.

## Decision

1. **Normalized Models & Schema Revision (Alembic 0005)**:
   - Added `PokemonMoveMethod` model (`pokemon_move_methods` table) with non-autoincrementing `id`, unique `identifier` (e.g., `level-up`, `machine`, `egg`, `tutor`), and localized `name`.
   - Updated `PokemonMove` model (`pokemon_moves` table) adding `version_group_id` (FK to `version_groups.id`), `method_id` (FK to `pokemon_move_methods.id`), `level` (Integer, default=0), and `order` (Integer, nullable).
   - Enforced a natural key unique constraint `uq_pokemon_moves_natural_key` on `(pokemon_id, version_group_id, move_id, method_id, level)`.
   - Added composite index `ix_pokemon_moves_lookup` on `(pokemon_id, version_group_id)` for high-performance querying.

2. **Dedicated Query API**:
   - Implemented `GET /api/pokemon/{pokemon_id}/moves` with required `version_group` and optional `method` filters.
   - Utilizes a single joined query across `PokemonMove`, `Move`, and `PokemonMoveMethod` ordered by method, level, order, and move name to eliminate N+1 overhead.

3. **Opt-In Ingestion Pipeline**:
   - Kept `STAGE_DEPENDENCY_ORDER` limited to self-contained stages that populate reference tables, items, berries, locations, encounters, and evolutions.
   - Introduced `OPT_IN_STAGES = ["learnsets"]` and `ALL_STAGES_ORDER = STAGE_DEPENDENCY_ORDER + OPT_IN_STAGES`.
   - The `--all` CLI flag executes only self-contained stages. To ingest learnsets, users explicitly provide `--learnsets` or `--all --learnsets`.

## Consequences

- **Legacy Columns Retained for Compatibility**:
  Legacy columns `generation_id` and `learn_method` are preserved on `pokemon_moves` and populated during ingestion to ensure backward compatibility with existing queries and endpoints.

- **Form-Specific Learnsets Deferred**:
  PokéAPI CSV learnsets reference Pokémon IDs above 10,000 for non-default forms (e.g., regional variants, Megas). These rows are skipped during ingestion and counted under `learnset: pokemon_id not in pokemon (forms unsupported)` until extended form schema support is implemented.

- **ID-Alignment Guard Rationale**:
  Ingestion validates foreign key ID alignment between database records and official PokéAPI CSVs (comparing normalized names of moves and species) before streaming rows. This prevents silent data corruption if the database was seeded with conflicting ID sequences.

- **Ingestion Pinned with `--ref`**:
  All CSV downloads are pinned to git refs (branch, tag, or commit SHA; defaults to `master`) and cached in `.cache/pokeapi_csv/` to ensure deterministic and idempotent pipeline executions.

- **Learnsets Opt-In Isolation**:
  Because learnset ingestion requires prerequisite `pokemon` and `moves` data (seeded by external scripts such as `scripts/seed_database.py` and `scripts/populate_moves_natures.py`), isolating `--learnsets` from `--all` guarantees that general test suites and new environment deployments remain reliable and hermetic.
