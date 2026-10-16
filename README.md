# ⚔️ PokéArchitect

**PokéArchitect** is a high-fidelity, mathematically optimized Pokémon team-building and diagnostic platform. Designed for both competitive strategists and casual trainers, it utilizes advanced heuristics and real-time data analytics to help you build the ultimate six-Pokémon roster.

---

## 🚀 Status: MAINTAINED ✅

This project is production-ready and actively maintained. All core features including team optimization, deep analytics, secure authentication, and global community features are fully operational and deployed.

### ✨ Key Features
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
- **Backend**: FastAPI (Python) + SQLAlchemy
- **Database**: PostgreSQL (Production) / SQLite (Local)
- **Deployment**: Frontend on Vercel, Backend on Render

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

### Database Migrations (Alembic)
Database migrations are managed with Alembic:
- **Fresh Database**:
  ```bash
  alembic -c backend/alembic.ini upgrade head
  ```
- **Existing Database**:
  ```bash
  alembic -c backend/alembic.ini stamp 0001
  alembic -c backend/alembic.ini upgrade head
  ```

---

## 📜 Available Scripts

### Backend
- `python start.py` - Start the development server
- `python -m pytest` - Run tests (if implemented)
- `pip install -r requirements.txt` - Install dependencies

### Frontend
- `npm run dev` - Start development server at http://localhost:5173
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint for code quality
- `npm test` - Run tests (if implemented)

---

## 🔌 API Endpoints

### Public Endpoints
- `GET /api/health` - Health check endpoint
- `GET /api/pokemon` - Get Pokémon list with filtering options
- `GET /api/pokemon/batch` - Get multiple Pokémon by IDs
- `GET /api/pokemon/{id}` - Get single Pokémon details
- `GET /api/analytics/global` - Get global statistics
- `GET /api/analytics/export/pokemon` - Export Pokémon data as CSV
- `GET /api/analytics/export/teams` - Export teams data as CSV
- `GET /api/moves` - Get list of moves with filtering (type, damage class)
- `GET /api/moves/{id}` - Get specific move details
- `GET /api/natures` - Get list of natures with filtering
- `GET /api/natures/{id}` - Get specific nature details
- `GET /api/abilities` - Get list of abilities with filtering
- `GET /api/abilities/{id}` - Get specific ability details
- `GET /api/items` - Get list of competitive items with filtering
- `GET /api/items/{id}` - Get specific item details

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

*For interactive API documentation, visit `/docs` when the backend is running.*

---

## 🧪 Testing
The project includes test suites for both frontend and backend components:

### Backend Tests
```bash
cd backend
python -m pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

*Note: Test implementation is in progress. Contributions to improve test coverage are welcome.*

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
