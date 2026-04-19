from pydantic import BaseModel
from typing import List, Optional

class PokemonBase(BaseModel):
    id: int
    name: str
    type1: str
    type2: Optional[str] = None
    hp: int
    attack: int
    defense: int
    special_attack: int
    special_defense: int
    speed: int
    sprite_url: Optional[str] = None
    region: str
    generation: int
    is_legendary: bool = False
    is_mythical: bool = False

    class Config:
        from_attributes = True

class TypeAnalysis(BaseModel):
    weaknesses: List[str]
    resistances: List[str]
    immunities: List[str]

class TeamAnalysisResponse(BaseModel):
    total_stats: dict
    type_coverage: dict # type -> multiplier
    suggestions: List[PokemonBase]
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
