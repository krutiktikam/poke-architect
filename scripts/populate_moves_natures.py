#!/usr/bin/env python3
"""
ETL script to populate Move and Nature tables from PokéAPI.
Run from the project root: python scripts/populate_moves_natures.py
"""

import time
import sys
import os
from typing import List, Dict, Any

# Add the backend directory to the path so we can import from it
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from sqlalchemy.orm import sessionmaker
from backend.database import engine, Base
from backend.models import Move, Nature
import requests

# Constants
POKEAPI_BASE = "https://pokeapi.co/api/v2"
HEADERS = {"Accept": "application/json"}
DELAY_BETWEEN_REQUESTS = 0.1  # seconds to respect rate limits
BATCH_SIZE = 100  # commit every BATCH_SIZE records

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

def get_all_move_urls() -> List[str]:
    """Get all move URLs from PokéAPI."""
    url = f"{POKEAPI_BASE}/move?limit=10000"  # there are ~800 moves
    data = fetch_with_retry(url)
    return [item['url'] for item in data['results']]

def get_all_nature_urls() -> List[str]:
    """Get all nature URLs from PokéAPI."""
    url = f"{POKEAPI_BASE}/nature?limit=1000"  # there are 25 natures
    data = fetch_with_retry(url)
    return [item['url'] for item in data['results']]

def parse_move_data(data: Dict[Any, Any]) -> Move:
    """Parse move data from PokéAPI into a Move model instance."""
    return Move(
        id=data['id'],
        name=data['name'],
        type=data['type']['name'],
        power=data['power'],
        accuracy=data['accuracy'],
        pp=data['pp'],
        priority=data['priority'],
        damage_class=data['damage_class']['name'],
        effect_chance=data['effect_chance']
    )

def parse_nature_data(data: Dict[Any, Any]) -> Nature:
    """Parse nature data from PokéAPI into a Nature model instance."""
    decreased_stat = data['decreased_stat']['name'] if data['decreased_stat'] else None
    increased_stat = data['increased_stat']['name'] if data['increased_stat'] else None
    return Nature(
        id=data['id'],
        name=data['name'],
        decreased_stat=decreased_stat,
        increased_stat=increased_stat
    )

def populate_moves(session):
    """Fetch and populate all moves."""
    print("Fetching move list...")
    move_urls = get_all_move_urls()
    print(f"Found {len(move_urls)} moves to process.")

    moves = []
    for i, url in enumerate(move_urls, 1):
        if i % 100 == 0:
            print(f"Processed {i}/{len(move_urls)} moves...")
        try:
            move_data = fetch_with_retry(url)
            move = parse_move_data(move_data)
            moves.append(move)

            # Batch insert to avoid memory issues
            if len(moves) >= BATCH_SIZE:
                session.bulk_save_objects(moves)
                session.commit()
                moves = []
                print(f"Committed batch of {BATCH_SIZE} moves")

            # Rate limiting
            time.sleep(DELAY_BETWEEN_REQUESTS)
        except Exception as e:
            print(f"Error processing move {url}: {e}")
            continue

    # Insert remaining moves
    if moves:
        session.bulk_save_objects(moves)
        session.commit()
        print(f"Committed final batch of {len(moves)} moves")

def populate_natures(session):
    """Fetch and populate all natures."""
    print("Fetching nature list...")
    nature_urls = get_all_nature_urls()
    print(f"Found {len(nature_urls)} natures to process.")

    natures = []
    for i, url in enumerate(nature_urls, 1):
        if i % 10 == 0:
            print(f"Processed {i}/{len(nature_urls)} natures...")
        try:
            nature_data = fetch_with_retry(url)
            nature = parse_nature_data(nature_data)
            natures.append(nature)

            # Batch insert
            if len(natures) >= BATCH_SIZE:
                session.bulk_save_objects(natures)
                session.commit()
                natures = []
                print(f"Committed batch of {BATCH_SIZE} natures")

            # Rate limiting
            time.sleep(DELAY_BETWEEN_REQUESTS)
        except Exception as e:
            print(f"Error processing nature {url}: {e}")
            continue

    # Insert remaining natures
    if natures:
        session.bulk_save_objects(natures)
        session.commit()
        print(f"Committed final batch of {len(natures)} natures")

def main():
    """Main ETL function."""
    print("Starting ETL for Moves and Natures from PokéAPI...")

    # Create all database tables if they don't exist
    Base.metadata.create_all(bind=engine)

    # Create database session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()

    try:
        # Populate moves
        populate_moves(session)

        # Populate natures
        populate_natures(session)

        print("ETL completed successfully!")
    except Exception as e:
        print(f"ETL failed: {e}")
        session.rollback()
        raise
    finally:
        session.close()

if __name__ == "__main__":
    main()