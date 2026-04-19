from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

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
    team_data = Column(Text) # JSON string of pokemon IDs
    is_public = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="teams")

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

class TypeEfficacy(Base) :
    __tablename__ = "type_efficacy"

    damage_type = Column(String, primary_key=True)
    target_type = Column(String, primary_key=True)
    damage_factor = Column(Float)
