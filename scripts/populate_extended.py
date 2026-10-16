#!/usr/bin/env python3
"""
PokéArchitect CSV-Based Ingestion Pipeline.

Streams, batches, and upserts PokéAPI CSV datasets from GitHub or local directory.
Supports SQLite locally and PostgreSQL in production.

Usage:
    python scripts/populate_extended.py --all
    python scripts/populate_extended.py --reference
    python scripts/populate_extended.py --pockets
    python scripts/populate_extended.py --items
    python scripts/populate_extended.py --berries
    python scripts/populate_extended.py --locations
    python scripts/populate_extended.py --encounter-meta
    python scripts/populate_extended.py --encounters
    python scripts/populate_extended.py --evolutions
    python scripts/populate_extended.py --all --dry-run
    python scripts/populate_extended.py --all --csv-dir /path/to/csvs
"""

import argparse
import csv
import logging
import os
import random
import sys
import time
from collections import Counter
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Sequence, Set, Tuple

# Ensure repository root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import httpx
from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session

from backend.database import SessionLocal, engine
from backend.models import (
    Berry,
    BerryFirmness,
    BerryFlavor,
    BerryFlavorMap,
    DataMeta,
    Encounter,
    EncounterCondition,
    EncounterConditionValue,
    encounter_condition_value_map,
    EncounterMethod,
    Evolution,
    EvolutionChain,
    EvolutionTrigger,
    Generation,
    Item,
    ItemCategory,
    ItemPocket,
    Location,
    LocationArea,
    Move,
    Pokemon,
    PokemonSpecies,
    Region,
    Type,
    Version,
    VersionGroup,
)

DEFAULT_REF: str = "master"
FLAVOR_NAMES: Dict[int, str] = {
    1: "spicy",
    2: "dry",
    3: "sweet",
    4: "bitter",
    5: "sour",
}

STAGE_DEPENDENCY_ORDER: List[str] = [
    "reference",
    "pockets",
    "items",
    "berries",
    "locations",
    "encounter_meta",
    "encounters",
    "evolutions",
]

logger = logging.getLogger("populate_extended")


def _parse_fk(val: Optional[Any]) -> Optional[int]:
    """
    Parses a foreign key value. Returns None if empty or non-positive.
    """
    if val is None or val == "":
        return None
    try:
        iv = int(val)
        return iv if iv > 0 else None
    except (ValueError, TypeError):
        return None


# ==========================================
# Upsert Helper (Dialect-Specific)
# ==========================================

def upsert(
    session: Session,
    table_or_model: Any,
    rows: List[Dict[str, Any]],
    conflict_cols: List[str],
    update_cols: Optional[List[str]] = None,
    chunk_size: int = 500,
) -> int:
    """
    Performs dialect-specific batch upsert (PostgreSQL & SQLite).
    Uses on_conflict_do_update or on_conflict_do_nothing.
    """
    if not rows:
        return 0

    target = getattr(table_or_model, "__table__", table_or_model)
    bind = session.get_bind()
    dialect = bind.dialect.name

    if dialect == "postgresql":
        insert_fn = pg_insert
    elif dialect == "sqlite":
        insert_fn = sqlite_insert
    else:
        raise ValueError(f"Unsupported database dialect: {dialect}")

    # Determine columns to update on conflict
    if update_cols is None:
        update_cols = [k for k in rows[0].keys() if k not in conflict_cols]

    # Normalize all row dictionaries to have identical keys
    all_keys = list(rows[0].keys())
    normalized_rows = [{k: r.get(k) for k in all_keys} for r in rows]

    total_inserted = 0
    for i in range(0, len(normalized_rows), chunk_size):
        batch = normalized_rows[i : i + chunk_size]
        stmt = insert_fn(target).values(batch)
        if update_cols:
            update_dict = {col: getattr(stmt.excluded, col) for col in update_cols}
            stmt = stmt.on_conflict_do_update(
                index_elements=conflict_cols, set_=update_dict
            )
        else:
            stmt = stmt.on_conflict_do_nothing(index_elements=conflict_cols)

        session.execute(stmt)
        total_inserted += len(batch)

    return total_inserted


# ==========================================
# Network, Caching & CSV Readers
# ==========================================

def download_file(
    url: str,
    target_path: str,
    max_retries: int = 5,
    timeout: float = 30.0,
) -> None:
    """
    Downloads file using httpx with exponential backoff, jitter, and Retry-After handling.
    """
    os.makedirs(os.path.dirname(os.path.abspath(target_path)), exist_ok=True)
    temp_path = f"{target_path}.tmp.{os.getpid()}"

    with httpx.Client(timeout=timeout) as client:
        for attempt in range(1, max_retries + 1):
            try:
                response = client.get(url)
                if response.status_code == 429:
                    retry_after = response.headers.get("Retry-After")
                    wait_time = (
                        float(retry_after)
                        if retry_after and retry_after.isdigit()
                        else (2**attempt) + random.uniform(0.1, 0.5)
                    )
                    logger.warning(
                        "Rate-limited (429) downloading %s. Retrying in %.2fs...",
                        url,
                        wait_time,
                    )
                    time.sleep(wait_time)
                    continue

                response.raise_for_status()
                with open(temp_path, "wb") as f:
                    f.write(response.content)
                os.replace(temp_path, target_path)
                return
            except (httpx.RequestError, httpx.HTTPStatusError) as e:
                if attempt == max_retries:
                    if os.path.exists(temp_path):
                        os.remove(temp_path)
                    raise
                wait_time = (2**attempt) + random.uniform(0.1, 0.5)
                logger.warning(
                    "Download error on attempt %d for %s: %s. Retrying in %.2fs...",
                    attempt,
                    url,
                    e,
                    wait_time,
                )
                time.sleep(wait_time)


def get_csv_path(
    filename: str,
    csv_dir: Optional[str] = None,
    ref: str = DEFAULT_REF,
) -> str:
    """
    Resolves local or cached CSV path; downloads from GitHub raw if not cached.
    """
    if csv_dir:
        candidate = os.path.join(csv_dir, filename)
        if os.path.exists(candidate):
            return candidate
        raise FileNotFoundError(
            f"CSV file '{filename}' not found in provided --csv-dir: {csv_dir}"
        )

    cache_dir = os.path.join(".cache", "pokeapi_csv", ref)
    cached_path = os.path.join(cache_dir, filename)
    if os.path.exists(cached_path):
        return cached_path

    url = f"https://raw.githubusercontent.com/PokeAPI/pokeapi/{ref}/data/v2/csv/{filename}"
    logger.info("Downloading %s from %s...", filename, url)
    download_file(url, cached_path)
    return cached_path


def get_optional_csv_path(
    filename: str,
    csv_dir: Optional[str] = None,
    ref: str = DEFAULT_REF,
) -> Optional[str]:
    """
    Attempts to locate or download optional CSV (e.g. name translation files).
    Returns None if missing.
    """
    try:
        return get_csv_path(filename, csv_dir=csv_dir, ref=ref)
    except Exception as e:
        logger.debug("Optional CSV '%s' not found: %s", filename, e)
        return None


def read_csv_rows(
    csv_path: str,
    required_columns: Optional[Sequence[str]] = None,
) -> List[Dict[str, Optional[str]]]:
    """
    Parses CSV into list of dicts. Converts empty strings to None.
    Validates required columns and raises ValueError with clear error message if any are missing.
    """
    with open(csv_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None:
            raise ValueError(
                f"CSV file '{os.path.basename(csv_path)}' has missing or invalid header."
            )

        if required_columns:
            missing = [c for c in required_columns if c not in reader.fieldnames]
            if missing:
                raise ValueError(
                    f"CSV file '{os.path.basename(csv_path)}' is missing required column(s): {', '.join(missing)}"
                )

        rows: List[Dict[str, Optional[str]]] = []
        for row in reader:
            normalized = {
                k: (v.strip() if v is not None and v.strip() != "" else None)
                for k, v in row.items()
            }
            rows.append(normalized)
        return rows


def load_english_names(
    csv_path: Optional[str],
    id_col: str,
    name_col: str = "name",
) -> Dict[int, str]:
    """
    Extracts English names where local_language_id == '9'.
    """
    if not csv_path or not os.path.exists(csv_path):
        return {}
    rows = read_csv_rows(
        csv_path, required_columns=[id_col, "local_language_id", name_col]
    )
    names: Dict[int, str] = {}
    for r in rows:
        if r.get("local_language_id") == "9" and r.get(id_col) and r.get(name_col):
            try:
                names[int(r[id_col])] = r[name_col]  # type: ignore[arg-type]
            except ValueError:
                continue
    return names


# ==========================================
# Pipeline Stages
# ==========================================

def populate_reference(
    session: Session,
    csv_dir: Optional[str] = None,
    ref: str = DEFAULT_REF,
    dry_run: bool = False,
    orphan_counts: Optional[Dict[str, int]] = None,
) -> Dict[str, int]:
    """
    Populates reference tables: generations (if missing), types, regions, version_groups, versions.
    """
    logger.info("Executing stage: populate_reference")
    counts: Dict[str, int] = {}

    # 1. Generations check / population
    gen_count = session.execute(select(func.count(Generation.id))).scalar() or 0
    gen_csv = get_optional_csv_path("generations.csv", csv_dir=csv_dir, ref=ref)
    if gen_count == 0 and gen_csv:
        gen_names = load_english_names(
            get_optional_csv_path("generation_names.csv", csv_dir=csv_dir, ref=ref),
            id_col="generation_id",
        )
        gen_rows = read_csv_rows(gen_csv, required_columns=["id", "identifier"])
        items_to_upsert = [
            {
                "id": int(r["id"]),  # type: ignore[arg-type]
                "identifier": r["identifier"],
                "name": gen_names.get(
                    int(r["id"]),  # type: ignore[arg-type]
                    r["identifier"].replace("-", " ").title(),  # type: ignore[union-attr]
                ),
            }
            for r in gen_rows
            if r.get("id")
        ]
        counts["generations"] = upsert(
            session, Generation, items_to_upsert, conflict_cols=["id"]
        )
    elif gen_count == 0:
        raise RuntimeError(
            "Prerequisite missing: generations table is empty and generations.csv not found. "
            "Please ensure generations are available."
        )

    # 2. Types
    type_csv = get_optional_csv_path("types.csv", csv_dir=csv_dir, ref=ref)
    if type_csv:
        type_rows = read_csv_rows(type_csv, required_columns=["id", "identifier"])
        type_items = [
            {
                "id": int(r["id"]),  # type: ignore[arg-type]
                "identifier": r["identifier"],
                "generation_id": int(r["generation_id"]) if r.get("generation_id") else None,
            }
            for r in type_rows
            if r.get("id")
        ]
        counts["types"] = upsert(session, Type, type_items, conflict_cols=["id"])

    # 3. Regions
    reg_csv = get_csv_path("regions.csv", csv_dir=csv_dir, ref=ref)
    reg_names = load_english_names(
        get_optional_csv_path("region_names.csv", csv_dir=csv_dir, ref=ref),
        id_col="region_id",
    )
    reg_rows = read_csv_rows(reg_csv, required_columns=["id", "identifier"])
    reg_items = [
        {
            "id": int(r["id"]),  # type: ignore[arg-type]
            "identifier": r["identifier"],
            "name": reg_names.get(
                int(r["id"]),  # type: ignore[arg-type]
                r["identifier"].replace("-", " ").title(),  # type: ignore[union-attr]
            ),
        }
        for r in reg_rows
        if r.get("id")
    ]
    counts["regions"] = upsert(session, Region, reg_items, conflict_cols=["id"])

    # 4. Version Groups
    vg_csv = get_csv_path("version_groups.csv", csv_dir=csv_dir, ref=ref)
    vg_rows = read_csv_rows(
        vg_csv, required_columns=["id", "identifier", "generation_id", "order"]
    )
    vg_items = [
        {
            "id": int(r["id"]),  # type: ignore[arg-type]
            "identifier": r["identifier"],
            "generation_id": int(r["generation_id"]),  # type: ignore[arg-type]
            "order": int(r["order"]),  # type: ignore[arg-type]
        }
        for r in vg_rows
        if r.get("id") and r.get("generation_id") and r.get("order")
    ]
    counts["version_groups"] = upsert(
        session, VersionGroup, vg_items, conflict_cols=["id"]
    )

    # 5. Versions
    ver_csv = get_csv_path("versions.csv", csv_dir=csv_dir, ref=ref)
    ver_names = load_english_names(
        get_optional_csv_path("version_names.csv", csv_dir=csv_dir, ref=ref),
        id_col="version_id",
    )
    ver_rows = read_csv_rows(
        ver_csv, required_columns=["id", "version_group_id", "identifier"]
    )
    ver_items = [
        {
            "id": int(r["id"]),  # type: ignore[arg-type]
            "version_group_id": int(r["version_group_id"]),  # type: ignore[arg-type]
            "identifier": r["identifier"],
            "name": ver_names.get(
                int(r["id"]),  # type: ignore[arg-type]
                r["identifier"].replace("-", " ").title(),  # type: ignore[union-attr]
            ),
        }
        for r in ver_rows
        if r.get("id") and r.get("version_group_id")
    ]
    counts["versions"] = upsert(session, Version, ver_items, conflict_cols=["id"])

    if dry_run:
        session.flush()
    else:
        session.commit()
    return counts


def populate_item_categories_and_pockets(
    session: Session,
    csv_dir: Optional[str] = None,
    ref: str = DEFAULT_REF,
    dry_run: bool = False,
    orphan_counts: Optional[Dict[str, int]] = None,
) -> Dict[str, int]:
    """
    Populates item_pockets and item_categories.
    """
    logger.info("Executing stage: populate_item_categories_and_pockets")
    counts: Dict[str, int] = {}

    # Pockets
    pocket_csv = get_csv_path("item_pockets.csv", csv_dir=csv_dir, ref=ref)
    pocket_rows = read_csv_rows(pocket_csv, required_columns=["id", "identifier"])
    pocket_items = [
        {
            "id": int(r["id"]),  # type: ignore[arg-type]
            "name": r["identifier"].replace("-", " ").title(),  # type: ignore[union-attr]
        }
        for r in pocket_rows
        if r.get("id") and r.get("identifier")
    ]
    counts["item_pockets"] = upsert(
        session, ItemPocket, pocket_items, conflict_cols=["id"]
    )

    # Categories
    cat_csv = get_csv_path("item_categories.csv", csv_dir=csv_dir, ref=ref)
    cat_rows = read_csv_rows(
        cat_csv, required_columns=["id", "pocket_id", "identifier"]
    )
    cat_items = [
        {
            "id": int(r["id"]),  # type: ignore[arg-type]
            "pocket_id": int(r["pocket_id"]) if r.get("pocket_id") else None,
            "name": r["identifier"].replace("-", " ").title(),  # type: ignore[union-attr]
        }
        for r in cat_rows
        if r.get("id") and r.get("identifier")
    ]
    counts["item_categories"] = upsert(
        session, ItemCategory, cat_items, conflict_cols=["id"]
    )

    if dry_run:
        session.flush()
    else:
        session.commit()
    return counts


def populate_items(
    session: Session,
    csv_dir: Optional[str] = None,
    ref: str = DEFAULT_REF,
    dry_run: bool = False,
    orphan_counts: Optional[Dict[str, int]] = None,
) -> Dict[str, int]:
    """
    Populates items from items.csv.
    Inserts missing rows only; never overwrites existing item rows except category_id.
    """
    logger.info("Executing stage: populate_items")
    counts: Dict[str, int] = {}

    # Check prerequisite
    cat_count = session.execute(select(func.count(ItemCategory.id))).scalar() or 0
    if cat_count == 0:
        raise RuntimeError(
            "Prerequisite missing: item_categories is empty. Please run populate_item_categories_and_pockets first."
        )

    valid_category_ids: Set[int] = set(session.scalars(select(ItemCategory.id)).all())

    items_csv = get_csv_path("items.csv", csv_dir=csv_dir, ref=ref)
    item_rows = read_csv_rows(
        items_csv, required_columns=["id", "identifier", "category_id"]
    )

    seen_names: Dict[str, int] = dict(
        session.execute(select(Item.name, Item.id)).all()
    )

    items_to_upsert = []
    for r in item_rows:
        if not r.get("id") or not r.get("identifier"):
            continue
        item_id = int(r["id"])  # type: ignore[arg-type]
        cat_id = _parse_fk(r.get("category_id"))
        if cat_id and cat_id not in valid_category_ids:
            if orphan_counts is not None:
                orphan_counts["item: missing category_id"] += 1
            cat_id = None

        name = r["identifier"].replace("-", " ").title()  # type: ignore[union-attr]
        if name in seen_names and seen_names[name] != item_id:
            name = f"{name} ({item_id})"
        seen_names[name] = item_id

        items_to_upsert.append(
            {
                "id": item_id,
                "name": name,
                "category_id": cat_id,
                "category": None,
                "effect": None,
                "sprite_url": None,
            }
        )

    # Note: update_cols=['category_id'] ensures existing item rows are never overwritten except category_id
    counts["items"] = upsert(
        session,
        Item,
        items_to_upsert,
        conflict_cols=["id"],
        update_cols=["category_id"],
    )

    if dry_run:
        session.flush()
    else:
        session.commit()
    return counts


def populate_berries(
    session: Session,
    csv_dir: Optional[str] = None,
    ref: str = DEFAULT_REF,
    dry_run: bool = False,
    orphan_counts: Optional[Dict[str, int]] = None,
) -> Dict[str, int]:
    """
    Populates berry_firmness, contest_types, berries, and berry_flavors.
    """
    logger.info("Executing stage: populate_berries")
    counts: Dict[str, int] = {}

    # Check prerequisite
    items_count = session.execute(select(func.count(Item.id))).scalar() or 0
    if items_count == 0:
        raise RuntimeError(
            "Prerequisite missing: items table is empty. Please run populate_items first."
        )

    # 1. Berry Firmnesses
    firm_csv = get_csv_path("berry_firmness.csv", csv_dir=csv_dir, ref=ref)
    firm_rows = read_csv_rows(firm_csv, required_columns=["id", "identifier"])
    firm_items = [
        {
            "id": int(r["id"]),  # type: ignore[arg-type]
            "name": r["identifier"].replace("-", " ").title(),  # type: ignore[union-attr]
        }
        for r in firm_rows
        if r.get("id") and r.get("identifier")
    ]
    counts["berry_firmnesses"] = upsert(
        session, BerryFirmness, firm_items, conflict_cols=["id"]
    )

    # 2. Berry Flavors / Contest Types
    ct_csv = get_optional_csv_path("contest_types.csv", csv_dir=csv_dir, ref=ref)
    if ct_csv:
        ct_rows = read_csv_rows(ct_csv, required_columns=["id", "identifier"])
        ct_items = [
            {
                "id": int(r["id"]),  # type: ignore[arg-type]
                "name": FLAVOR_NAMES.get(
                    int(r["id"]),  # type: ignore[arg-type]
                    r["identifier"].replace("-", " ").title(),  # type: ignore[union-attr]
                ),
            }
            for r in ct_rows
            if r.get("id") and r.get("identifier")
        ]
        counts["berry_flavors"] = upsert(
            session, BerryFlavor, ct_items, conflict_cols=["id"]
        )

    # 3. Berries
    valid_item_ids: Set[int] = set(session.scalars(select(Item.id)).all())
    valid_firmness_ids: Set[int] = set(session.scalars(select(BerryFirmness.id)).all())
    valid_types: Dict[int, str] = dict(session.execute(select(Type.id, Type.identifier)).all())
    item_names: Dict[int, str] = dict(session.execute(select(Item.id, Item.name)).all())

    berries_csv = get_csv_path("berries.csv", csv_dir=csv_dir, ref=ref)
    berry_rows = read_csv_rows(berries_csv, required_columns=["id", "item_id"])

    berry_items = []
    for r in berry_rows:
        if not r.get("id") or not r.get("item_id"):
            continue
        berry_id = int(r["id"])  # type: ignore[arg-type]
        item_id = int(r["item_id"])  # type: ignore[arg-type]

        if item_id not in valid_item_ids:
            if orphan_counts is not None:
                orphan_counts["berry: missing item_id"] += 1
            continue

        firm_id = int(r["firmness_id"]) if r.get("firmness_id") else None
        if firm_id and firm_id not in valid_firmness_ids:
            if orphan_counts is not None:
                orphan_counts["berry: missing firmness_id"] += 1
            firm_id = None

        raw_name = r.get("name")
        if not raw_name:
            item_n = item_names.get(item_id, "")
            raw_name = (
                item_n.replace(" Berry", "").replace(" berry", "").strip().lower()
            )

        gift_type_id = (
            int(r["natural_gift_type_id"]) if r.get("natural_gift_type_id") else None
        )
        gift_type = valid_types.get(gift_type_id) if gift_type_id else None

        berry_items.append(
            {
                "id": berry_id,
                "name": raw_name or f"berry-{berry_id}",
                "growth_time": int(r["growth_time"]) if r.get("growth_time") else None,
                "max_harvest": int(r["max_harvest"]) if r.get("max_harvest") else None,
                "natural_gift_power": int(r["natural_gift_power"])
                if r.get("natural_gift_power")
                else None,
                "size": int(r["size"]) if r.get("size") else None,
                "smoothness": int(r["smoothness"]) if r.get("smoothness") else None,
                "soil_dryness": int(r["soil_dryness"]) if r.get("soil_dryness") else None,
                "firmness_id": firm_id,
                "item_id": item_id,
                "natural_gift_type": gift_type,
            }
        )
    counts["berries"] = upsert(session, Berry, berry_items, conflict_cols=["id"])

    # 4. Berry Flavors Mapping
    bf_csv = get_optional_csv_path("berry_flavors.csv", csv_dir=csv_dir, ref=ref)
    if bf_csv:
        valid_berry_ids: Set[int] = set(session.scalars(select(Berry.id)).all())
        valid_flavor_ids: Set[int] = set(session.scalars(select(BerryFlavor.id)).all())
        bf_rows = read_csv_rows(
            bf_csv, required_columns=["berry_id", "contest_type_id", "flavor"]
        )
        map_items = []
        for r in bf_rows:
            if not r.get("berry_id") or not r.get("contest_type_id"):
                continue
            b_id = int(r["berry_id"])  # type: ignore[arg-type]
            f_id = int(r["contest_type_id"])  # type: ignore[arg-type]
            if b_id not in valid_berry_ids or f_id not in valid_flavor_ids:
                if orphan_counts is not None:
                    orphan_counts["berry_flavor: missing berry_id or flavor_id"] += 1
                continue
            map_id = (b_id * 10) + f_id
            map_items.append(
                {
                    "id": map_id,
                    "berry_id": b_id,
                    "flavor_id": f_id,
                    "potency": int(r["flavor"]) if r.get("flavor") else 0,
                }
            )
        counts["berry_flavor_map"] = upsert(
            session, BerryFlavorMap, map_items, conflict_cols=["id"]
        )

    if dry_run:
        session.flush()
    else:
        session.commit()
    return counts


def populate_locations_and_areas(
    session: Session,
    csv_dir: Optional[str] = None,
    ref: str = DEFAULT_REF,
    dry_run: bool = False,
    orphan_counts: Optional[Dict[str, int]] = None,
) -> Dict[str, int]:
    """
    Populates locations and location_areas with English names.
    """
    logger.info("Executing stage: populate_locations_and_areas")
    counts: Dict[str, int] = {}

    # Check prerequisite
    region_count = session.execute(select(func.count(Region.id))).scalar() or 0
    if region_count == 0:
        raise RuntimeError(
            "Prerequisite missing: regions table is empty. Please run populate_reference first."
        )

    valid_region_ids: Set[int] = set(session.scalars(select(Region.id)).all())

    loc_csv = get_csv_path("locations.csv", csv_dir=csv_dir, ref=ref)
    loc_names = load_english_names(
        get_optional_csv_path("location_names.csv", csv_dir=csv_dir, ref=ref),
        id_col="location_id",
    )
    loc_rows = read_csv_rows(loc_csv, required_columns=["id", "identifier"])

    loc_items = []
    for r in loc_rows:
        if not r.get("id") or not r.get("identifier"):
            continue
        loc_id = int(r["id"])  # type: ignore[arg-type]
        reg_id = int(r["region_id"]) if r.get("region_id") else None
        if reg_id and reg_id not in valid_region_ids:
            if orphan_counts is not None:
                orphan_counts["location: missing region_id"] += 1
            reg_id = None

        name = loc_names.get(loc_id) or r["identifier"].replace("-", " ").title()  # type: ignore[union-attr]
        loc_items.append(
            {
                "id": loc_id,
                "region_id": reg_id,
                "identifier": r["identifier"],
                "name": name,
            }
        )
    counts["locations"] = upsert(session, Location, loc_items, conflict_cols=["id"])

    # Areas
    valid_loc_ids: Set[int] = set(session.scalars(select(Location.id)).all())
    area_csv = get_csv_path("location_areas.csv", csv_dir=csv_dir, ref=ref)
    area_rows = read_csv_rows(area_csv, required_columns=["id", "location_id"])

    area_items = []
    for r in area_rows:
        if not r.get("id") or not r.get("location_id"):
            continue
        area_id = int(r["id"])  # type: ignore[arg-type]
        location_id = int(r["location_id"])  # type: ignore[arg-type]
        if location_id not in valid_loc_ids:
            if orphan_counts is not None:
                orphan_counts["location_area: missing location_id"] += 1
            continue

        raw_identifier = r.get("identifier")
        area_name = (
            raw_identifier.replace("-", " ").title()
            if raw_identifier
            else "Main Area"
        )
        area_items.append(
            {
                "id": area_id,
                "location_id": location_id,
                "game_index": int(r["game_index"]) if r.get("game_index") else None,
                "identifier": raw_identifier,
                "name": area_name,
            }
        )
    counts["location_areas"] = upsert(
        session, LocationArea, area_items, conflict_cols=["id"]
    )

    if dry_run:
        session.flush()
    else:
        session.commit()
    return counts


def populate_encounter_methods_and_conditions(
    session: Session,
    csv_dir: Optional[str] = None,
    ref: str = DEFAULT_REF,
    dry_run: bool = False,
    orphan_counts: Optional[Dict[str, int]] = None,
) -> Dict[str, int]:
    """
    Populates encounter_methods, encounter_conditions, and encounter_condition_values.
    """
    logger.info("Executing stage: populate_encounter_methods_and_conditions")
    counts: Dict[str, int] = {}

    # Methods
    em_csv = get_csv_path("encounter_methods.csv", csv_dir=csv_dir, ref=ref)
    em_names = load_english_names(
        get_optional_csv_path(
            "encounter_method_names.csv", csv_dir=csv_dir, ref=ref
        ),
        id_col="encounter_method_id",
    )
    em_rows = read_csv_rows(em_csv, required_columns=["id", "identifier"])
    em_items = [
        {
            "id": int(r["id"]),  # type: ignore[arg-type]
            "identifier": r["identifier"],
            "name": em_names.get(
                int(r["id"]),  # type: ignore[arg-type]
                r["identifier"].replace("-", " ").title(),  # type: ignore[union-attr]
            ),
            "order": int(r["order"]) if r.get("order") else None,
        }
        for r in em_rows
        if r.get("id") and r.get("identifier")
    ]
    counts["encounter_methods"] = upsert(
        session, EncounterMethod, em_items, conflict_cols=["id"]
    )

    # Conditions
    ec_csv = get_csv_path("encounter_conditions.csv", csv_dir=csv_dir, ref=ref)
    ec_rows = read_csv_rows(ec_csv, required_columns=["id", "identifier"])
    ec_items = [
        {"id": int(r["id"]), "identifier": r["identifier"]}  # type: ignore[arg-type]
        for r in ec_rows
        if r.get("id") and r.get("identifier")
    ]
    counts["encounter_conditions"] = upsert(
        session, EncounterCondition, ec_items, conflict_cols=["id"]
    )

    # Condition Values
    ecv_csv = get_csv_path("encounter_condition_values.csv", csv_dir=csv_dir, ref=ref)
    ecv_rows = read_csv_rows(
        ecv_csv, required_columns=["id", "encounter_condition_id", "identifier"]
    )
    ecv_items = [
        {
            "id": int(r["id"]),  # type: ignore[arg-type]
            "condition_id": int(r["encounter_condition_id"]),  # type: ignore[arg-type]
            "identifier": r["identifier"],
            "is_default": r.get("is_default") in ("1", "true", "True"),
        }
        for r in ecv_rows
        if r.get("id") and r.get("encounter_condition_id") and r.get("identifier")
    ]
    counts["encounter_condition_values"] = upsert(
        session, EncounterConditionValue, ecv_items, conflict_cols=["id"]
    )

    if dry_run:
        session.flush()
    else:
        session.commit()
    return counts


def populate_encounters(
    session: Session,
    csv_dir: Optional[str] = None,
    ref: str = DEFAULT_REF,
    dry_run: bool = False,
    orphan_counts: Optional[Dict[str, int]] = None,
) -> Dict[str, int]:
    """
    Populates encounters by joining encounters.csv with encounter_slots.csv.
    Also fills encounter_condition_value_map association table.
    """
    logger.info("Executing stage: populate_encounters")
    counts: Dict[str, int] = {}

    # Check prerequisites
    if (session.execute(select(func.count(LocationArea.id))).scalar() or 0) == 0:
        raise RuntimeError(
            "Prerequisite missing: location_areas is empty. Please run populate_locations_and_areas first."
        )
    if (session.execute(select(func.count(Version.id))).scalar() or 0) == 0:
        raise RuntimeError(
            "Prerequisite missing: versions is empty. Please run populate_reference first."
        )
    if (session.execute(select(func.count(EncounterMethod.id))).scalar() or 0) == 0:
        raise RuntimeError(
            "Prerequisite missing: encounter_methods is empty. Please run populate_encounter_methods_and_conditions first."
        )

    valid_version_ids: Set[int] = set(session.scalars(select(Version.id)).all())
    valid_location_area_ids: Set[int] = set(
        session.scalars(select(LocationArea.id)).all()
    )
    valid_pokemon_ids: Set[int] = set(session.scalars(select(Pokemon.id)).all())
    valid_method_ids: Set[int] = set(session.scalars(select(EncounterMethod.id)).all())

    # Pre-index encounter slots
    slots_csv = get_csv_path("encounter_slots.csv", csv_dir=csv_dir, ref=ref)
    slot_rows = read_csv_rows(
        slots_csv, required_columns=["id", "encounter_method_id", "slot", "rarity"]
    )
    slot_map: Dict[int, Tuple[int, Optional[int], Optional[int]]] = {}
    for sr in slot_rows:
        if sr.get("id") and sr.get("encounter_method_id"):
            s_id = int(sr["id"])  # type: ignore[arg-type]
            m_id = int(sr["encounter_method_id"])  # type: ignore[arg-type]
            s_val = int(sr["slot"]) if sr.get("slot") else None
            r_val = int(sr["rarity"]) if sr.get("rarity") else None
            slot_map[s_id] = (m_id, s_val, r_val)

    enc_csv = get_csv_path("encounters.csv", csv_dir=csv_dir, ref=ref)
    enc_rows = read_csv_rows(
        enc_csv,
        required_columns=[
            "id",
            "version_id",
            "location_area_id",
            "encounter_slot_id",
            "pokemon_id",
            "min_level",
            "max_level",
        ],
    )

    enc_items = []
    for r in enc_rows:
        if not r.get("id") or not r.get("version_id") or not r.get("location_area_id"):
            continue
        enc_id = int(r["id"])  # type: ignore[arg-type]
        v_id = int(r["version_id"])  # type: ignore[arg-type]
        la_id = int(r["location_area_id"])  # type: ignore[arg-type]
        p_id = int(r["pokemon_id"])  # type: ignore[arg-type]
        slot_id = int(r["encounter_slot_id"]) if r.get("encounter_slot_id") else None

        if v_id not in valid_version_ids:
            if orphan_counts is not None:
                orphan_counts["encounter: missing version_id"] += 1
            continue
        if la_id not in valid_location_area_ids:
            if orphan_counts is not None:
                orphan_counts["encounter: missing location_area_id"] += 1
            continue
        if p_id not in valid_pokemon_ids:
            if orphan_counts is not None:
                orphan_counts["encounter: missing pokemon_id"] += 1
            continue

        if not slot_id or slot_id not in slot_map:
            if orphan_counts is not None:
                orphan_counts["encounter: missing encounter_slot_id"] += 1
            continue

        method_id, slot_num, rarity_val = slot_map[slot_id]
        if method_id not in valid_method_ids:
            if orphan_counts is not None:
                orphan_counts["encounter: missing method_id"] += 1
            continue

        min_lvl = int(r["min_level"]) if r.get("min_level") else 1
        max_lvl = int(r["max_level"]) if r.get("max_level") else min_lvl

        enc_items.append(
            {
                "id": enc_id,
                "version_id": v_id,
                "location_area_id": la_id,
                "pokemon_id": p_id,
                "method_id": method_id,
                "slot": slot_num,
                "chance": rarity_val,  # None for gifts or static
                "min_level": min_lvl,
                "max_level": max_lvl,
            }
        )

    counts["encounters"] = upsert(
        session, Encounter, enc_items, conflict_cols=["id"], chunk_size=500
    )

    # Encounter condition values map
    ecvm_csv = get_optional_csv_path(
        "encounter_condition_value_map.csv", csv_dir=csv_dir, ref=ref
    )
    if ecvm_csv:
        valid_enc_ids: Set[int] = set(session.scalars(select(Encounter.id)).all())
        valid_cv_ids: Set[int] = set(
            session.scalars(select(EncounterConditionValue.id)).all()
        )
        ecvm_rows = read_csv_rows(
            ecvm_csv,
            required_columns=["encounter_id", "encounter_condition_value_id"],
        )
        map_items = []
        for r in ecvm_rows:
            if not r.get("encounter_id") or not r.get("encounter_condition_value_id"):
                continue
            e_id = int(r["encounter_id"])  # type: ignore[arg-type]
            cv_id = int(r["encounter_condition_value_id"])  # type: ignore[arg-type]
            if e_id not in valid_enc_ids or cv_id not in valid_cv_ids:
                if orphan_counts is not None:
                    orphan_counts[
                        "encounter_condition_value_map: missing FK target"
                    ] += 1
                continue
            map_items.append(
                {"encounter_id": e_id, "condition_value_id": cv_id}
            )

        counts["encounter_condition_value_map"] = upsert(
            session,
            encounter_condition_value_map,
            map_items,
            conflict_cols=["encounter_id", "condition_value_id"],
            update_cols=[],  # Composite PK: on conflict do nothing
            chunk_size=500,
        )

    if dry_run:
        session.flush()
    else:
        session.commit()
    return counts


def populate_evolution_chains(
    session: Session,
    csv_dir: Optional[str] = None,
    ref: str = DEFAULT_REF,
    dry_run: bool = False,
    orphan_counts: Optional[Dict[str, int]] = None,
) -> Dict[str, int]:
    """
    Populates evolution_triggers, evolution_chains, pokemon_species, and evolutions.
    Derives from_species_id from pokemon_species.evolves_from_species_id of the evolved species.
    """
    logger.info("Executing stage: populate_evolution_chains")
    counts: Dict[str, int] = {}

    # Check prerequisite
    if (session.execute(select(func.count(Item.id))).scalar() or 0) == 0:
        raise RuntimeError(
            "Prerequisite missing: items is empty. Please run populate_items first."
        )

    # 1. Triggers
    et_csv = get_csv_path("evolution_triggers.csv", csv_dir=csv_dir, ref=ref)
    et_names = load_english_names(
        get_optional_csv_path(
            "evolution_trigger_names.csv", csv_dir=csv_dir, ref=ref
        ),
        id_col="evolution_trigger_id",
    )
    et_rows = read_csv_rows(et_csv, required_columns=["id", "identifier"])
    et_items = [
        {
            "id": int(r["id"]),  # type: ignore[arg-type]
            "identifier": r["identifier"],
            "name": et_names.get(
                int(r["id"]),  # type: ignore[arg-type]
                r["identifier"].replace("-", " ").title(),  # type: ignore[union-attr]
            ),
        }
        for r in et_rows
        if r.get("id") and r.get("identifier")
    ]
    counts["evolution_triggers"] = upsert(
        session, EvolutionTrigger, et_items, conflict_cols=["id"]
    )

    # 2. Chains
    valid_item_ids: Set[int] = set(session.scalars(select(Item.id)).all())
    ec_csv = get_csv_path("evolution_chains.csv", csv_dir=csv_dir, ref=ref)
    ec_rows = read_csv_rows(ec_csv, required_columns=["id"])
    ec_items = []
    for r in ec_rows:
        if not r.get("id"):
            continue
        c_id = int(r["id"])  # type: ignore[arg-type]
        baby_item_id = (
            int(r["baby_trigger_item_id"]) if r.get("baby_trigger_item_id") else None
        )
        if baby_item_id and baby_item_id not in valid_item_ids:
            baby_item_id = None
        ec_items.append({"id": c_id, "baby_trigger_item_id": baby_item_id})
    counts["evolution_chains"] = upsert(
        session, EvolutionChain, ec_items, conflict_cols=["id"]
    )

    # 3. Pokémon Species
    spec_csv = get_csv_path("pokemon_species.csv", csv_dir=csv_dir, ref=ref)
    spec_rows = read_csv_rows(spec_csv, required_columns=["id", "identifier"])

    # Pass 1: Upsert species without self-referential FK to prevent ordering issues
    pass1_items = [
        {
            "id": int(r["id"]),  # type: ignore[arg-type]
            "identifier": r["identifier"],
            "generation_id": int(r["generation_id"]) if r.get("generation_id") else None,
            "order": int(r["order"]) if r.get("order") else None,
            "evolves_from_species_id": None,
            "evolution_chain_id": None,
        }
        for r in spec_rows
        if r.get("id") and r.get("identifier")
    ]
    counts["pokemon_species"] = upsert(
        session,
        PokemonSpecies,
        pass1_items,
        conflict_cols=["id"],
        update_cols=["identifier", "generation_id", "order"],
    )

    # Pass 2: Upsert species with evolves_from_species_id and evolution_chain_id
    species_map: Dict[int, Dict[str, Optional[int]]] = {}
    pass2_items = []
    for r in spec_rows:
        if not r.get("id") or not r.get("identifier"):
            continue
        s_id = int(r["id"])  # type: ignore[arg-type]
        ef_id = (
            int(r["evolves_from_species_id"])
            if r.get("evolves_from_species_id")
            else None
        )
        chain_id = (
            int(r["evolution_chain_id"]) if r.get("evolution_chain_id") else None
        )
        species_map[s_id] = {
            "evolves_from_species_id": ef_id,
            "evolution_chain_id": chain_id,
        }
        pass2_items.append(
            {
                "id": s_id,
                "identifier": r["identifier"],
                "evolves_from_species_id": ef_id,
                "evolution_chain_id": chain_id,
            }
        )
    upsert(
        session,
        PokemonSpecies,
        pass2_items,
        conflict_cols=["id"],
        update_cols=["evolves_from_species_id", "evolution_chain_id"],
    )

    # Also update pokemon.evolution_chain_id if matching pokemon records exist
    for s_id, smap in species_map.items():
        c_id = smap["evolution_chain_id"]
        if c_id:
            session.execute(
                update(Pokemon).where(Pokemon.id == s_id).values(evolution_chain_id=c_id)
            )

    # 4. Evolutions (edges)
    valid_species_ids: Set[int] = set(session.scalars(select(PokemonSpecies.id)).all())
    valid_chain_ids: Set[int] = set(session.scalars(select(EvolutionChain.id)).all())
    valid_trigger_ids: Set[int] = set(session.scalars(select(EvolutionTrigger.id)).all())
    valid_move_ids: Set[int] = set(session.scalars(select(Move.id)).all())
    valid_type_ids: Set[int] = set(session.scalars(select(Type.id)).all())
    valid_location_ids: Set[int] = set(session.scalars(select(Location.id)).all())

    pe_csv = get_csv_path("pokemon_evolution.csv", csv_dir=csv_dir, ref=ref)
    pe_rows = read_csv_rows(
        pe_csv,
        required_columns=["id", "evolved_species_id", "evolution_trigger_id"],
    )

    evo_items = []
    for r in pe_rows:
        if not r.get("id") or not r.get("evolved_species_id"):
            continue
        evo_id = int(r["id"])  # type: ignore[arg-type]
        to_s_id = int(r["evolved_species_id"])  # type: ignore[arg-type]
        trig_id = int(r["evolution_trigger_id"])  # type: ignore[arg-type]

        if to_s_id not in valid_species_ids or to_s_id not in species_map:
            if orphan_counts is not None:
                orphan_counts["evolution: missing to_species_id"] += 1
            continue

        from_s_id = species_map[to_s_id]["evolves_from_species_id"]
        if from_s_id is None or from_s_id not in valid_species_ids:
            if orphan_counts is not None:
                orphan_counts["evolution: missing from_species_id"] += 1
            continue

        c_id = species_map[to_s_id]["evolution_chain_id"]
        if c_id is None or c_id not in valid_chain_ids:
            if orphan_counts is not None:
                orphan_counts["evolution: missing chain_id"] += 1
            continue

        if trig_id not in valid_trigger_ids:
            if orphan_counts is not None:
                orphan_counts["evolution: missing trigger_id"] += 1
            continue

        # Optional FK checks
        trig_item_id = _parse_fk(r.get("trigger_item_id"))
        if trig_item_id and trig_item_id not in valid_item_ids:
            if orphan_counts is not None:
                orphan_counts["evolution: missing trigger_item_id"] += 1
            continue

        held_item_id = _parse_fk(r.get("held_item_id"))
        if held_item_id and held_item_id not in valid_item_ids:
            if orphan_counts is not None:
                orphan_counts["evolution: missing held_item_id"] += 1
            continue

        loc_id = _parse_fk(r.get("location_id"))
        if loc_id and loc_id not in valid_location_ids:
            if orphan_counts is not None:
                orphan_counts["evolution: missing location_id"] += 1
            continue

        k_move_id = _parse_fk(r.get("known_move_id"))
        if k_move_id and k_move_id not in valid_move_ids:
            if orphan_counts is not None:
                orphan_counts["evolution: missing known_move_id"] += 1
            continue

        k_type_id = _parse_fk(r.get("known_move_type_id"))
        if k_type_id and k_type_id not in valid_type_ids:
            if orphan_counts is not None:
                orphan_counts["evolution: missing known_move_type_id"] += 1
            continue

        p_type_id = _parse_fk(r.get("party_type_id"))
        if p_type_id and p_type_id not in valid_type_ids:
            if orphan_counts is not None:
                orphan_counts["evolution: missing party_type_id"] += 1
            continue

        p_spec_id = _parse_fk(r.get("party_species_id"))
        if p_spec_id and p_spec_id not in valid_species_ids:
            if orphan_counts is not None:
                orphan_counts["evolution: missing party_species_id"] += 1
            continue

        t_spec_id = _parse_fk(r.get("trade_species_id"))
        if t_spec_id and t_spec_id not in valid_species_ids:
            if orphan_counts is not None:
                orphan_counts["evolution: missing trade_species_id"] += 1
            continue

        min_lvl = (
            int(r["minimum_level"])
            if r.get("minimum_level")
            else (int(r["min_level"]) if r.get("min_level") else None)
        )
        gender = (
            int(r["gender_id"])
            if r.get("gender_id")
            else (int(r["gender"]) if r.get("gender") else None)
        )
        min_hap = (
            int(r["minimum_happiness"])
            if r.get("minimum_happiness")
            else (int(r["min_happiness"]) if r.get("min_happiness") else None)
        )
        min_bt = (
            int(r["minimum_beauty"])
            if r.get("minimum_beauty")
            else (int(r["min_beauty"]) if r.get("min_beauty") else None)
        )
        min_aff = (
            int(r["minimum_affection"])
            if r.get("minimum_affection")
            else (int(r["min_affection"]) if r.get("min_affection") else None)
        )
        rel_phys = (
            int(r["relative_physical_stats"])
            if r.get("relative_physical_stats")
            else None
        )

        rain = r.get("needs_overworld_rain") in ("1", "true", "True")
        upside = r.get("turn_upside_down") in ("1", "true", "True")

        evo_items.append(
            {
                "id": evo_id,
                "chain_id": c_id,
                "from_species_id": from_s_id,
                "to_species_id": to_s_id,
                "trigger_id": trig_id,
                "trigger_item_id": trig_item_id,
                "held_item_id": held_item_id,
                "min_level": min_lvl,
                "gender": gender,
                "location_id": loc_id,
                "time_of_day": r.get("time_of_day"),
                "known_move_id": k_move_id,
                "known_move_type_id": k_type_id,
                "min_happiness": min_hap,
                "min_beauty": min_bt,
                "min_affection": min_aff,
                "relative_physical_stats": rel_phys,
                "party_species_id": p_spec_id,
                "party_type_id": p_type_id,
                "trade_species_id": t_spec_id,
                "needs_overworld_rain": rain,
                "turn_upside_down": upside,
            }
        )
    counts["evolutions"] = upsert(session, Evolution, evo_items, conflict_cols=["id"])

    if dry_run:
        session.flush()
    else:
        session.commit()
    return counts


# ==========================================
# Orchestrator & CLI
# ==========================================

def run_pipeline(
    session: Session,
    stages: Sequence[str],
    csv_dir: Optional[str] = None,
    ref: str = DEFAULT_REF,
    dry_run: bool = False,
) -> Tuple[Dict[str, int], Dict[str, int]]:
    """
    Executes stages in dependency order, tracks counts and orphans, and manages dry-run rollback.
    """
    logger.info("Starting ingestion pipeline with PokéAPI ref: %s", ref)
    table_counts: Dict[str, int] = {}
    orphan_counts: Counter = Counter()

    stage_dispatch = {
        "reference": populate_reference,
        "pockets": populate_item_categories_and_pockets,
        "items": populate_items,
        "berries": populate_berries,
        "locations": populate_locations_and_areas,
        "encounter_meta": populate_encounter_methods_and_conditions,
        "encounters": populate_encounters,
        "evolutions": populate_evolution_chains,
    }

    # Execute in strict dependency order
    for stage_name in STAGE_DEPENDENCY_ORDER:
        if stage_name in stages:
            fn = stage_dispatch[stage_name]
            stage_results = fn(
                session,
                csv_dir=csv_dir,
                ref=ref,
                dry_run=dry_run,
                orphan_counts=orphan_counts,
            )
            table_counts.update(stage_results)

    if dry_run:
        logger.info("DRY-RUN mode active: rolling back all changes...")
        session.rollback()
    else:
        # Upsert DataMeta records
        now_dt = datetime.now(timezone.utc).replace(tzinfo=None)
        now_iso = now_dt.isoformat()
        meta_rows = [
            {"key": "pokeapi_ref", "value": ref, "updated_at": now_dt},
            {"key": "ingested_at", "value": now_iso, "updated_at": now_dt},
        ]
        upsert(
            session,
            DataMeta,
            meta_rows,
            conflict_cols=["key"],
            update_cols=["value", "updated_at"],
        )
        session.commit()
        logger.info("Successfully updated DataMeta tracking rows.")

    return table_counts, dict(orphan_counts)


def print_summary_table(
    table_counts: Dict[str, int],
    orphan_counts: Dict[str, int],
    dry_run: bool = False,
) -> None:
    """
    Prints a formatted summary table to standard output.
    """
    if orphan_counts:
        print("\nSkipped Orphan Rows Summary:")
        print("-" * 65)
        for reason, count in sorted(orphan_counts.items()):
            print(f"  - {reason:<48}: {count:>8}")
        print("-" * 65)

    print("\n" + "=" * 65)
    print(f"{'PokéArchitect Extended Ingestion Summary':^65}")
    print("=" * 65)
    print(f"{'Table / Entity':<40} {'Upserted':>20}")
    print("-" * 65)
    for table_name, count in table_counts.items():
        print(f"{table_name:<40} {count:>20}")
    print("=" * 65)
    if dry_run:
        print(" [!] DRY RUN COMPLETED: All database modifications were rolled back.")
    print("")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="PokéArchitect CSV-Based Ingestion Pipeline"
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Execute all ingestion pipelines in dependency sequence",
    )
    parser.add_argument(
        "--reference",
        action="store_true",
        help="Ingest regions, version groups, and versions",
    )
    parser.add_argument(
        "--pockets",
        action="store_true",
        help="Ingest Item Pockets and Item Categories",
    )
    parser.add_argument(
        "--items",
        action="store_true",
        help="Ingest missing items and category mappings",
    )
    parser.add_argument(
        "--berries",
        action="store_true",
        help="Ingest Berry Firmness, Flavors, and Berries",
    )
    parser.add_argument(
        "--locations",
        action="store_true",
        help="Ingest Locations and Location Areas",
    )
    parser.add_argument(
        "--encounter-meta",
        action="store_true",
        help="Ingest Encounter Methods, Conditions, and Values",
    )
    parser.add_argument(
        "--encounters",
        action="store_true",
        help="Ingest Wild Encounters and Condition Mappings",
    )
    parser.add_argument(
        "--evolutions",
        action="store_true",
        help="Ingest Evolution Chains, Species, and Evolution edges",
    )
    parser.add_argument(
        "--csv-dir",
        type=str,
        default=None,
        help="Path to local folder containing PokéAPI CSVs (skips GitHub download)",
    )
    parser.add_argument(
        "--ref",
        type=str,
        default=DEFAULT_REF,
        help="Git commit SHA, tag, or branch in PokeAPI/pokeapi (default: master)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Execute pipeline and count rows, then roll back without committing",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Enable verbose DEBUG logging",
    )

    args = parser.parse_args()

    # Logging setup
    log_level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        level=log_level, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    )

    # Determine requested stages
    stages: List[str] = []
    if args.all:
        stages = list(STAGE_DEPENDENCY_ORDER)
    else:
        if args.reference:
            stages.append("reference")
        if args.pockets:
            stages.append("pockets")
        if args.items:
            stages.append("items")
        if args.berries:
            stages.append("berries")
        if args.locations:
            stages.append("locations")
        if args.encounter_meta:
            stages.append("encounter_meta")
        if args.encounters:
            stages.append("encounters")
        if args.evolutions:
            stages.append("evolutions")

    if not stages:
        parser.print_help()
        sys.exit(0)

    session = SessionLocal()
    try:
        table_counts, orphan_counts = run_pipeline(
            session=session,
            stages=stages,
            csv_dir=args.csv_dir,
            ref=args.ref,
            dry_run=args.dry_run,
        )
        print_summary_table(table_counts, orphan_counts, dry_run=args.dry_run)
    finally:
        session.close()


if __name__ == "__main__":
    main()
