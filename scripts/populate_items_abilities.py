#!/usr/bin/env python3
"""
ETL script to populate Ability and Item tables from PokéAPI.
Run from the project root: python scripts/populate_items_abilities.py
"""

import time
import sys
import os
from typing import List, Dict, Any

# Add the backend directory to the path so we can import from it
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from sqlalchemy.orm import sessionmaker
from backend.database import engine, Base
from backend.models import Ability, Item
import requests

# Constants
POKEAPI_BASE = "https://pokeapi.co/api/v2"
HEADERS = {"Accept": "application/json"}
DELAY_BETWEEN_REQUESTS = 0.1  # seconds to respect rate limits
BATCH_SIZE = 100  # commit every BATCH_SIZE records

# Competitive item categories we want to include
COMPETITIVE_ITEM_CATEGORIES = {
    'held-items', 'choice', 'effort-training', 'bad-held-items',
    'type-enhancement', 'medicine'
}

def fetch_with_retry(url: str, max_retries: int = 3) -> Dict[Any, Any]:
    """Fetch JSON from a URL with retry logic."""
    for i in range(max_retries):
        try:
            response = requests.get(url, headers=HEADERS, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Error fetching {url}: {e}")
            if i < max_retries - 1:
                time.sleep(2 ** i)  # exponential backoff
            else:
                raise
    return {}  # should not reach here

def get_all_ability_urls() -> List[str]:
    """Get all ability URLs from PokéAPI."""
    url = f"{POKEAPI_BASE}/ability?limit=10000"  # there are ~300 abilities
    data = fetch_with_retry(url)
    return [item['url'] for item in data['results']]

def get_all_item_urls() -> List[str]:
    """Get all item URLs from PokéAPI."""
    url = f"{POKEAPI_BASE}/item?limit=10000"  # there are ~1000 items
    data = fetch_with_retry(url)
    return [item['url'] for item in data['results']]

def parse_ability_data(data: Dict[Any, Any]) -> Ability:
    """Parse ability data from PokéAPI into an Ability model instance."""
    # Get the short effect from flavor text entries (English version)
    short_effect = ""
    for entry in data.get('effect_entries', []):
        if entry.get('language', {}).get('name') == 'en':
            short_effect = entry.get('short_effect', '')
            break

    return Ability(
        id=data['id'],
        name=data['name'],
        short_effect=short_effect
    )

def parse_item_data(data: Dict[Any, Any]) -> Item:
    """Parse item data from PokéAPI into an Item model instance."""
    # Get sprite URL (default or first available)
    sprite_url = data.get('sprites', {}).get('default')

    return Item(
        id=data['id'],
        name=data['name'],
        effect=data.get('effect', ''),  # main effect description
        sprite_url=sprite_url,
        category=data.get('category', {}).get('name', '')
    )

def populate_abilities(session):
    """Fetch and populate all abilities."""
    print("Fetching ability list...")
    ability_urls = get_all_ability_urls()
    print(f"Found {len(ability_urls)} abilities to process.")

    abilities = []
    for i, url in enumerate(ability_urls, 1):
        if i % 100 == 0:
            print(f"Processed {i}/{len(ability_urls)} abilities...")
        try:
            ability_data = fetch_with_retry(url)
            ability = parse_ability_data(ability_data)
            abilities.append(ability)

            # Batch insert to avoid memory issues
            if len(abilities) >= BATCH_SIZE:
                session.bulk_save_objects(abilities)
                session.commit()
                abilities = []
                print(f"Committed batch of {BATCH_SIZE} abilities")

            # Rate limiting
            time.sleep(DELAY_BETWEEN_REQUESTS)
        except Exception as e:
            print(f"Error processing ability {url}: {e}")
            continue

    # Insert remaining abilities
    if abilities:
        session.bulk_save_objects(abilities)
        session.commit()
        print(f"Committed final batch of {len(abilities)} abilities")

def populate_items(session):
    """Fetch and populate competitive items."""
    print("Fetching item list...")
    item_urls = get_all_item_urls()
    print(f"Found {len(item_urls)} items to process (filtering for competitive categories).")

    items = []
    processed_count = 0
    competitive_count = 0

    for i, url in enumerate(item_urls, 1):
        if i % 500 == 0:
            print(f"Processed {i}/{len(item_urls)} items...")
        try:
            item_data = fetch_with_retry(url)

            # Check if this item belongs to a competitive category
            category = item_data.get('category', {})
            category_name = category.get('name', '') if category else ''

            if category_name in COMPETITIVE_ITEM_CATEGORIES:
                competitive_count += 1
                item = parse_item_data(item_data)
                items.append(item)

                # Batch insert
                if len(items) >= BATCH_SIZE:
                    session.bulk_save_objects(items)
                    session.commit()
                    items = []
                    print(f"Committed batch of {BATCH_SIZE} competitive items (total competitive: {competitive_count})")

            processed_count += 1

            # Rate limiting
            time.sleep(DELAY_BETWEEN_REQUESTS)
        except Exception as e:
            print(f"Error processing item {url}: {e}")
            continue

    # Insert remaining items
    if items:
        session.bulk_save_objects(items)
        session.commit()
        print(f"Committed final batch of {len(items)} competitive items (total competitive: {competitive_count})")

def main():
    """Main ETL function."""
    print("Starting ETL for Abilities and Items from PokéAPI...")

    # Create all database tables if they don't exist
    Base.metadata.create_all(bind=engine)

    # Create database session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()

    try:
        # Populate abilities
        populate_abilities(session)

        # Populate competitive items
        populate_items(session)

        print("ETL completed successfully!")
    except Exception as e:
        print(f"ETL failed: {e}")
        session.rollback()
        raise
    finally:
        session.close()

if __name__ == "__main__":
    main()