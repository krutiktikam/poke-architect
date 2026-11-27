# Security Hardening (`fix/export-auth-and-cors`)

## Fixed in This Change

1. **Secret Key Enforcement (`backend/config.py`, `backend/main.py`, `backend/auth.py`)**
   - Removed all hardcoded fallback strings (`"your-secret-key-change-it-in-prod"` in `backend/auth.py` and `"your-session-secret-change-it"` in `backend/main.py`).
   - Added `backend/config.py`, which fails closed with `RuntimeError` at import time when `RENDER` is set or `ENVIRONMENT=production` if `SECRET_KEY` is missing or equals either known fallback string.
   - In non-production environments, logs a warning and generates a per-process ephemeral key via `secrets.token_urlsafe(48)`.

2. **Authenticated, Tenant-Scoped Team CSV Export (`GET /api/analytics/export/teams`)**
   - Required authentication via `Depends(auth.get_current_user)` on `/api/analytics/export/teams` so unauthenticated callers receive `401`.
   - Filtered `SavedTeam` records strictly by `SavedTeam.user_id == current_user.id` and removed per-row `User` queries in favor of `current_user`.
   - Kept `/api/analytics/export/pokemon` public.

3. **Sanitized Error Responses & Origin-Checked 500 Headers (`backend/main.py`)**
   - Updated `global_exception_handler` to return only `{"detail": "Internal Server Error"}` (removing `"error"` and `"type"` keys) while logging full tracebacks server-side with `logger.exception(...)`.
   - Replaced `detail=f"Database query failed: {str(e)}"` in `/api/pokemon` with generic `detail="Database query failed"`.
   - Restricted CORS headers on 500 error responses so `Origin` is echoed only when present in the explicit `allowed_origins` list.

4. **Strict Explicit CORS Allowlist (`backend/main.py`, `backend/config.py`)**
   - Removed the wildcard `allow_origin_regex=".*"` branch and the `r"https://poke-architect-.*\.vercel\.app"` regex that matched arbitrary Vercel preview deployments.
   - Allowed only explicit origins: built-in defaults (`http://localhost:5173`, `http://127.0.0.1:5173`, `https://poke-architect.vercel.app`) plus entries from `ALLOWED_ORIGINS`.
   - Ignored any `"*"` entry in `ALLOWED_ORIGINS` with a warning log.

5. **Security Regression Tests (`tests/test_security.py`)**
   - Added tests verifying unauthenticated `401` on `/api/analytics/export/teams`, per-user export isolation, sanitized 500 payloads and origin checks, blocked `https://poke-architect-evil.vercel.app` preflights, ignored `"*"` in `ALLOWED_ORIGINS`, and fail-closed `SECRET_KEY` checks in Render/production.

## Deliberately NOT Fixed Yet (Follow-Up Plan)

The following items remain out of scope for this backend-only hotfix to avoid breaking the deployed SPA or changing database/OAuth flows mid-flight:

1. **JWT in OAuth Redirect Query String & `localStorage`**: `backend/auth.py` still passes `?token=...` in the `/api/auth/google/callback` redirect URL, and the frontend stores that JWT in `localStorage`.
2. **No Explicit OAuth `state` Parameter Validation / CSRF Hardening**: OAuth state/session handling currently relies on cross-origin cookie behavior and Starlette session defaults without dedicated same-origin hardening.
3. **No Rate Limiting**: Auth, export, and analysis routes do not yet enforce request rate limits.

### Planned Follow-Up Architecture
- Serve `/api/*` through **same-origin Vercel rewrites** to the backend so browser requests share a single origin.
- Issue session credentials via a **`Secure`, `HttpOnly`, `SameSite=Lax` cookie** instead of appending JWTs to redirect URLs or storing tokens in `localStorage`.
- Introduce edge/middleware rate limiting on authentication and export endpoints.
