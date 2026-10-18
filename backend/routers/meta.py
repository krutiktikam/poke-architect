import time
from typing import Optional
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from sqlalchemy import select, text

from ..database import get_db
from ..models import DataMeta
from ..schemas import DataVersionResponse

router = APIRouter(prefix="/api", tags=["meta"])

# In-memory cache for 60 seconds
_meta_cache: Optional[DataVersionResponse] = None
_meta_cache_time: float = 0.0


def reset_meta_cache() -> None:
    """Clears the in-memory meta cache (useful for testing)."""
    global _meta_cache, _meta_cache_time
    _meta_cache = None
    _meta_cache_time = 0.0


@router.get("/meta/data-version", response_model=DataVersionResponse)
def get_data_version(response: Response, db: Session = Depends(get_db)):
    """
    Returns data version metadata including pokeapi_ref, ingested_at, and alembic schema_revision.
    Cached in memory for 60 seconds.
    """
    response.headers["Cache-Control"] = "no-cache"
    global _meta_cache, _meta_cache_time
    now = time.time()
    if _meta_cache is not None and (now - _meta_cache_time < 60.0):
        return _meta_cache

    ref_row = db.execute(
        select(DataMeta.value).where(DataMeta.key == "pokeapi_ref")
    ).scalar()
    ingested_row = db.execute(
        select(DataMeta.value).where(DataMeta.key == "ingested_at")
    ).scalar()

    # Query current alembic schema revision
    schema_revision: Optional[str] = None
    try:
        schema_revision = db.execute(
            text("SELECT version_num FROM alembic_version")
        ).scalar()
    except Exception:
        schema_revision = None

    if ref_row and ingested_row:
        data_ver = f"{ref_row}:{ingested_row}"
    else:
        data_ver = "unseeded"

    result = DataVersionResponse(
        data_version=data_ver,
        pokeapi_ref=ref_row,
        ingested_at=ingested_row,
        schema_revision=schema_revision,
    )

    _meta_cache = result
    _meta_cache_time = now
    return result
