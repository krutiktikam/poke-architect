from typing import Optional

from sqlalchemy import Boolean, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class EvolutionTrigger(Base):
    __tablename__ = "evolution_triggers"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=False)
    identifier: Mapped[str] = mapped_column(String(64), unique=True)  # level-up, trade, use-item...
    name: Mapped[Optional[str]] = mapped_column(String(64))


class EvolutionChain(Base):
    __tablename__ = "evolution_chains"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=False)
    baby_trigger_item_id: Mapped[Optional[int]] = mapped_column(ForeignKey("items.id"))


class Evolution(Base):
    """One edge in an evolution tree. A species can have several edges into it
    (e.g. different methods, or per-condition variants)."""
    __tablename__ = "evolutions"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=False)
    chain_id: Mapped[int] = mapped_column(ForeignKey("evolution_chains.id"))
    from_species_id: Mapped[int] = mapped_column(ForeignKey("pokemon_species.id"))
    to_species_id: Mapped[int] = mapped_column(ForeignKey("pokemon_species.id"))
    trigger_id: Mapped[int] = mapped_column(ForeignKey("evolution_triggers.id"))

    # Requirements (all optional; combine as AND)
    trigger_item_id: Mapped[Optional[int]] = mapped_column(ForeignKey("items.id"))
    held_item_id: Mapped[Optional[int]] = mapped_column(ForeignKey("items.id"))
    min_level: Mapped[Optional[int]] = mapped_column(Integer)
    gender: Mapped[Optional[int]] = mapped_column(Integer)  # 1 = female, 2 = male
    location_id: Mapped[Optional[int]] = mapped_column(ForeignKey("locations.id"))
    time_of_day: Mapped[Optional[str]] = mapped_column(String(16))  # day / night / dusk
    known_move_id: Mapped[Optional[int]] = mapped_column(ForeignKey("moves.id"))
    known_move_type_id: Mapped[Optional[int]] = mapped_column(ForeignKey("types.id"))
    min_happiness: Mapped[Optional[int]] = mapped_column(Integer)
    min_beauty: Mapped[Optional[int]] = mapped_column(Integer)
    min_affection: Mapped[Optional[int]] = mapped_column(Integer)
    relative_physical_stats: Mapped[Optional[int]] = mapped_column(Integer)  # -1, 0, 1 (Tyrogue)
    party_species_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pokemon_species.id"))
    party_type_id: Mapped[Optional[int]] = mapped_column(ForeignKey("types.id"))
    trade_species_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pokemon_species.id"))
    needs_overworld_rain: Mapped[bool] = mapped_column(Boolean, default=False)
    turn_upside_down: Mapped[bool] = mapped_column(Boolean, default=False)

    __table_args__ = (
        Index("ix_evolutions_from", "from_species_id"),
        Index("ix_evolutions_to", "to_species_id"),
        Index("ix_evolutions_chain", "chain_id"),
    )
