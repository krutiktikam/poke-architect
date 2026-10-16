from datetime import datetime
from typing import List, Optional

from sqlalchemy import (Boolean, Column, DateTime, ForeignKey, Index, Integer,
                        String, Table, func)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base

# IDs below are PokéAPI's own IDs (autoincrement=False) so re-ingestion upserts cleanly.


class DataMeta(Base):
    __tablename__ = "data_meta"
    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[str] = mapped_column(String(255))
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Generation(Base):
    __tablename__ = "generations"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=False)
    identifier: Mapped[str] = mapped_column(String(64), unique=True)
    name: Mapped[Optional[str]] = mapped_column(String(64))


class Region(Base):
    __tablename__ = "regions"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=False)
    identifier: Mapped[str] = mapped_column(String(64), unique=True)
    name: Mapped[Optional[str]] = mapped_column(String(64))


class VersionGroup(Base):
    __tablename__ = "version_groups"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=False)
    identifier: Mapped[str] = mapped_column(String(64), unique=True)
    generation_id: Mapped[int] = mapped_column(ForeignKey("generations.id"))
    order: Mapped[int] = mapped_column(Integer)


class Version(Base):
    __tablename__ = "versions"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=False)
    version_group_id: Mapped[int] = mapped_column(ForeignKey("version_groups.id"), index=True)
    identifier: Mapped[str] = mapped_column(String(64), unique=True)
    name: Mapped[Optional[str]] = mapped_column(String(64))


class Location(Base):
    __tablename__ = "locations"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=False)
    region_id: Mapped[Optional[int]] = mapped_column(ForeignKey("regions.id"), index=True)
    identifier: Mapped[str] = mapped_column(String(128), unique=True)
    name: Mapped[Optional[str]] = mapped_column(String(128))
    areas: Mapped[List["LocationArea"]] = relationship(back_populates="location")


class LocationArea(Base):
    __tablename__ = "location_areas"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=False)
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id"), index=True)
    game_index: Mapped[Optional[int]] = mapped_column(Integer)
    identifier: Mapped[Optional[str]] = mapped_column(String(128))  # may be empty = "main area"
    name: Mapped[Optional[str]] = mapped_column(String(128))
    location: Mapped[Location] = relationship(back_populates="areas")


class EncounterMethod(Base):
    __tablename__ = "encounter_methods"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=False)
    identifier: Mapped[str] = mapped_column(String(64), unique=True)  # walk, surf, old-rod, gift...
    name: Mapped[Optional[str]] = mapped_column(String(64))
    order: Mapped[Optional[int]] = mapped_column(Integer)


class EncounterCondition(Base):
    __tablename__ = "encounter_conditions"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=False)
    identifier: Mapped[str] = mapped_column(String(64), unique=True)  # time, swarm, radar...


class EncounterConditionValue(Base):
    __tablename__ = "encounter_condition_values"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=False)
    condition_id: Mapped[int] = mapped_column(ForeignKey("encounter_conditions.id"), index=True)
    identifier: Mapped[str] = mapped_column(String(64))  # time-morning, swarm-yes...
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)


encounter_condition_value_map = Table(
    "encounter_condition_value_map",
    Base.metadata,
    Column("encounter_id", ForeignKey("encounters.id", ondelete="CASCADE"), primary_key=True),
    Column("condition_value_id", ForeignKey("encounter_condition_values.id"), primary_key=True),
)


class Encounter(Base):
    """One row per (pokemon, area, version, slot). Kept raw; the API aggregates by
    summing `chance` per (pokemon, area, method, level range)."""
    __tablename__ = "encounters"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=False)
    version_id: Mapped[int] = mapped_column(ForeignKey("versions.id"))
    location_area_id: Mapped[int] = mapped_column(ForeignKey("location_areas.id"))
    pokemon_id: Mapped[int] = mapped_column(ForeignKey("pokemon.id"))
    method_id: Mapped[int] = mapped_column(ForeignKey("encounter_methods.id"))
    slot: Mapped[Optional[int]] = mapped_column(Integer)
    chance: Mapped[Optional[int]] = mapped_column(Integer)  # slot rarity %, NULL for gifts/static
    min_level: Mapped[int] = mapped_column(Integer)
    max_level: Mapped[int] = mapped_column(Integer)

    condition_values: Mapped[List[EncounterConditionValue]] = relationship(
        secondary=encounter_condition_value_map
    )

    __table_args__ = (
        Index("ix_encounters_pokemon_version", "pokemon_id", "version_id"),
        Index("ix_encounters_area_version", "location_area_id", "version_id"),
        Index("ix_encounters_method", "method_id"),
    )
