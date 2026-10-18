from pydantic import BaseModel
from typing import List, Optional

class PokemonBase(BaseModel):
    id: int
    name: str
    type1: str
    type2: Optional[str] = None
    hp: Optional[int] = 0
    attack: Optional[int] = 0
    defense: Optional[int] = 0
    special_attack: Optional[int] = 0
    special_defense: Optional[int] = 0
    speed: Optional[int] = 0
    sprite_url: Optional[str] = None
    region: Optional[str] = "Unknown"
    generation: Optional[int] = 0
    is_legendary: bool = False
    is_mythical: bool = False
    role: Optional[str] = None
    tier: Optional[str] = "N/A"
    usage_rate: Optional[float] = 0.0

    class Config:
        from_attributes = True

class SuggestedPokemon(PokemonBase):
    reasoning: List[str]
    role: str

class TypeAnalysis(BaseModel):
    weaknesses: List[str]
    resistances: List[str]
    immunities: List[str]

class TeamAnalysisResponse(BaseModel):
    total_stats: dict
    type_coverage: dict # type -> multiplier
    suggestions: List[SuggestedPokemon]
    advice: List[str]
    archetype: str
    health_score: str

class TeamCreate(BaseModel):
    name: str
    pokemon_ids: List[int]
    is_public: bool = True

class TeamMemberInput(BaseModel):
    id: int
    name: str
    type1: str
    type2: Optional[str] = None
    hp: Optional[int] = 0
    attack: Optional[int] = 0
    defense: Optional[int] = 0
    special_attack: Optional[int] = 0
    special_defense: Optional[int] = 0
    speed: Optional[int] = 0
    sprite_url: Optional[str] = None
    region: Optional[str] = "Unknown"
    generation: Optional[int] = 0
    is_legendary: bool = False
    is_mythical: bool = False
    role: Optional[str] = None
    tier: Optional[str] = "N/A"
    usage_rate: Optional[float] = 0.0
    selectedMoves: List[Optional[int]] = []  # list of move IDs, length 4
    selectedItem: Optional[int] = None
    selectedAbility: Optional[int] = None
    selectedNature: Optional[int] = None

    class Config:
        from_attributes = True

class TeamAnalysisRequest(BaseModel):
    pokemon: List[TeamMemberInput]

    class Config:
        from_attributes = True

class TeamComparisonResponse(BaseModel):
    team_a_win_prob: float
    team_b_win_prob: float
    advantage_factors: List[str]

# New schemas for Moves and Natures (Phase 1)
class MoveBase(BaseModel):
    id: int
    name: str
    type: str
    power: Optional[int] = None
    accuracy: Optional[int] = None
    pp: Optional[int] = None
    priority: Optional[int] = 0
    damage_class: Optional[str] = "status"  # physical, special, status
    effect_chance: Optional[int] = None

    class Config:
        from_attributes = True

class NatureBase(BaseModel):
    id: int
    name: str
    decreased_stat: Optional[str] = None  # e.g., 'attack', 'defense', etc.
    increased_stat: Optional[str] = None

    class Config:
        from_attributes = True

class PokemonMoveBase(BaseModel):
    id: int
    pokemon_id: int
    move_id: int
    generation_id: int
    learn_method: str

    class Config:
        from_attributes = True

# New schemas for Abilities and Items (Phase 2)
class AbilityResponse(BaseModel):
    id: int
    name: str
    short_effect: Optional[str] = None

    class Config:
        from_attributes = True

class ItemResponse(BaseModel):
    id: int
    name: str
    effect: Optional[str] = None
    short_effect: Optional[str] = None
    sprite_url: Optional[str] = None
    category: Optional[str] = "General"

    class Config:
        from_attributes = True

class ItemEffectResponse(BaseModel):
    item_id: int
    short_effect: Optional[str] = None
    effect: Optional[str] = None

    class Config:
        from_attributes = True

class PokemonAbilityBase(BaseModel):
    id: int
    pokemon_id: int
    ability_id: int
    is_hidden: bool

    class Config:
        from_attributes = True


# ==========================================
# Phase 3 Expansion Schemas
# ==========================================

class EncounterMethodSchema(BaseModel):
    id: int
    identifier: str
    name: Optional[str] = None

    class Config:
        from_attributes = True

class EncounterVersionSchema(BaseModel):
    id: int
    identifier: str
    name: Optional[str] = None

    class Config:
        from_attributes = True

class EncounterDetailSchema(BaseModel):
    version: EncounterVersionSchema
    method: EncounterMethodSchema
    min_level: int
    max_level: int
    chance: Optional[int] = None  # null for gifts/static
    conditions: List[str] = []

    class Config:
        from_attributes = True

class LocationAreaEncountersSchema(BaseModel):
    id: int
    name: Optional[str] = None
    identifier: Optional[str] = None
    encounters: List[EncounterDetailSchema] = []

    class Config:
        from_attributes = True

class RegionBriefSchema(BaseModel):
    id: int
    identifier: str
    name: Optional[str] = None

    class Config:
        from_attributes = True

class LocationEncountersResponse(BaseModel):
    id: int
    name: Optional[str] = None
    identifier: str
    region: Optional[RegionBriefSchema] = None
    areas: List[LocationAreaEncountersSchema] = []

    class Config:
        from_attributes = True

# Evolutions
class NamedRef(BaseModel):
    id: int
    name: Optional[str] = None
    identifier: Optional[str] = None

    class Config:
        from_attributes = True

class EvolutionNode(BaseModel):
    species_id: int
    identifier: str
    name: str
    pokemon_id: Optional[int] = None
    sprite_url: Optional[str] = None

    class Config:
        from_attributes = True

class EvolutionRequirements(BaseModel):
    trigger_item: Optional[NamedRef] = None
    held_item: Optional[NamedRef] = None
    min_level: Optional[int] = None
    gender: Optional[int] = None
    location: Optional[NamedRef] = None
    time_of_day: Optional[str] = None
    known_move: Optional[NamedRef] = None
    known_move_type: Optional[NamedRef] = None
    min_happiness: Optional[int] = None
    min_beauty: Optional[int] = None
    min_affection: Optional[int] = None
    relative_physical_stats: Optional[int] = None
    party_species: Optional[NamedRef] = None
    party_type: Optional[NamedRef] = None
    trade_species: Optional[NamedRef] = None
    needs_overworld_rain: Optional[bool] = None
    turn_upside_down: Optional[bool] = None

    class Config:
        from_attributes = True

class EvolutionEdge(BaseModel):
    from_species_id: int
    to_species_id: int
    trigger: NamedRef
    requirements: EvolutionRequirements

    class Config:
        from_attributes = True

class EvolutionChainResponse(BaseModel):
    chain_id: Optional[int] = None
    nodes: List[EvolutionNode] = []
    edges: List[EvolutionEdge] = []

    class Config:
        from_attributes = True

# Locations
class LocationAreaBrief(BaseModel):
    id: int
    identifier: Optional[str] = None
    name: Optional[str] = None
    game_index: Optional[int] = None
    pokemon_count: int = 0

    class Config:
        from_attributes = True

class LocationDetailResponse(BaseModel):
    id: int
    identifier: str
    name: Optional[str] = None
    region: Optional[RegionBriefSchema] = None
    areas: List[LocationAreaBrief] = []

    class Config:
        from_attributes = True

class LocationListItem(BaseModel):
    id: int
    identifier: str
    name: Optional[str] = None
    region: Optional[RegionBriefSchema] = None

    class Config:
        from_attributes = True

class LocationListResponse(BaseModel):
    total: int
    items: List[LocationListItem]
    limit: int
    offset: int

    class Config:
        from_attributes = True

# Items & Berries
class PocketItemSchema(BaseModel):
    id: int
    identifier: Optional[str] = None
    name: str
    short_effect: Optional[str] = None

    class Config:
        from_attributes = True

class PocketCategorySchema(BaseModel):
    id: int
    name: str
    items: List[PocketItemSchema] = []

    class Config:
        from_attributes = True

class ItemPocketSchema(BaseModel):
    id: int
    name: str
    categories: List[PocketCategorySchema] = []

    class Config:
        from_attributes = True

class BerryFlavorSchema(BaseModel):
    id: int
    name: str
    potency: int

    class Config:
        from_attributes = True

class BerryResponse(BaseModel):
    id: int
    name: str
    item_id: Optional[int] = None
    item_name: Optional[str] = None
    firmness: Optional[str] = None
    growth_time: Optional[int] = None
    max_harvest: Optional[int] = None
    size: Optional[int] = None
    smoothness: Optional[int] = None
    soil_dryness: Optional[int] = None
    natural_gift_power: Optional[int] = None
    natural_gift_type: Optional[str] = None
    flavors: List[BerryFlavorSchema] = []

    class Config:
        from_attributes = True

# Meta
class DataVersionResponse(BaseModel):
    data_version: str
    pokeapi_ref: Optional[str] = None
    ingested_at: Optional[str] = None
    schema_revision: Optional[str] = None

    class Config:
        from_attributes = True

# Versions & Regions
class VersionResponse(BaseModel):
    id: int
    identifier: str
    name: Optional[str] = None
    version_group_id: int
    version_group: str
    version_group_identifier: Optional[str] = None
    generation_id: int

    class Config:
        from_attributes = True

class RegionResponse(BaseModel):
    id: int
    identifier: str
    name: Optional[str] = None

    class Config:
        from_attributes = True