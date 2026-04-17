# PokéArchitect V3 - Current Status & Roadmap

## 🚀 Completed in V3
*   **Unified Dashboard**: Transitioned from multi-page context switching to a split-screen "Live Analysis" sidebar in the Builder.
*   **Google OAuth & JWT**: Implemented secure authentication using Authlib and session management.
*   **Saved Teams**: Users can now name, save, and toggle privacy (Public/Private) for their teams.
*   **Community Showcase**: A global feed of public teams with a side-by-side **Comparison Tool**.
*   **AI/ML Enhancements**: 
    *   **Health Score**: A letter-grade (S-F) heuristic based on stat totals and type coverage.
    *   **Tactical Verdicts**: Dynamic comparison logic that predicts advantages between two teams.

## 🛠️ Current Environment Config
*   **Redirect URI**: Manually configurable via `GOOGLE_REDIRECT_URI` to handle production SSL/Proxy issues.
*   **Database**: PostgreSQL (Production) / SQLite (Local) with `pool_pre_ping` and SSL requirements.

## 📅 Next Steps (Planned Improvements)
1.  **Team Management**:
    *   [ ] User Profile page to view and delete personal saved teams.
    *   [ ] "Edit Team" functionality to load a saved team back into the builder.
2.  **Advanced AI Suggestions**:
    *   [ ] Implement co-occurrence logic (e.g., "Users who picked Gengar also picked...").
    *   [ ] Threat detection (specific counters for meta-threats).
3.  **UI/UX Polish**:
    *   [ ] Loading skeletons for the Community feed.
    *   [ ] Export team as "Certificate Card" (Image/PNG).

*Last Updated: April 17, 2026*
