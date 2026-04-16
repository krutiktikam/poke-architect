# PokéArchitect V2 - Expansion Plan 🚀

This document outlines the roadmap for PokéArchitect's evolution. Items marked with `[x]` have been implemented in the current cycle.

## 1. Data & ETL Expansion (The "Big Data" Flex)
*   **[x] All Generations**: Update `etl_pipeline.py` to fetch data for all 1025 Pokémon (Gens 1-9).
*   **[x] Enhanced Metadata**: 
    *   Store `generation` and `region` data in the SQLite database.
    *   Implemented mapping for all 9 core regions (Kanto through Paldea).
*   **[x] Advanced Filtering**: Support API-level filtering by Generation, Game Version, and specific search terms.

## 2. Advanced Visualization & UX (The "Data Scientist" Flex)
*   **[x] Multi-Page Architecture**: Transitioned to `react-router-dom`:
    *   `/builder`: Main team construction tool with generation-specific search.
    *   `/analysis`: Full-page data visualization dashboard with archetype detection.
    *   `/pokedex`: Searchable Pokémon encyclopedia with base-stat visualization.
*   **[x] Persistent State**: Implemented `TeamContext` with `localStorage` persistence.
*   **[x] "Human-Readable" Analysis**: Converted complex type multipliers into tactical advice (e.g., "Critical Gap: heavily vulnerable to Ground").

## 3. Contextual Recommendation Engine (The "AIML" Flex)
*   **[x] Game-Aware Suggestions**: Recommendations are now filtered by the user's selected game generation.
*   **[x] Heuristic Scoring**: A multi-factor algorithm that weighs:
    1.  **Defensive Synergy**: How many team weaknesses the candidate resists/negates.
    2.  **Base Stat Total (BST)**: Overall power level of the suggestion.
*   **[x] Team Archetypes**: Automatic detection and labeling of team styles (e.g., "Hyper Offense", "Bulky Stall", "Glass Cannon").

## 4. Mobile & Deployment Strategy
*   **[ ] PWA Support**: Make the app "Installable" on mobile devices via Vite PWA plugin.
*   **[ ] Cloud Hosting**: 
    *   **Frontend**: Vercel/Netlify.
    *   **Backend**: Render/Railway.
*   **[ ] Database Migration**: Prepare for Supabase (PostgreSQL) for user accounts and cloud-saved teams.

## 5. Bonus Polish Features
*   **[ ] Comparison Mode**: Side-by-side Pokémon stat comparison with a "winner" prediction.
*   **[ ] Team Export**: Download a "Team Certificate" as an image or PDF.
*   **[ ] Asset Cache**: Implement local caching for sprites to improve offline experience.

---
*Last Updated: April 16, 2026*
