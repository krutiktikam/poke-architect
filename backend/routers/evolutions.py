from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, aliased
from sqlalchemy import select

from ..database import get_db
from ..models import (
    Pokemon,
    PokemonSpecies,
    EvolutionChain,
    Evolution,
    EvolutionTrigger,
    Item,
    Move,
    Type,
    Location,
)
from ..schemas import (
    EvolutionChainResponse,
    EvolutionNode,
    EvolutionEdge,
    EvolutionRequirements,
    NamedRef,
)

router = APIRouter(prefix="/api", tags=["evolutions"])


@router.get(
    "/pokemon/{id}/evolutions",
    response_model=EvolutionChainResponse,
)
def get_pokemon_evolutions(
    id: int,
    db: Session = Depends(get_db),
):
    """
    Returns the complete evolution graph (nodes and edges) for a Pokémon's species.
    Resolves all requirements and related names in a single query set (zero N+1 queries).
    Single-stage species return an empty edge list with the one node.
    """
    # 1. 404 if Pokémon does not exist
    pokemon = db.scalar(select(Pokemon).where(Pokemon.id == id))
    if not pokemon:
        raise HTTPException(status_code=404, detail=f"Pokemon {id} not found")

    # 2. Find species and evolution_chain_id
    species = db.scalar(select(PokemonSpecies).where(PokemonSpecies.id == id))
    chain_id = (
        species.evolution_chain_id
        if species and species.evolution_chain_id
        else pokemon.evolution_chain_id
    )

    # If no chain exists, return single-stage node
    if not chain_id:
        single_node = EvolutionNode(
            species_id=species.id if species else pokemon.id,
            identifier=species.identifier if species else pokemon.name.lower(),
            name=pokemon.name,
            pokemon_id=pokemon.id,
            sprite_url=pokemon.sprite_url,
        )
        return EvolutionChainResponse(chain_id=None, nodes=[single_node], edges=[])

    # 3. Query all species in this chain
    chain_species = db.scalars(
        select(PokemonSpecies)
        .where(PokemonSpecies.evolution_chain_id == chain_id)
        .order_by(PokemonSpecies.order, PokemonSpecies.id)
    ).all()

    if not chain_species:
        # Fallback to single node if chain has no species records
        single_node = EvolutionNode(
            species_id=species.id if species else pokemon.id,
            identifier=species.identifier if species else pokemon.name.lower(),
            name=pokemon.name,
            pokemon_id=pokemon.id,
            sprite_url=pokemon.sprite_url,
        )
        return EvolutionChainResponse(chain_id=chain_id, nodes=[single_node], edges=[])

    species_ids = [s.id for s in chain_species]
    matching_pokemon = db.scalars(
        select(Pokemon).where(Pokemon.id.in_(species_ids))
    ).all()
    pokemon_map: Dict[int, Pokemon] = {p.id: p for p in matching_pokemon}

    nodes: List[EvolutionNode] = []
    for s in chain_species:
        p = pokemon_map.get(s.id)
        nodes.append(
            EvolutionNode(
                species_id=s.id,
                identifier=s.identifier,
                name=p.name if p else s.identifier.replace("-", " ").title(),
                pokemon_id=p.id if p else None,
                sprite_url=p.sprite_url if p else None,
            )
        )

    # 4. Query all edges with aliased joins to resolve all names in ONE query (zero N+1)
    TriggerItem = aliased(Item, name="trigger_item")
    HeldItem = aliased(Item, name="held_item")
    PartySpecies = aliased(PokemonSpecies, name="party_species")
    TradeSpecies = aliased(PokemonSpecies, name="trade_species")
    KnownMove = aliased(Move, name="known_move")
    KnownMoveType = aliased(Type, name="known_move_type")
    PartyType = aliased(Type, name="party_type")
    EvoLocation = aliased(Location, name="evo_location")

    stmt = (
        select(
            Evolution,
            EvolutionTrigger.identifier.label("trigger_identifier"),
            EvolutionTrigger.name.label("trigger_name"),
            TriggerItem.name.label("trigger_item_name"),
            HeldItem.name.label("held_item_name"),
            EvoLocation.name.label("location_name"),
            EvoLocation.identifier.label("location_identifier"),
            KnownMove.name.label("known_move_name"),
            KnownMoveType.identifier.label("known_move_type_name"),
            PartyType.identifier.label("party_type_name"),
            PartySpecies.identifier.label("party_species_name"),
            TradeSpecies.identifier.label("trade_species_name"),
        )
        .join(EvolutionTrigger, Evolution.trigger_id == EvolutionTrigger.id)
        .outerjoin(TriggerItem, Evolution.trigger_item_id == TriggerItem.id)
        .outerjoin(HeldItem, Evolution.held_item_id == HeldItem.id)
        .outerjoin(EvoLocation, Evolution.location_id == EvoLocation.id)
        .outerjoin(KnownMove, Evolution.known_move_id == KnownMove.id)
        .outerjoin(KnownMoveType, Evolution.known_move_type_id == KnownMoveType.id)
        .outerjoin(PartyType, Evolution.party_type_id == PartyType.id)
        .outerjoin(PartySpecies, Evolution.party_species_id == PartySpecies.id)
        .outerjoin(TradeSpecies, Evolution.trade_species_id == TradeSpecies.id)
        .where(Evolution.chain_id == chain_id)
        .order_by(Evolution.id)
    )

    edge_rows = db.execute(stmt).all()

    edges: List[EvolutionEdge] = []
    for r in edge_rows:
        evo: Evolution = r.Evolution

        # Build requirements omitting null values
        req = EvolutionRequirements(
            trigger_item=(
                NamedRef(id=evo.trigger_item_id, name=r.trigger_item_name)
                if evo.trigger_item_id
                else None
            ),
            held_item=(
                NamedRef(id=evo.held_item_id, name=r.held_item_name)
                if evo.held_item_id
                else None
            ),
            min_level=evo.min_level,
            gender=evo.gender,
            location=(
                NamedRef(
                    id=evo.location_id,
                    name=r.location_name,
                    identifier=r.location_identifier,
                )
                if evo.location_id
                else None
            ),
            time_of_day=evo.time_of_day,
            known_move=(
                NamedRef(id=evo.known_move_id, name=r.known_move_name)
                if evo.known_move_id
                else None
            ),
            known_move_type=(
                NamedRef(id=evo.known_move_type_id, identifier=r.known_move_type_name)
                if evo.known_move_type_id
                else None
            ),
            min_happiness=evo.min_happiness,
            min_beauty=evo.min_beauty,
            min_affection=evo.min_affection,
            relative_physical_stats=evo.relative_physical_stats,
            party_species=(
                NamedRef(id=evo.party_species_id, identifier=r.party_species_name)
                if evo.party_species_id
                else None
            ),
            party_type=(
                NamedRef(id=evo.party_type_id, identifier=r.party_type_name)
                if evo.party_type_id
                else None
            ),
            trade_species=(
                NamedRef(id=evo.trade_species_id, identifier=r.trade_species_name)
                if evo.trade_species_id
                else None
            ),
            needs_overworld_rain=True if evo.needs_overworld_rain else None,
            turn_upside_down=True if evo.turn_upside_down else None,
        )

        trigger_ref = NamedRef(
            id=evo.trigger_id,
            name=r.trigger_name,
            identifier=r.trigger_identifier,
        )

        edges.append(
            EvolutionEdge(
                from_species_id=evo.from_species_id,
                to_species_id=evo.to_species_id,
                trigger=trigger_ref,
                requirements=req,
            )
        )

    return EvolutionChainResponse(chain_id=chain_id, nodes=nodes, edges=edges)
