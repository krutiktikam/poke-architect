# PokéArchitect V2 - Expansion Plan 🚀

This document outlines the planned improvements and new features for the next major iteration of PokéArchitect.

## 1. Data & ETL Expansion (The "Big Data" Flex)
*   **All Generations**: Update `etl_pipeline.py` to fetch data for all Pokémon (Gens 1-9).
*   **Enhanced Metadata**: 
    *   Store `generation` and `version_group` data.
    *   Map Pokémon availability to specific games (e.g., Pokémon Emerald, Scarlet/Violet).
*   **Advanced Filtering**: Filter by Generation, Game Version, and specific Base Stat thresholds.

## 2. Advanced Visualization & UX (The "Data Scientist" Flex)
*   **Multi-Page Architecture**: Transition to `react-router-dom`:
    *   `/builder`: Main team construction tool.
    *   `/analysis`: Deep-dive data visualization dashboard.
    *   `/pokedex`: Searchable Pokémon encyclopedia.
*   **Correlation Graphs**: Implement Scatter Plots or Parallel Coordinates to show stat relationships across the team.
*   **"Human-Readable" Analysis**: Convert complex type multipliers into simple tactical advice (e.g., "Your team is 3x weak to Ground; consider a Flying type").

## 3. Contextual Recommendation Engine (The "AIML" Flex)
*   **Game-Aware Suggestions**: Recommendations filtered by the user's selected game version.
*   **Heuristic Scoring**: A multi-factor algorithm to suggest members based on:
    1.  Type Coverage (Defensive gaps)
    2.  Move-pool Diversity (Offensive coverage)
    3.  Base Stat Total (Overall power)
*   **Team Archetypes**: Automatically detect and label team styles (e.g., "Glass Cannon", "Bulky Stall", "Balanced").

## 4. Mobile & Deployment Strategy
*   **PWA Support**: Make the app "Installable" on mobile devices via Vite PWA plugin.
*   **Cloud Hosting**: 
    *   **Frontend**: Vercel/Netlify.
    *   **Backend**: Render/Railway.
    *   **Database**: Maintain SQLite for simplicity or migrate to Supabase (PostgreSQL) for user accounts.

## 5. Bonus Polish Features
*   **Comparison Mode**: Side-by-side Pokémon stat comparison with a "winner" prediction.
*   **Team Export**: Download a "Team Certificate" as an image or PDF.
*   **Dark Mode**: Native support for dark/light themes.

---
*Created: April 15, 2026*
