from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Nature
from ..schemas import NatureBase

router = APIRouter(prefix="/natures", tags=["natures"])


@router.get("", response_model=list[NatureBase])
@router.get("/", response_model=list[NatureBase], include_in_schema=False)
def get_natures(
    db: Session = Depends(get_db),  # noqa: B008
    limit: int = Query(default=50, ge=1, le=1000, description="Page size"),
    offset: int = Query(default=0, ge=0, description="Offset for pagination"),
    skip: int | None = Query(default=None, ge=0, description="Alias for offset"),
    search: str | None = Query(default=None, description="Filter by nature name"),
):
    query = db.query(Nature)
    if search:
        query = query.filter(Nature.name.ilike(f"%{search}%"))

    actual_offset = skip if skip is not None else offset
    return query.order_by(Nature.id).offset(actual_offset).limit(limit).all()


@router.get("/{id_or_name}", response_model=NatureBase)
def get_nature(
    id_or_name: str,
    db: Session = Depends(get_db),  # noqa: B008
):
    if id_or_name.isdigit():
        nature = db.query(Nature).filter(Nature.id == int(id_or_name)).first()
    else:
        normalized = id_or_name.strip().lower()
        nature = db.query(Nature).filter(func.lower(Nature.name) == normalized).first()

    if not nature:
        raise HTTPException(status_code=404, detail="Nature not found")
    return nature
