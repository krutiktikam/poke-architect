from typing import Optional
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Text, text
from sqlalchemy.orm import relationship, Mapped, mapped_column
from datetime import datetime
from backend.database import Base

# Import models from world.py
from .world import (
    DataMeta,
    Generation,
    Region,
    VersionGroup,
    Version,
    Location,
    LocationArea,
    EncounterMethod,
    EncounterCondition,
    EncounterConditionValue,
    encounter_condition_value_map,
    Encounter,
)

# Import models from evolution.py
from .evolution import (
    EvolutionTrigger,
    EvolutionChain,
    Evolution,
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    google_id = Column(String, unique=True, index=True)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    teams = relationship("SavedTeam", back_populates="owner")

class SavedTeam(Base):
    __tablename__ = "saved_teams"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    team_data = Column(Text)  # JSON string of pokemon IDs
    is_public = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="teams")

# ==========================================
# Types & Pokémon Species
# ==========================================

class Type(Base):
    __tablename__ = "types"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=False)
    identifier: Mapped[str] = mapped_column(String(64), unique=True)
    generation_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

class PokemonSpecies(Base):
    __tablename__ = "pokemon_species"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=False)
    identifier: Mapped[str] = mapped_column(String(64), unique=True)
    generation_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    evolves_from_species_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pokemon_species.id"), nullable=True)
    evolution_chain_id: Mapped[Optional[int]] = mapped_column(ForeignKey("evolution_chains.id"), nullable=True)
    order: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

# ==========================================
# Item Extensions & Items
# ==========================================

class ItemPocket(Base):
    __tablename__ = "item_pockets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

    categories = relationship("ItemCategory", back_populates="pocket")

class ItemCategory(Base):
    __tablename__ = "item_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    pocket_id = Column(Integer, ForeignKey("item_pockets.id"), nullable=True)

    pocket = relationship("ItemPocket", back_populates="categories")
    items = relationship("Item", back_populates="item_category")

class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    effect = Column(String)
    sprite_url = Column(String, nullable=True)
    category = Column(String)
    category_id = Column(Integer, ForeignKey("item_categories.id"), nullable=True)
    is_holdable = Column(Boolean, nullable=False, default=False, server_default=text("false"))

    item_category = relationship("ItemCategory", back_populates="items")
    berry = relationship("Berry", back_populates="item", uselist=False)
    item_effect = relationship("ItemEffect", back_populates="item", uselist=False)


class ItemEffect(Base):
    __tablename__ = "item_effects"

    item_id: Mapped[int] = mapped_column(ForeignKey("items.id"), primary_key=True, autoincrement=False)
    short_effect: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    effect: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    item = relationship("Item", back_populates="item_effect")


# ==========================================
# Berries
# ==========================================

class BerryFirmness(Base):
    __tablename__ = "berry_firmnesses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

    berries = relationship("Berry", back_populates="firmness")

class BerryFlavor(Base):
    __tablename__ = "berry_flavors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

    berries = relationship("BerryFlavorMap", back_populates="flavor")

class BerryFlavorMap(Base):
    __tablename__ = "berry_flavor_map"

    id = Column(Integer, primary_key=True, index=True)
    berry_id = Column(Integer, ForeignKey("berries.id"))
    flavor_id = Column(Integer, ForeignKey("berry_flavors.id"))
    potency = Column(Integer, default=0)

    berry = relationship("Berry", back_populates="flavors")
    flavor = relationship("BerryFlavor", back_populates="berries")

class Berry(Base):
    __tablename__ = "berries"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    growth_time = Column(Integer, nullable=True)
    max_harvest = Column(Integer, nullable=True)
    natural_gift_power = Column(Integer, nullable=True)
    size = Column(Integer, nullable=True)
    smoothness = Column(Integer, nullable=True)
    soil_dryness = Column(Integer, nullable=True)
    firmness_id = Column(Integer, ForeignKey("berry_firmnesses.id"), nullable=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=True)
    natural_gift_type = Column(String, nullable=True)

    firmness = relationship("BerryFirmness", back_populates="berries")
    item = relationship("Item", back_populates="berry")
    flavors = relationship("BerryFlavorMap", back_populates="berry")

# ==========================================
# Pokémon & Battle Attributes
# ==========================================

class Pokemon(Base):
    __tablename__ = "pokemon"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    type1 = Column(String)
    type2 = Column(String, nullable=True)
    hp = Column(Integer)
    attack = Column(Integer)
    defense = Column(Integer)
    special_attack = Column(Integer)
    special_defense = Column(Integer)
    speed = Column(Integer)
    sprite_url = Column(String)
    region = Column(String)
    generation = Column(Integer)
    is_legendary = Column(Boolean, default=False)
    is_mythical = Column(Boolean, default=False)
    role = Column(String, nullable=True)
    tier = Column(String, nullable=True, default="N/A")
    usage_rate = Column(Float, nullable=True, default=0.0)
    evolution_chain_id = Column(Integer, ForeignKey("evolution_chains.id"), nullable=True)

    # Relationships
    evolution_chain = relationship("EvolutionChain")
    encounters = relationship("Encounter")
    pokemon_moves = relationship("PokemonMove", back_populates="pokemon")
    pokemon_abilities = relationship("PokemonAbility", back_populates="pokemon")

class TypeEfficacy(Base):
    __tablename__ = "type_efficacy"

    damage_type = Column(String, primary_key=True)
    target_type = Column(String, primary_key=True)
    damage_factor = Column(Float)

class Move(Base):
    __tablename__ = "moves"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    type = Column(String)
    power = Column(Integer, nullable=True)
    accuracy = Column(Integer, nullable=True)
    pp = Column(Integer)
    priority = Column(Integer)
    damage_class = Column(String)  # physical, special, status
    effect_chance = Column(Integer, nullable=True)

    pokemon_moves = relationship("PokemonMove", back_populates="move")

class Nature(Base):
    __tablename__ = "natures"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    decreased_stat = Column(String, nullable=True)  # e.g., 'attack', 'defense', etc.
    increased_stat = Column(String, nullable=True)

class PokemonMove(Base):
    __tablename__ = "pokemon_moves"

    id = Column(Integer, primary_key=True, index=True)
    pokemon_id = Column(Integer, ForeignKey("pokemon.id"))
    move_id = Column(Integer, ForeignKey("moves.id"))
    generation_id = Column(Integer)  # could also be version_group_id
    learn_method = Column(String)

    pokemon = relationship("Pokemon", back_populates="pokemon_moves")
    move = relationship("Move", back_populates="pokemon_moves")

class Ability(Base):
    __tablename__ = "abilities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    short_effect = Column(String)

    pokemon_abilities = relationship("PokemonAbility", back_populates="ability")

class PokemonAbility(Base):
    __tablename__ = "pokemon_abilities"

    id = Column(Integer, primary_key=True, index=True)
    pokemon_id = Column(Integer, ForeignKey("pokemon.id"))
    ability_id = Column(Integer, ForeignKey("abilities.id"))
    is_hidden = Column(Boolean, default=False)

    pokemon = relationship("Pokemon", back_populates="pokemon_abilities")
    ability = relationship("Ability", back_populates="pokemon_abilities")
