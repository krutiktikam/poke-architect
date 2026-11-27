# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security
- **Centralized `SECRET_KEY` Enforcement**: Added `backend/config.py` to enforce a non-default `SECRET_KEY` when `RENDER` is set or `ENVIRONMENT=production` (raising `RuntimeError` at import), and generating an ephemeral `secrets.token_urlsafe(48)` key in local development. Removed hardcoded secret fallbacks from `backend/main.py` and `backend/auth.py`.
- **Protected Team Export Endpoint**: Secured `GET /api/analytics/export/teams` with `Depends(auth.get_current_user)`, scoped results to the caller's own `SavedTeam` rows, and removed per-row `User` lookups while keeping `/api/analytics/export/pokemon` public.
- **Hardened CORS Allowlist**: Removed the `"*"` (`allow_origin_regex=".*"`) wildcard branch and `https://poke-architect-.*\.vercel\.app` regex from `backend/main.py`. Only built-in defaults plus explicit `ALLOWED_ORIGINS` entries are allowed, and `"*"` entries are ignored with a warning.
- **Sanitized Error Responses**: Updated `global_exception_handler` in `backend/main.py` to log tracebacks server-side, return only `{"detail": "Internal Server Error"}`, and echo `Origin` only when in `allowed_origins`. Replaced `str(e)` detail leakage in `/api/pokemon` with `"Database query failed"`.
- **Security Tests & Documentation**: Added `tests/test_security.py` and `docs/security-hardening.md` documenting implemented fixes and planned follow-up improvements.
