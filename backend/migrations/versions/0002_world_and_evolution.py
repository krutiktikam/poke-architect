"""world_and_evolution

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-16 17:16:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision: str = '0002'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = set(inspector.get_table_names())

    # If obsolete legacy tables exist with older schema, drop them so new world models are created
    if "locations" in existing_tables:
        loc_cols = {c["name"] for c in inspector.get_columns("locations")}
        if "region_id" not in loc_cols or "identifier" not in loc_cols:
            for old_t in ["encounter_condition_value_map", "encounters", "location_areas", "encounter_methods", "locations"]:
                if old_t in existing_tables:
                    op.drop_table(old_t)
            existing_tables -= {"encounter_condition_value_map", "encounters", "location_areas", "encounter_methods", "locations"}

    # 1. DataMeta
    if "data_meta" not in existing_tables:
        op.create_table(
            "data_meta",
            sa.Column("key", sa.String(length=64), primary_key=True),
            sa.Column("value", sa.String(length=255), nullable=False),
            sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        )

    # 2. Generations
    if "generations" not in existing_tables:
        op.create_table(
            "generations",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=False),
            sa.Column("identifier", sa.String(length=64), unique=True, nullable=False),
            sa.Column("name", sa.String(length=64), nullable=True),
        )

    # 3. Regions
    if "regions" not in existing_tables:
        op.create_table(
            "regions",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=False),
            sa.Column("identifier", sa.String(length=64), unique=True, nullable=False),
            sa.Column("name", sa.String(length=64), nullable=True),
        )

    # 4. Version Groups
    if "version_groups" not in existing_tables:
        op.create_table(
            "version_groups",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=False),
            sa.Column("identifier", sa.String(length=64), unique=True, nullable=False),
            sa.Column("generation_id", sa.Integer(), sa.ForeignKey("generations.id"), nullable=False),
            sa.Column("order", sa.Integer(), nullable=False),
        )

    # 5. Versions
    if "versions" not in existing_tables:
        op.create_table(
            "versions",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=False),
            sa.Column("version_group_id", sa.Integer(), sa.ForeignKey("version_groups.id"), index=True, nullable=False),
            sa.Column("identifier", sa.String(length=64), unique=True, nullable=False),
            sa.Column("name", sa.String(length=64), nullable=True),
        )

    # 6. Locations
    if "locations" not in existing_tables:
        op.create_table(
            "locations",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=False),
            sa.Column("region_id", sa.Integer(), sa.ForeignKey("regions.id"), index=True, nullable=True),
            sa.Column("identifier", sa.String(length=128), unique=True, nullable=False),
            sa.Column("name", sa.String(length=128), nullable=True),
        )

    # 7. Location Areas
    if "location_areas" not in existing_tables:
        op.create_table(
            "location_areas",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=False),
            sa.Column("location_id", sa.Integer(), sa.ForeignKey("locations.id"), index=True, nullable=False),
            sa.Column("game_index", sa.Integer(), nullable=True),
            sa.Column("identifier", sa.String(length=128), nullable=True),
            sa.Column("name", sa.String(length=128), nullable=True),
        )

    # 8. Encounter Methods
    if "encounter_methods" not in existing_tables:
        op.create_table(
            "encounter_methods",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=False),
            sa.Column("identifier", sa.String(length=64), unique=True, nullable=False),
            sa.Column("name", sa.String(length=64), nullable=True),
            sa.Column("order", sa.Integer(), nullable=True),
        )

    # 9. Encounter Conditions
    if "encounter_conditions" not in existing_tables:
        op.create_table(
            "encounter_conditions",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=False),
            sa.Column("identifier", sa.String(length=64), unique=True, nullable=False),
        )

    # 10. Encounter Condition Values
    if "encounter_condition_values" not in existing_tables:
        op.create_table(
            "encounter_condition_values",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=False),
            sa.Column("condition_id", sa.Integer(), sa.ForeignKey("encounter_conditions.id"), index=True, nullable=False),
            sa.Column("identifier", sa.String(length=64), nullable=False),
            sa.Column("is_default", sa.Boolean(), default=False, nullable=False),
        )

    # 11. Encounters
    if "encounters" not in existing_tables:
        op.create_table(
            "encounters",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=False),
            sa.Column("version_id", sa.Integer(), sa.ForeignKey("versions.id"), nullable=False),
            sa.Column("location_area_id", sa.Integer(), sa.ForeignKey("location_areas.id"), nullable=False),
            sa.Column("pokemon_id", sa.Integer(), sa.ForeignKey("pokemon.id"), nullable=False),
            sa.Column("method_id", sa.Integer(), sa.ForeignKey("encounter_methods.id"), nullable=False),
            sa.Column("slot", sa.Integer(), nullable=True),
            sa.Column("chance", sa.Integer(), nullable=True),
            sa.Column("min_level", sa.Integer(), nullable=False),
            sa.Column("max_level", sa.Integer(), nullable=False),
        )
        op.create_index("ix_encounters_pokemon_version", "encounters", ["pokemon_id", "version_id"])
        op.create_index("ix_encounters_area_version", "encounters", ["location_area_id", "version_id"])
        op.create_index("ix_encounters_method", "encounters", ["method_id"])

    # 12. Encounter Condition Value Map
    if "encounter_condition_value_map" not in existing_tables:
        op.create_table(
            "encounter_condition_value_map",
            sa.Column("encounter_id", sa.Integer(), sa.ForeignKey("encounters.id", ondelete="CASCADE"), primary_key=True),
            sa.Column("condition_value_id", sa.Integer(), sa.ForeignKey("encounter_condition_values.id"), primary_key=True),
        )

    # 13. Types
    if "types" not in existing_tables:
        op.create_table(
            "types",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=False),
            sa.Column("identifier", sa.String(length=64), unique=True, nullable=False),
            sa.Column("generation_id", sa.Integer(), nullable=True),
        )

    # 14. Evolution Triggers
    if "evolution_triggers" not in existing_tables:
        op.create_table(
            "evolution_triggers",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=False),
            sa.Column("identifier", sa.String(length=64), unique=True, nullable=False),
            sa.Column("name", sa.String(length=64), nullable=True),
        )

    # 15. Evolution Chains
    if "evolution_chains" not in existing_tables:
        op.create_table(
            "evolution_chains",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=False),
            sa.Column("baby_trigger_item_id", sa.Integer(), sa.ForeignKey("items.id"), nullable=True),
        )

    # 16. Pokemon Species
    if "pokemon_species" not in existing_tables:
        op.create_table(
            "pokemon_species",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=False),
            sa.Column("identifier", sa.String(length=64), unique=True, nullable=False),
            sa.Column("generation_id", sa.Integer(), nullable=True),
            sa.Column("evolves_from_species_id", sa.Integer(), sa.ForeignKey("pokemon_species.id"), nullable=True),
            sa.Column("evolution_chain_id", sa.Integer(), sa.ForeignKey("evolution_chains.id"), nullable=True),
            sa.Column("order", sa.Integer(), nullable=True),
        )
    else:
        # Check for missing columns on existing pokemon_species
        species_cols = [c["name"] for c in inspector.get_columns("pokemon_species")]
        with op.batch_alter_table("pokemon_species") as batch_op:
            if "evolution_chain_id" not in species_cols:
                batch_op.add_column(sa.Column("evolution_chain_id", sa.Integer(), sa.ForeignKey("evolution_chains.id"), nullable=True))
            if "evolves_from_species_id" not in species_cols:
                batch_op.add_column(sa.Column("evolves_from_species_id", sa.Integer(), sa.ForeignKey("pokemon_species.id"), nullable=True))

    # 17. Evolutions
    if "evolutions" not in existing_tables:
        op.create_table(
            "evolutions",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=False),
            sa.Column("chain_id", sa.Integer(), sa.ForeignKey("evolution_chains.id"), nullable=False),
            sa.Column("from_species_id", sa.Integer(), sa.ForeignKey("pokemon_species.id"), nullable=False),
            sa.Column("to_species_id", sa.Integer(), sa.ForeignKey("pokemon_species.id"), nullable=False),
            sa.Column("trigger_id", sa.Integer(), sa.ForeignKey("evolution_triggers.id"), nullable=False),
            sa.Column("trigger_item_id", sa.Integer(), sa.ForeignKey("items.id"), nullable=True),
            sa.Column("held_item_id", sa.Integer(), sa.ForeignKey("items.id"), nullable=True),
            sa.Column("min_level", sa.Integer(), nullable=True),
            sa.Column("gender", sa.Integer(), nullable=True),
            sa.Column("location_id", sa.Integer(), sa.ForeignKey("locations.id"), nullable=True),
            sa.Column("time_of_day", sa.String(length=16), nullable=True),
            sa.Column("known_move_id", sa.Integer(), sa.ForeignKey("moves.id"), nullable=True),
            sa.Column("known_move_type_id", sa.Integer(), sa.ForeignKey("types.id"), nullable=True),
            sa.Column("min_happiness", sa.Integer(), nullable=True),
            sa.Column("min_beauty", sa.Integer(), nullable=True),
            sa.Column("min_affection", sa.Integer(), nullable=True),
            sa.Column("relative_physical_stats", sa.Integer(), nullable=True),
            sa.Column("party_species_id", sa.Integer(), sa.ForeignKey("pokemon_species.id"), nullable=True),
            sa.Column("party_type_id", sa.Integer(), sa.ForeignKey("types.id"), nullable=True),
            sa.Column("trade_species_id", sa.Integer(), sa.ForeignKey("pokemon_species.id"), nullable=True),
            sa.Column("needs_overworld_rain", sa.Boolean(), default=False, nullable=False),
            sa.Column("turn_upside_down", sa.Boolean(), default=False, nullable=False),
        )
        op.create_index("ix_evolutions_from", "evolutions", ["from_species_id"])
        op.create_index("ix_evolutions_to", "evolutions", ["to_species_id"])
        op.create_index("ix_evolutions_chain", "evolutions", ["chain_id"])

    # 18. Ensure evolution_chain_id on pokemon table
    if "pokemon" in existing_tables:
        pokemon_cols = [c["name"] for c in inspector.get_columns("pokemon")]
        if "evolution_chain_id" not in pokemon_cols:
            with op.batch_alter_table("pokemon") as batch_op:
                batch_op.add_column(sa.Column("evolution_chain_id", sa.Integer(), sa.ForeignKey("evolution_chains.id"), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "pokemon" in existing_tables:
        pokemon_cols = [c["name"] for c in inspector.get_columns("pokemon")]
        if "evolution_chain_id" in pokemon_cols:
            with op.batch_alter_table("pokemon") as batch_op:
                batch_op.drop_column("evolution_chain_id")

    op.drop_table("evolutions")
    op.drop_table("pokemon_species")
    op.drop_table("evolution_chains")
    op.drop_table("evolution_triggers")
    op.drop_table("types")
    op.drop_table("encounter_condition_value_map")
    op.drop_table("encounters")
    op.drop_table("encounter_condition_values")
    op.drop_table("encounter_conditions")
    op.drop_table("encounter_methods")
    op.drop_table("location_areas")
    op.drop_table("locations")
    op.drop_table("versions")
    op.drop_table("version_groups")
    op.drop_table("regions")
    op.drop_table("generations")
    op.drop_table("data_meta")
