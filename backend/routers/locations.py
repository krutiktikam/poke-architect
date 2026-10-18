from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import func, select

from ..database import get_db
from ..models import Location, LocationArea, Region, Encounter, Version, VersionGroup
from ..schemas import (
    LocationListResponse,
    LocationListItem,
    LocationDetailResponse,
    LocationAreaBrief,
    RegionBriefSchema,
    VersionResponse,
    RegionResponse,
)

router = APIRouter(prefix="/api", tags=["locations"])


@router.get("/locations", response_model=LocationListResponse)
def get_locations(
    limit: int = Query(default=50, ge=1, le=200, description="Page size (max 200)"),
    offset: int = Query(default=0, ge=0, description="Offset for pagination"),
    region_id: Optional[int] = Query(None, description="Filter by region ID"),
    region: Optional[str] = Query(None, description="Filter by region identifier"),
    search: Optional[str] = Query(None, description="Search location name or identifier"),
    db: Session = Depends(get_db),
):
    """
    Returns a paginated list of locations with optional filters for region and name.
    Uses joinedload for Region to ensure bounded, single-query execution.
    """
    stmt = select(Location).options(joinedload(Location.region))
    count_stmt = select(func.count(Location.id))

    if region_id is not None:
        stmt = stmt.where(Location.region_id == region_id)
        count_stmt = count_stmt.where(Location.region_id == region_id)

    if region is not None:
        stmt = stmt.join(Region, Location.region_id == Region.id).where(
            Region.identifier == region.lower()
        )
        count_stmt = count_stmt.join(Region, Location.region_id == Region.id).where(
            Region.identifier == region.lower()
        )

    if search:
        search_pattern = f"%{search.strip().lower()}%"
        condition = func.lower(Location.name).like(search_pattern) | func.lower(
            Location.identifier
        ).like(search_pattern)
        stmt = stmt.where(condition)
        count_stmt = count_stmt.where(condition)

    total = db.scalar(count_stmt) or 0
    stmt = stmt.order_by(Location.id).offset(offset).limit(limit)
    locations = db.scalars(stmt).all()

    items = [
        LocationListItem(
            id=loc.id,
            identifier=loc.identifier,
            name=loc.name,
            region=(
                RegionBriefSchema(
                    id=loc.region.id,
                    identifier=loc.region.identifier,
                    name=loc.region.name,
                )
                if loc.region
                else None
            ),
        )
        for loc in locations
    ]

    return LocationListResponse(
        total=total,
        items=items,
        limit=limit,
        offset=offset,
    )


@router.get("/locations/{id}", response_model=LocationDetailResponse)
def get_location_detail(
    id: int,
    db: Session = Depends(get_db),
):
    """
    Returns a location with its areas and, for each area, a count of distinct Pokemon encountered.
    Resolves area counts in a single aggregation query (no per-area N+1 queries).
    """
    stmt = (
        select(Location)
        .options(joinedload(Location.region), selectinload(Location.areas))
        .where(Location.id == id)
    )
    location = db.scalar(stmt)
    if not location:
        raise HTTPException(status_code=404, detail=f"Location {id} not found")

    # Aggregate distinct pokemon encountered per area in ONE query
    area_ids = [a.id for a in location.areas]
    counts_map: Dict[int, int] = {}
    if area_ids:
        count_stmt = (
            select(
                Encounter.location_area_id,
                func.count(func.distinct(Encounter.pokemon_id)),
            )
            .where(Encounter.location_area_id.in_(area_ids))
            .group_by(Encounter.location_area_id)
        )
        counts_map = dict(db.execute(count_stmt).all())

    areas_brief = [
        LocationAreaBrief(
            id=area.id,
            identifier=area.identifier,
            name=area.name,
            game_index=area.game_index,
            pokemon_count=counts_map.get(area.id, 0),
        )
        for area in location.areas
    ]

    return LocationDetailResponse(
        id=location.id,
        identifier=location.identifier,
        name=location.name,
        region=(
            RegionBriefSchema(
                id=location.region.id,
                identifier=location.region.identifier,
                name=location.region.name,
            )
            if location.region
            else None
        ),
        areas=areas_brief,
    )


@router.get("/regions", response_model=List[RegionResponse])
def get_regions(db: Session = Depends(get_db)):
    """
    Returns all regions ordered by id.
    """
    stmt = select(Region).order_by(Region.id.asc())
    return db.scalars(stmt).all()


@router.get("/versions", response_model=List[VersionResponse])
def get_versions(db: Session = Depends(get_db)):
    """
    Returns all versions ordered by version group order then version id.
    """
    stmt = (
        select(
            Version.id,
            Version.identifier,
            Version.name,
            Version.version_group_id,
            VersionGroup.identifier.label("version_group"),
            VersionGroup.generation_id,
        )
        .join(VersionGroup, Version.version_group_id == VersionGroup.id)
        .order_by(VersionGroup.order.asc(), Version.id.asc())
    )
    rows = db.execute(stmt).all()
    return [
        VersionResponse(
            id=r.id,
            identifier=r.identifier,
            name=r.name,
            version_group_id=r.version_group_id,
            version_group=r.version_group,
            version_group_identifier=r.version_group,
            generation_id=r.generation_id,
        )
        for r in rows
    ]
