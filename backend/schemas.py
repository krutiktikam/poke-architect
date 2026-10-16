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
    pp: int
    priority: int
    damage_class: str  # physical, special, status
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
    sprite_url: Optional[str] = None
    category: str

    class Config:
        from_attributes = True

class PokemonAbilityBase(BaseModel):
    id: int
    pokemon_id: int
    ability_id: int
    is_hidden: bool

    class Config:
        from_attributes = True