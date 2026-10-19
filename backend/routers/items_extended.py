from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import select

from ..database import get_db
from ..models import ItemPocket, ItemCategory, Item, ItemEffect, Berry, BerryFlavorMap
from ..schemas import (
    ItemPocketSchema,
    PocketCategorySchema,
    PocketItemSchema,
    ItemEffectResponse,
    BerryResponse,
    BerryFlavorSchema,
)

router = APIRouter(prefix="/api", tags=["items"])


@router.get("/items/pockets", response_model=List[ItemPocketSchema])
def get_item_pockets(
    db: Session = Depends(get_db),
):
    """
    Returns item pockets hierarchical structure: pockets -> categories -> items (id, identifier, name, short_effect).
    Eagerly loads relationships via selectinload/joinedload to bound SQL query count.
    """
    stmt = (
        select(ItemPocket)
        .options(
            selectinload(ItemPocket.categories)
            .selectinload(ItemCategory.items)
            .joinedload(Item.item_effect)
        )
        .order_by(ItemPocket.id)
    )
    pockets = db.scalars(stmt).all()

    result: List[ItemPocketSchema] = []
    for pocket in pockets:
        categories_list: List[PocketCategorySchema] = []
        for cat in pocket.categories:
            items_list = [
                PocketItemSchema(
                    id=item.id,
                    identifier=item.name.lower().replace(" ", "-"),
                    name=item.name,
                    short_effect=item.item_effect.short_effect if item.item_effect else None,
                    is_holdable=bool(item.is_holdable),
                )
                for item in cat.items
            ]
            categories_list.append(
                PocketCategorySchema(
                    id=cat.id,
                    name=cat.name,
                    items=items_list,
                )
            )
        result.append(
            ItemPocketSchema(
                id=pocket.id,
                name=pocket.name,
                categories=categories_list,
            )
        )

    return result


@router.get("/items/{item_id}/effect", response_model=ItemEffectResponse)
def get_item_effect(
    item_id: int,
    db: Session = Depends(get_db),
):
    """
    Returns effect prose and short effect for a specific item.
    Returns 404 if the item does not exist.
    """
    item = db.query(Item).filter(Item.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")

    effect_row = db.query(ItemEffect).filter(ItemEffect.item_id == item_id).first()
    short_effect = effect_row.short_effect if effect_row else None
    effect = effect_row.effect if effect_row else item.effect

    return ItemEffectResponse(
        item_id=item_id,
        short_effect=short_effect,
        effect=effect,
    )



@router.get("/berries", response_model=List[BerryResponse])
def get_berries(
    limit: int = Query(default=50, ge=1, le=100, description="Page limit (max 100)"),
    offset: int = Query(default=0, ge=0, description="Page offset"),
    db: Session = Depends(get_db),
):
    """
    Returns berry statistics and potency per flavor.
    Supports limit and offset with joined loads (zero N+1 queries).
    """
    stmt = (
        select(Berry)
        .options(
            joinedload(Berry.item),
            joinedload(Berry.firmness),
            selectinload(Berry.flavors).joinedload(BerryFlavorMap.flavor),
        )
        .order_by(Berry.id)
        .offset(offset)
        .limit(limit)
    )
    berries = db.scalars(stmt).all()

    response: List[BerryResponse] = []
    for b in berries:
        flavors_list = [
            BerryFlavorSchema(
                id=f.flavor_id,
                name=f.flavor.name if f.flavor else f"flavor-{f.flavor_id}",
                potency=f.potency,
            )
            for f in b.flavors
        ]
        response.append(
            BerryResponse(
                id=b.id,
                name=b.name,
                item_id=b.item_id,
                item_name=b.item.name if b.item else None,
                firmness=b.firmness.name if b.firmness else None,
                growth_time=b.growth_time,
                max_harvest=b.max_harvest,
                size=b.size,
                smoothness=b.smoothness,
                soil_dryness=b.soil_dryness,
                natural_gift_power=b.natural_gift_power,
                natural_gift_type=b.natural_gift_type,
                flavors=flavors_list,
            )
        )

    return response
