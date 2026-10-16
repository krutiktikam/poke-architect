from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
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
    search: Optional[str] = None
):
    query = db.query(models.Item)
    if search:
        query = query.filter(models.Item.name.ilike(f"%{search}%"))
    items = query.offset(skip).limit(limit).all()
    return items

@router.get("/items/{item_id}", response_model=schemas.ItemResponse)
def get_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return item