# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Version-Group Learnset Storage**: Added `PokemonMoveMethod` model and extended `PokemonMove` with `version_group_id`, `method_id`, `level`, `order`, a composite index `ix_pokemon_moves_lookup`, and natural key constraint `uq_pokemon_moves_natural_key` (Alembic migration `0005_learnsets_by_version_group`).
- **Learnset API Endpoint**: Added `GET /api/pokemon/{pokemon_id}/moves` endpoint with required `version_group` and optional `method` query parameters.
- **Opt-In Ingestion Stage**: Added `--learnsets` pipeline stage in `scripts/populate_extended.py` to stream and batch upsert move learnsets from official PokéAPI CSVs (`pokemon_moves.csv`, `pokemon_move_methods.csv`, `pokemon_move_method_prose.csv`).
- **Learnset Ingestion Test Suite**: Added `tests/test_learnsets_ingestion.py` covering happy path ingestion, idempotency, orphan tracking, duplicate natural keys de-duplication, prerequisite guards, and stage isolation.
- **Architectural Decision Record**: Added `docs/adr/0001-learnsets-per-version-group.md` documenting context, schema decisions, and opt-in pipeline design.

### Changed
- **Pipeline Stage Isolation**: Excluded `learnsets` from `STAGE_DEPENDENCY_ORDER` and `--all` default execution. Learnsets is designated an opt-in stage via `OPT_IN_STAGES = ["learnsets"]`, allowing `--all` to run hermetically across test environments without requiring pre-seeded move and Pokémon tables.
- **CLI Behavior**: Updated `--all` flag to run only self-contained stages, while `--all --learnsets` or `--learnsets` explicitly includes learnset ingestion.
