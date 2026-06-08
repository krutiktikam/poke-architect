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

class TeamComparisonResponse(BaseModel):
    team_a_win_prob: float
    team_b_win_prob: float
    advantage_factors: List[str]
