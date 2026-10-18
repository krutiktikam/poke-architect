"""
HTTP caching helper and middleware for read-only encyclopedia endpoints.

Sets Cache-Control: public, max-age=86400, stale-while-revalidate=604800
and weak ETags (W/"<hash>") computed from (data_version, path, query).
Handles If-None-Match by returning 304 Not Modified immediately without
hitting the database.
"""

import os
import hashlib
import time
from typing import Callable, Optional, Set
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response as StarletteResponse
from sqlalchemy.orm import Session
from sqlalchemy import select

from .database import SessionLocal
from .models import DataMeta

CACHE_CONTROL_HEADER: str = "public, max-age=86400, stale-while-revalidate=604800"

_DEFAULT_APP_API_VERSION: str = (
    os.getenv("APP_API_VERSION")
    or os.getenv("GIT_SHA")
    or os.getenv("RENDER_GIT_COMMIT")
    or "v1.0.0"
)
APP_API_VERSION: str = _DEFAULT_APP_API_VERSION

# In-memory cache for data_version (refreshed at most once every 60s)
_cached_data_version: Optional[str] = None
_cached_data_version_time: float = 0.0

# Endpoints excluded from encyclopedia caching
EXCLUDED_PREFIXES: Set[str] = {
    "/auth",
    "/api/auth",
    "/teams",
    "/api/teams",
    "/api/team-analysis",
    "/api/compare-teams",
    "/api/analytics",
    "/health",
    "/api/health",
    "/docs",
    "/redoc",
    "/openapi.json",
}


def get_cached_data_version(db: Optional[Session] = None) -> str:
    """
    Returns the current data version string '<pokeapi_ref>:<ingested_at>'
    or 'unseeded'. Caches the result in memory for 60 seconds.
    """
    global _cached_data_version, _cached_data_version_time
    now = time.time()
    if _cached_data_version is not None and (now - _cached_data_version_time < 60.0):
        return _cached_data_version

    close_session = False
    if db is None:
        db = SessionLocal()
        close_session = True

    try:
        rows = dict(
            db.execute(
                select(DataMeta.key, DataMeta.value).where(
                    DataMeta.key.in_(["pokeapi_ref", "ingested_at"])
                )
            ).all()
        )
        ref_row = rows.get("pokeapi_ref")
        ingested_row = rows.get("ingested_at")

        if ref_row and ingested_row:
            version = f"{ref_row}:{ingested_row}"
        else:
            version = "unseeded"
    except Exception:
        version = "unseeded"
    finally:
        if close_session:
            db.close()

    _cached_data_version = version
    _cached_data_version_time = now
    return version


def reset_cached_data_version() -> None:
    """Clears the in-memory cached data version (useful in tests)."""
    global _cached_data_version, _cached_data_version_time
    _cached_data_version = None
    _cached_data_version_time = 0.0


def compute_etag(
    data_version: str,
    path: str,
    query: str = "",
    api_version: Optional[str] = None,
) -> str:
    """
    Generates a deterministic weak ETag from APP_API_VERSION, data_version, path, and query string.
    """
    if api_version is not None:
        version = api_version
    elif APP_API_VERSION != _DEFAULT_APP_API_VERSION:
        version = APP_API_VERSION
    else:
        version = (
            os.getenv("APP_API_VERSION")
            or os.getenv("GIT_SHA")
            or os.getenv("RENDER_GIT_COMMIT")
            or APP_API_VERSION
        )

    raw = f"{version}:{data_version}:{path}?{query}".encode("utf-8")
    h = hashlib.sha256(raw).hexdigest()[:16]
    return f'W/"{h}"'


def is_no_cache_path(path: str) -> bool:
    """
    Returns True if the path must use 'Cache-Control: no-cache' instead of the 24h policy.
    Specifically /api/meta/data-version.
    """
    p = path.rstrip("/")
    return p == "/api/meta/data-version" or p == "/meta/data-version"


def is_cacheable_path(path: str) -> bool:
    """
    Determines whether a request path should have encyclopedia HTTP caching applied.
    """
    for prefix in EXCLUDED_PREFIXES:
        if path == prefix or path.startswith(f"{prefix}/"):
            return False
    # Cache read-only encyclopedia endpoints (/api/pokemon, /api/items, /api/locations, /api/berries, /api/meta, /api/versions, /api/regions, etc.)
    return path.startswith("/api/") or path.startswith("/pokemon")


def is_etag_match(client_etag: Optional[str], server_etag: str) -> bool:
    """
    Compares client If-None-Match header with server weak ETag.
    """
    if not client_etag:
        return False
    # Normalize by stripping whitespace, quotes, and W/ prefix
    def normalize(tag: str) -> str:
        tag = tag.strip()
        if tag.startswith("W/"):
            tag = tag[2:]
        return tag.strip('"\'')

    norm_server = normalize(server_etag)
    for part in client_etag.split(","):
        norm_client = normalize(part)
        if norm_client == "*" or norm_client == norm_server:
            return True
    return False


class HttpCacheMiddleware(BaseHTTPMiddleware):
    """
    ASGI middleware that provides automatic ETag and 304 handling for read-only encyclopedia GET endpoints.
    If If-None-Match matches, returns 304 immediately WITHOUT executing the route handler or DB queries.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> StarletteResponse:
        if request.method != "GET" or not is_cacheable_path(request.url.path):
            return await call_next(request)

        data_version = get_cached_data_version()
        etag = compute_etag(data_version, request.url.path, request.url.query)

        # /api/meta/data-version sends no-cache; other encyclopedia routes send the 24h policy
        cache_control = "no-cache" if is_no_cache_path(request.url.path) else CACHE_CONTROL_HEADER

        if_none_match = request.headers.get("if-none-match")
        if is_etag_match(if_none_match, etag):
            # Return 304 immediately WITHOUT running the database query
            return StarletteResponse(
                status_code=304,
                headers={
                    "ETag": etag,
                    "Cache-Control": cache_control,
                },
            )

        response = await call_next(request)

        # Set ETag and Cache-Control ONLY on 2xx responses (never 404/4xx/5xx)
        if 200 <= response.status_code < 300:
            response.headers["ETag"] = etag
            response.headers["Cache-Control"] = cache_control
        else:
            if "ETag" in response.headers:
                del response.headers["ETag"]
            if "etag" in response.headers:
                del response.headers["etag"]
            if "Cache-Control" in response.headers and "public" in response.headers["Cache-Control"]:
                del response.headers["Cache-Control"]

        return response

