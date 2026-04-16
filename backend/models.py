from sqlalchemy import Column, Integer, String, Float
from .database import Base

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

class TypeEfficacy(Base) :
    __tablename__ = "type_efficacy"

    damage_type = Column(String, primary_key=True)
    target_type = Column(String, primary_key=True)
    damage_factor = Column(Float)
