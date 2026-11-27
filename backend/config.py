"""Security and runtime configuration helpers for PokéArchitect backend."""

import logging
import os
import secrets
from typing import List, Optional

logger = logging.getLogger(__name__)

_KNOWN_INSECURE_DEFAULTS = frozenset({
    "your-secret-key-change-it-in-prod",
    "your-session-secret-change-it",
})

DEFAULT_ALLOWED_ORIGINS: tuple[str, ...] = (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://poke-architect.vercel.app",
)


def _is_production_env() -> bool:
    """Return True when running on Render or with ENVIRONMENT=production."""
    render = os.getenv("RENDER", "").strip()
    environment = os.getenv("ENVIRONMENT", "").strip().lower()
    return bool(render) or environment == "production"


def load_secret_key() -> str:
    """Load SECRET_KEY from environment or fail closed in production.

    Raises RuntimeError on import in Render/production if SECRET_KEY is missing
    or matches a known insecure fallback string. In non-production environments,
    logs a warning and returns an ephemeral per-process random key.
    """
    raw = os.getenv("SECRET_KEY", "").strip()
    if not raw or raw in _KNOWN_INSECURE_DEFAULTS:
        if _is_production_env():
            raise RuntimeError(
                "SECRET_KEY must be set to a strong, non-default value when RENDER is set or ENVIRONMENT=production."
            )
        logger.warning(
            "SECRET_KEY is missing or uses a known insecure default; "
            "generating an ephemeral per-process secret key for local development."
        )
        return secrets.token_urlsafe(48)
    return raw


def get_allowed_origins(raw_env: Optional[str] = None) -> List[str]:
    """Return explicit allowed CORS origins: built-in defaults plus ALLOWED_ORIGINS.

    Wildcard '*' entries in ALLOWED_ORIGINS are ignored with a warning.
    """
    if raw_env is None:
        raw_env = os.getenv("ALLOWED_ORIGINS", "")

    allowed: List[str] = list(DEFAULT_ALLOWED_ORIGINS)
    for item in raw_env.split(","):
        origin = item.strip()
        if not origin:
            continue
        if origin == "*":
            logger.warning(
                "Ignoring wildcard '*' in ALLOWED_ORIGINS; only explicit origins are permitted."
            )
            continue
        if origin not in allowed:
            allowed.append(origin)
    return allowed


SECRET_KEY: str = load_secret_key()
