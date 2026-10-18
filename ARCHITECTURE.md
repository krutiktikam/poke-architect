# PokéArchitect System Architecture

## Overview
PokéArchitect is a full-stack web application designed for Pokémon team building and competitive analysis. It follows a modern client-server architecture with clear separation of concerns between frontend and backend components.

## Technology Stack

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion
- **Data Visualization**: Recharts
- **State Management**: React Context API
- **Routing**: React Router DOM v7
- **HTTP Client**: Axios
- **PWA Support**: Vite PWA Plugin
- **Icons**: Lucide React

### Backend
- **Framework**: FastAPI (Python)
- **ORM**: SQLAlchemy
- **Database**: PostgreSQL (Production) / SQLite (Development)
- **Authentication**: Session-based with JWT considerations
- **Environment**: Python 3.9+
- **Dependency Management**: Pip

### Infrastructure
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Render
- **Database**: PostgreSQL (managed on Render)
- **CI/CD**: GitHub Actions
- **Domain**: Custom domain configured

## Component Architecture

### Frontend Structure
```
frontend/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── Header.tsx        # Application header with navigation
│   │   ├── TeamDock.tsx      # Persistent team display at bottom
│   │   ├── PokemonCard.tsx   # Individual Pokémon display
│   │   └── ...               # Other UI components
│   ├── context/              # React Context providers
│   │   ├── AuthContext.tsx   # Authentication state
│   │   └── TeamContext.tsx   # Team building state
│   ├── pages/                # Page-level components (routes)
│   │   ├── Builder.tsx       # Main team building interface
│   │   ├── Analysis.tsx      # Team analysis dashboard
│   │   ├── Pokedex.tsx       # Pokémon browser/search
│   │   ├── Community.tsx     # Team sharing and discovery
│   │   ├── Profile.tsx       # User profile and saved teams
│   │   ├── Analytics.tsx     # Global statistics
│   │   ├── Leaderboard.tsx   # Top teams ranking
│   │   └── AuthCallback.tsx  # OAuth callback handler
│   ├── types/                # TypeScript interfaces
│   │   └── index.ts          # Shared types (Pokemon, User, etc.)
│   ├── App.tsx               # Root application component
│   └── main.tsx              # Application entry point
├── public/                   # Static assets
│   ├── manifest.json         # PWA manifest
│   └── vite.svg              # Vite logo
├── vite.config.ts            # Vite configuration
├── tailwind.config.cjs       # Tailwind CSS configuration
├── index.html                # HTML template
└── package.json              # Dependencies and scripts
```

### Backend Structure
```
backend/
├── main.py                   # FastAPI application entry point
├── auth.py                   # Authentication routes and logic
├── teams.py                  # Team management routes
├── database.py               # Database connection and session management
├── models.py                 # SQLAlchemy ORM models
├── schemas.py                # Pydantic models for request/response validation
├── utils.py                  # Core heuristic intelligence functions
├── ml_recommender.py         # Machine learning recommendation logic
├── requirements.txt          # Python dependencies
└── start.py                  # Application startup script
```

## Data Flow

### User Interaction Flow
1. **User Action**: User interacts with UI (e.g., adds Pokémon to team)
2. **Frontend State Update**: React context updates local team state
3. **API Request**: Axios sends request to appropriate backend endpoint
4. **Backend Processing**: 
   - FastAPI route receives request
   - Dependencies injected (database session, auth)
   - Business logic executed (heuristic calculations)
   - Database queries performed via SQLAlchemy
5. **Response**: JSON data returned to frontend
6. **UI Update**: React components re-render with new data

### Team Analysis Flow
1. User selects up to 6 Pokémon in Builder page
2. Team context updates with selected Pokémon IDs
3. When "Analyze" button clicked:
   - Frontend sends POST to `/api/team-analysis` with Pokémon IDs
   - Backend:
     - Validates team size (max 6)
     - Queries Pokémon data from database
     - Calculates team stats (HP, Attack, Defense, etc.)
     - Computes type coverage against all types
     - Generates Pokémon suggestions based on weaknesses
     - Provides tactical advice based on coverage gaps
     - Detects team archetype (Hyper Offense, Bulky Stall, etc.)
     - Calculates health score (A-F rating)
   - Returns analysis results as JSON
   - Frontend displays results in AnalysisDashboard modal

### Authentication Flow
1. User clicks "Sign in with Google"
2. Frontend redirects to Google OAuth endpoint
3. Google authenticates user and redirects to `/auth/callback`
4. Backend:
   - Receives authorization code
   - Exchanges code for user info
   - Creates or retrieves user record
   - Sets session cookie
5. Frontend receives user data via AuthContext
6. UI updates to show authenticated state

## Database Schema

### Core Tables
- **users**: Stores user information (id, email, name, google_id, etc.)
- **pokemon**: Contains all Pokémon data (stats, types, generation, etc.)
- **type_efficacy**: Damage multipliers between types (attacking_type -> defending_type)
- **saved_teams**: User-created teams (id, user_id, name, team_data JSON)

### Key Relationships
- One-to-Many: User → SavedTeams
- Many-to-Many: SavedTeams ↔ Pokémon (via JSON storage)
- Reference: Pokémon → TypeEfficacy (for damage calculations)

## API Endpoints

### Public Endpoints
- `GET /api/health` - Health check
- `GET /api/pokemon` - Get Pokémon list with filtering
- `GET /api/pokemon/batch` - Get multiple Pokémon by IDs
- `GET /api/pokemon/{id}` - Get single Pokémon details
- `GET /api/analytics/global` - Get global statistics
- `GET /api/analytics/export/pokemon` - Export Pokémon data as CSV
- `GET /api/analytics/export/teams` - Export teams data as CSV

### Authentication Endpoints (in auth router)
- `GET /auth/login` - Initiate Google OAuth
- `GET /auth/callback` - Handle OAuth callback
- `GET /auth/me` - Get current user info
- `POST /auth/logout` - Logout user

### Team Endpoints (in teams router)
- `POST /api/team-analysis` - Analyze team composition
- `POST /api/compare-teams` - Compare two teams
- `POST /teams` - Save a team
- `GET /teams` - Get user's saved teams
- `GET /teams/{id}` - Get specific team
- `PUT /teams/{id}` - Update team
- `DELETE /teams/{id}` - Delete team

## Deployment Architecture

### Development Environment
```
Developer Machine
├── Frontend: localhost:5173 (Vite dev server)
├── Backend: localhost:8000 (Uvicorn server)
└── Database: SQLite (local file) or PostgreSQL (local Docker)
```

### Production Environment
```
User Browser
    ↓ HTTPS
Vercel Edge Network (Frontend)
    ↓ HTTPS (CORS-enabled)
Render Service (Backend)
    ↓ Internal Network
Render PostgreSQL Database
```

### Deployment Process
1. Code pushed to GitHub main branch
2. GitHub Actions triggers:
   - Frontend: Build and deploy to Vercel
   - Backend: Build and deploy to Render
3. Vercel serves static assets via CDN
4. Render runs Gunicorn workers serving FastAPI app
5. Database connections managed via connection pooling

## Security Considerations

### Authentication & Authorization
- Google OAuth 2.0 for user authentication
- Session-based authentication with secure cookies
- Protected routes require valid session
- No sensitive data exposed in client-side code

### Data Protection
- Environment variables for secrets (database URLs, API keys)
- CORS configuration restricted to trusted origins
- SQL injection prevention via SQLAlchemy ORM
- Input validation using Pydantic models
- Rate limiting considerations for public endpoints

### API Security
- CORS headers properly configured
- Credentials allowed for same-site requests
- Error handling doesn't leak stack traces
- Health endpoints exposed for monitoring

## Performance Optimizations

### Frontend
- Code splitting via Vite dynamic imports
- Lazy loading of routes and components
- Efficient state updates with React Context
- Optimized recharts usage with memoization
- Framer Motion animations optimized for 60fps
- Tailwind CSS purging unused styles in production
- Image optimization via next-generation formats

### Backend
- Database connection pooling
- Efficient SQLAlchemy queries with proper indexing
- Caching strategies for frequently accessed data
- Pagination for large dataset endpoints
- Async/await for I/O operations
- Gunicorn worker configuration for optimal concurrency

### Asset Optimization
- Compressed static assets (CSS, JS)
- Browser caching via proper headers
- Service worker caching strategies (PWA)
- Image optimization and lazy loading
- Font subsetting and preloading

## Monitoring & Observability

### Logging
- Structured logging in backend with levels (INFO, WARN, ERROR)
- Request ID tracking for traceability
- Error reporting with context
- Performance logging for slow queries

### Health Checks
- `/api/health` endpoint for liveness/readiness probes
- Database connectivity verification
- External service status checks

### Metrics
- Vercel Analytics for frontend usage
- Custom analytics for feature adoption
- Error tracking (consider Sentry integration)
- Performance metrics (consider New Relic/DataDog)

## Scalability Considerations

### Horizontal Scaling
- Stateless backend services allow multiple instances
- Database read replicas for query distribution
- CDN caching for static assets
- Redis caching layer for computed results (future enhancement)

### Vertical Scaling
- Resource allocation based on usage patterns
- Database connection pool tuning
- Worker process optimization
- Memory usage monitoring

## Future Enhancements

### Technical Improvements
1. **WebSocket Integration**: Real-time collaboration features
2. **GraphQL API**: More efficient data fetching
3. **Microservices**: Separate services for analytics, recommendations
4. **Event-Driven Architecture**: Message queues for async processing
5. **Containerization**: Docker/Kubernetes deployment

### Feature Enhancements
1. **Advanced Analytics**: Machine learning predictions
2. **Social Features**: Comments, likes, team discussions
3. **Tournament Tools**: Bracket generation, match history
4. **Mobile App**: Native wrappers with device feature access
5. **Offline Mode**: Improved PWA capabilities for offline use

## Diagrams (Text Representation)

### Component Diagram
```
[User Browser]
        ↓ (HTTPS)
[Vercel CDN] ←→ [React SPA]
        ↓ (API Calls)
[Render Service] ←→ [FastAPI Server]
        ↓ (DB Queries)
[Render PostgreSQL] ←→ [Pokemon, Users, Teams tables]
```

### Data Flow Diagram
```
[User Action] → [React State Update] → [API Request] 
        ↓
[FastAPI Route] → [Business Logic] → [DB Query] 
        ↓
[JSON Response] ← [React State Update] ← [Component Re-render]
```

### Deployment Diagram
```
[Developer] → [GitHub] → [GitHub Actions] 
                              ↓
                    [Vercel] ←→ [Frontend]
                    [Render]  ←→ [Backend] ←→ [PostgreSQL]
```

---
*Documentation generated as part of PokéArchitect system architecture update*