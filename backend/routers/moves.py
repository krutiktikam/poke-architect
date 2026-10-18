from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Move
from ..schemas import MoveBase

router = APIRouter(prefix="/moves", tags=["moves"])


@router.get("", response_model=list[MoveBase])
@router.get("/", response_model=list[MoveBase], include_in_schema=False)
def get_moves(
    db: Session = Depends(get_db),  # noqa: B008
    limit: int = Query(default=50, ge=1, le=1000, description="Page size"),
    offset: int = Query(default=0, ge=0, description="Offset for pagination"),
    skip: int | None = Query(default=None, ge=0, description="Alias for offset"),
    type: str | None = Query(default=None, description="Filter by move type"),
    damage_class: str | None = Query(default=None, description="Filter by damage class"),
    search: str | None = Query(default=None, description="Filter by move name"),
):
    query = db.query(Move)
    if search:
        query = query.filter(Move.name.ilike(f"%{search}%"))
    if type:
        query = query.filter(func.lower(Move.type) == type.lower())
    if damage_class:
        query = query.filter(func.lower(Move.damage_class) == damage_class.lower())

    actual_offset = skip if skip is not None else offset
    return query.order_by(Move.id).offset(actual_offset).limit(limit).all()


@router.get("/{id_or_name}", response_model=MoveBase)
def get_move(
    id_or_name: str,
    db: Session = Depends(get_db),  # noqa: B008
):
    if id_or_name.isdigit():
        move = db.query(Move).filter(Move.id == int(id_or_name)).first()
    else:
        normalized = id_or_name.strip().lower()
        move = db.query(Move).filter(func.lower(Move.name) == normalized).first()
        if not move:
            alt1 = normalized.replace("-", " ")
            alt2 = normalized.replace(" ", "-")
            move = db.query(Move).filter(func.lower(Move.name).in_([alt1, alt2])).first()

    if not move:
        raise HTTPException(status_code=404, detail="Move not found")
    return move
