from typing import Dict, List, Optional, Tuple
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..database import get_db
from ..models import (
    Pokemon,
    Encounter,
    LocationArea,
    Location,
    Region,
    Version,
    EncounterMethod,
    EncounterConditionValue,
    encounter_condition_value_map,
)
from ..schemas import (
    LocationEncountersResponse,
    LocationAreaEncountersSchema,
    EncounterDetailSchema,
    EncounterVersionSchema,
    EncounterMethodSchema,
    RegionBriefSchema,
)

router = APIRouter(prefix="/api", tags=["encounters"])


@router.get(
    "/pokemon/{id}/encounters",
    response_model=List[LocationEncountersResponse],
)
def get_pokemon_encounters(
    id: int,
    version_id: Optional[int] = Query(None, description="Filter by game version ID"),
    db: Session = Depends(get_db),
):
    """
    Retrieves and aggregates wild encounters for a Pokémon, grouped by Location and Location Area.
    Uses column-select joins (no ORM hydration) and batch condition loading (zero N+1 queries).
    Preserves NULL chance for gift/static encounters.
    """
    # 1. 404 if Pokemon does not exist
    pokemon_exists = db.scalar(select(Pokemon.id).where(Pokemon.id == id))
    if not pokemon_exists:
        raise HTTPException(status_code=404, detail=f"Pokemon {id} not found")

    # 2. Query raw encounter columns with explicit joins
    stmt = (
        select(
            Encounter.id,
            Encounter.version_id,
            Version.identifier.label("version_identifier"),
            Version.name.label("version_name"),
            Encounter.location_area_id,
            LocationArea.name.label("area_name"),
            LocationArea.identifier.label("area_identifier"),
            Location.id.label("location_id"),
            Location.name.label("location_name"),
            Location.identifier.label("location_identifier"),
            Region.id.label("region_id"),
            Region.name.label("region_name"),
            Region.identifier.label("region_identifier"),
            EncounterMethod.id.label("method_id"),
            EncounterMethod.identifier.label("method_identifier"),
            EncounterMethod.name.label("method_name"),
            Encounter.min_level,
            Encounter.max_level,
            Encounter.chance,
        )
        .join(LocationArea, Encounter.location_area_id == LocationArea.id)
        .join(Location, LocationArea.location_id == Location.id)
        .outerjoin(Region, Location.region_id == Region.id)
        .join(Version, Encounter.version_id == Version.id)
        .join(EncounterMethod, Encounter.method_id == EncounterMethod.id)
        .where(Encounter.pokemon_id == id)
    )

    if version_id is not None:
        stmt = stmt.where(Encounter.version_id == version_id)

    stmt = stmt.order_by(Location.id, LocationArea.id, Version.id, Encounter.min_level)
    rows = db.execute(stmt).all()

    # Empty list if Pokémon has no encounters
    if not rows:
        return []

    # 3. Load conditions in ONE extra query (no N+1 per row)
    encounter_ids = [r.id for r in rows]
    cond_stmt = (
        select(
            encounter_condition_value_map.c.encounter_id,
            EncounterConditionValue.identifier,
        )
        .join(
            EncounterConditionValue,
            encounter_condition_value_map.c.condition_value_id == EncounterConditionValue.id,
        )
        .where(encounter_condition_value_map.c.encounter_id.in_(encounter_ids))
    )
    cond_rows = db.execute(cond_stmt).all()
    cond_map: Dict[int, List[str]] = defaultdict(list)
    for c_enc_id, c_val in cond_rows:
        cond_map[c_enc_id].append(c_val)

    # 4. Aggregate: group by (version, location, area, method, min_level, max_level, conditions); sum chance
    # Intermediate structure:
    # location_id -> {
    #     "meta": (loc_id, loc_name, loc_identifier, reg_id, reg_name, reg_identifier),
    #     "areas": area_id -> {
    #         "meta": (area_id, area_name, area_identifier),
    #         "slots": group_key -> {"chance": sum_chance or None, "details": ...}
    #     }
    # }
    locations_dict: Dict[int, Dict] = {}

    for r in rows:
        loc_id = r.location_id
        if loc_id not in locations_dict:
            locations_dict[loc_id] = {
                "id": loc_id,
                "name": r.location_name,
                "identifier": r.location_identifier,
                "region": (
                    {
                        "id": r.region_id,
                        "name": r.region_name,
                        "identifier": r.region_identifier,
                    }
                    if r.region_id
                    else None
                ),
                "areas": {},
            }

        area_id = r.location_area_id
        if area_id not in locations_dict[loc_id]["areas"]:
            locations_dict[loc_id]["areas"][area_id] = {
                "id": area_id,
                "name": r.area_name,
                "identifier": r.area_identifier,
                "slots": {},
            }

        conditions = tuple(sorted(cond_map.get(r.id, [])))
        slot_key = (
            r.version_id,
            r.method_id,
            r.min_level,
            r.max_level,
            conditions,
        )

        area_slots = locations_dict[loc_id]["areas"][area_id]["slots"]
        if slot_key not in area_slots:
            area_slots[slot_key] = {
                "version": {
                    "id": r.version_id,
                    "name": r.version_name,
                    "identifier": r.version_identifier,
                },
                "method": {
                    "id": r.method_id,
                    "name": r.method_name,
                    "identifier": r.method_identifier,
                },
                "min_level": r.min_level,
                "max_level": r.max_level,
                "chance": r.chance,  # can be None for gifts/static
                "conditions": list(conditions),
            }
        else:
            # Sum chance; if either or both are numbers, sum them. If all are None, stays None.
            current_chance = area_slots[slot_key]["chance"]
            if r.chance is not None:
                if current_chance is None:
                    area_slots[slot_key]["chance"] = r.chance
                else:
                    area_slots[slot_key]["chance"] = current_chance + r.chance

    # 5. Build final grouped response
    response: List[LocationEncountersResponse] = []
    for loc_data in locations_dict.values():
        areas_list: List[LocationAreaEncountersSchema] = []
        for area_data in loc_data["areas"].values():
            encounters_list = [
                EncounterDetailSchema(**slot_data)
                for slot_data in area_data["slots"].values()
            ]
            areas_list.append(
                LocationAreaEncountersSchema(
                    id=area_data["id"],
                    name=area_data["name"],
                    identifier=area_data["identifier"],
                    encounters=encounters_list,
                )
            )
        response.append(
            LocationEncountersResponse(
                id=loc_data["id"],
                name=loc_data["name"],
                identifier=loc_data["identifier"],
                region=RegionBriefSchema(**loc_data["region"])
                if loc_data["region"]
                else None,
                areas=areas_list,
            )
        )

    return response
