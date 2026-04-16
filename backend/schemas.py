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
