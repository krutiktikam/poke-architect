from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from ..database import get_db
from .. import models
from .. import schemas

router = APIRouter(prefix="/api", tags=["compendium"])

# Abilities endpoints
@router.get("/abilities", response_model=List[schemas.AbilityResponse])
def get_abilities(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = Query(default=100, lte=1000),
    search: Optional[str] = None
):
    query = db.query(models.Ability)
    if search:
        query = query.filter(models.Ability.name.ilike(f"%{search}%"))
    abilities = query.offset(skip).limit(limit).all()
    return abilities

@router.get("/abilities/{ability_id}", response_model=schemas.AbilityResponse)
def get_ability(ability_id: int, db: Session = Depends(get_db)):
    ability = db.query(models.Ability).filter(models.Ability.id == ability_id).first()
    if ability is None:
        raise HTTPException(status_code=404, detail="Ability not found")
    return ability

# Items endpoints
@router.get("/items", response_model=List[schemas.ItemResponse])
def get_items(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = Query(default=100, lte=1000),
    search: Optional[str] = None,
    holdable: Optional[bool] = None,
    sort: Optional[str] = None,
):
    query = db.query(models.Item).options(
        joinedload(models.Item.item_effect),
        joinedload(models.Item.item_category),
    )
    if search:
        query = query.filter(models.Item.name.ilike(f"%{search}%"))
    if holdable is not None:
        query = query.filter(models.Item.is_holdable == holdable)
    if sort == "name":
        query = query.order_by(models.Item.name.asc(), models.Item.id.asc())

    items = query.offset(skip).limit(limit).all()
    return [
        schemas.ItemResponse(
            id=item.id,
            name=item.name,
            effect=item.item_effect.effect if (item.item_effect and item.item_effect.effect) else item.effect,
            short_effect=item.item_effect.short_effect if item.item_effect else None,
            sprite_url=item.sprite_url,
            category=item.category or (item.item_category.name if item.item_category else "General"),
            is_holdable=bool(item.is_holdable),
        )
        for item in items
    ]

@router.get("/items/{item_id}", response_model=schemas.ItemResponse)
def get_item(item_id: int, db: Session = Depends(get_db)):
    item = (
        db.query(models.Item)
        .options(
            joinedload(models.Item.item_effect),
            joinedload(models.Item.item_category),
        )
        .filter(models.Item.id == item_id)
        .first()
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return schemas.ItemResponse(
        id=item.id,
        name=item.name,
        effect=item.item_effect.effect if (item.item_effect and item.item_effect.effect) else item.effect,
        short_effect=item.item_effect.short_effect if item.item_effect else None,
        sprite_url=item.sprite_url,
        category=item.category or (item.item_category.name if item.item_category else "General"),
        is_holdable=bool(item.is_holdable),
    )