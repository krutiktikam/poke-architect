from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..database import get_db
from ..models import Pokemon, Move, PokemonMove, PokemonMoveMethod, VersionGroup
from .. import schemas

router = APIRouter(prefix="/api", tags=["learnsets"])


@router.get(
    "/pokemon/{pokemon_id}/moves",
    response_model=schemas.PokemonLearnsetResponse,
)
def get_pokemon_learnset(
    pokemon_id: int = Path(..., ge=1, description="Pokemon ID"),
    version_group: str = Query(
        ...,
        min_length=1,
        max_length=64,
        description="Version group identifier (e.g. red-blue)",
    ),
    method: Optional[str] = Query(
        None,
        max_length=64,
        description="Move learn method identifier (e.g. level-up, machine)",
    ),
    db: Session = Depends(get_db),
):
    """
    Retrieves learnset moves for a Pokémon in a specific game version group.
    Uses a single joined query without N+1 overhead.
    """
    # 1. 404 if Pokemon does not exist
    pokemon_exists = db.scalar(select(Pokemon.id).where(Pokemon.id == pokemon_id))
    if not pokemon_exists:
        raise HTTPException(status_code=404, detail=f"Pokemon {pokemon_id} not found")

    # 2. 404 if VersionGroup identifier does not exist
    vg = db.execute(
        select(
            VersionGroup.id,
            VersionGroup.identifier,
            VersionGroup.generation_id,
        ).where(VersionGroup.identifier == version_group)
    ).first()
    if not vg:
        raise HTTPException(
            status_code=404, detail=f"Version group '{version_group}' not found"
        )

    # 3. Single joined query: PokemonMove + Move + PokemonMoveMethod
    stmt = (
        select(
            Move,
            PokemonMoveMethod.identifier.label("method_identifier"),
            PokemonMove.level,
            PokemonMove.order,
        )
        .join(Move, PokemonMove.move_id == Move.id)
        .join(PokemonMoveMethod, PokemonMove.method_id == PokemonMoveMethod.id)
        .where(
            PokemonMove.pokemon_id == pokemon_id,
            PokemonMove.version_group_id == vg.id,
        )
    )

    if method:
        stmt = stmt.where(PokemonMoveMethod.identifier == method)

    stmt = stmt.order_by(
        PokemonMove.method_id.asc(),
        PokemonMove.level.asc(),
        PokemonMove.order.asc(),
        Move.name.asc(),
    )

    rows = db.execute(stmt).all()

    learnset_moves = [
        schemas.LearnsetMove(
            move=schemas.MoveBase.model_validate(r[0]),
            method=r[1],
            level=r[2],
            order=r[3],
        )
        for r in rows
    ]

    return schemas.PokemonLearnsetResponse(
        pokemon_id=pokemon_id,
        version_group=schemas.VersionGroupBrief(
            id=vg.id,
            identifier=vg.identifier,
            generation_id=vg.generation_id,
        ),
        total=len(learnset_moves),
        moves=learnset_moves,
    )
