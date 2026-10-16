"""baseline

Revision ID: 0001
Revises: 
Create Date: 2026-10-16 17:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "users" not in existing_tables:
        op.create_table(
            "users",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("email", sa.String(), unique=True, index=True, nullable=True),
            sa.Column("name", sa.String(), nullable=True),
            sa.Column("google_id", sa.String(), unique=True, index=True, nullable=True),
            sa.Column("avatar_url", sa.String(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
        )

    if "saved_teams" not in existing_tables:
        op.create_table(
            "saved_teams",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("name", sa.String(), nullable=True),
            sa.Column("team_data", sa.Text(), nullable=True),
            sa.Column("is_public", sa.Boolean(), default=False),
            sa.Column("created_at", sa.DateTime(), nullable=True),
        )

    if "pokemon" not in existing_tables:
        op.create_table(
            "pokemon",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("name", sa.String(), index=True, nullable=True),
            sa.Column("type1", sa.String(), nullable=True),
            sa.Column("type2", sa.String(), nullable=True),
            sa.Column("hp", sa.Integer(), nullable=True),
            sa.Column("attack", sa.Integer(), nullable=True),
            sa.Column("defense", sa.Integer(), nullable=True),
            sa.Column("special_attack", sa.Integer(), nullable=True),
            sa.Column("special_defense", sa.Integer(), nullable=True),
            sa.Column("speed", sa.Integer(), nullable=True),
            sa.Column("sprite_url", sa.String(), nullable=True),
            sa.Column("region", sa.String(), nullable=True),
            sa.Column("generation", sa.Integer(), nullable=True),
            sa.Column("is_legendary", sa.Boolean(), default=False),
            sa.Column("is_mythical", sa.Boolean(), default=False),
            sa.Column("role", sa.String(), nullable=True),
            sa.Column("tier", sa.String(), nullable=True, default="N/A"),
            sa.Column("usage_rate", sa.Float(), nullable=True, default=0.0),
        )

    if "type_efficacy" not in existing_tables:
        op.create_table(
            "type_efficacy",
            sa.Column("damage_type", sa.String(), primary_key=True),
            sa.Column("target_type", sa.String(), primary_key=True),
            sa.Column("damage_factor", sa.Float(), nullable=True),
        )

    if "moves" not in existing_tables:
        op.create_table(
            "moves",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("name", sa.String(), index=True, nullable=True),
            sa.Column("type", sa.String(), nullable=True),
            sa.Column("power", sa.Integer(), nullable=True),
            sa.Column("accuracy", sa.Integer(), nullable=True),
            sa.Column("pp", sa.Integer(), nullable=True),
            sa.Column("priority", sa.Integer(), nullable=True),
            sa.Column("damage_class", sa.String(), nullable=True),
            sa.Column("effect_chance", sa.Integer(), nullable=True),
        )

    if "natures" not in existing_tables:
        op.create_table(
            "natures",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("name", sa.String(), unique=True, index=True, nullable=True),
            sa.Column("decreased_stat", sa.String(), nullable=True),
            sa.Column("increased_stat", sa.String(), nullable=True),
        )

    if "pokemon_moves" not in existing_tables:
        op.create_table(
            "pokemon_moves",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("pokemon_id", sa.Integer(), sa.ForeignKey("pokemon.id"), nullable=True),
            sa.Column("move_id", sa.Integer(), sa.ForeignKey("moves.id"), nullable=True),
            sa.Column("generation_id", sa.Integer(), nullable=True),
            sa.Column("learn_method", sa.String(), nullable=True),
        )

    if "abilities" not in existing_tables:
        op.create_table(
            "abilities",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("name", sa.String(), unique=True, index=True, nullable=True),
            sa.Column("short_effect", sa.String(), nullable=True),
        )

    if "pokemon_abilities" not in existing_tables:
        op.create_table(
            "pokemon_abilities",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("pokemon_id", sa.Integer(), sa.ForeignKey("pokemon.id"), nullable=True),
            sa.Column("ability_id", sa.Integer(), sa.ForeignKey("abilities.id"), nullable=True),
            sa.Column("is_hidden", sa.Boolean(), default=False),
        )

    if "item_pockets" not in existing_tables:
        op.create_table(
            "item_pockets",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("name", sa.String(), unique=True, index=True, nullable=True),
        )

    if "item_categories" not in existing_tables:
        op.create_table(
            "item_categories",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("name", sa.String(), unique=True, index=True, nullable=True),
            sa.Column("pocket_id", sa.Integer(), sa.ForeignKey("item_pockets.id"), nullable=True),
        )

    if "items" not in existing_tables:
        op.create_table(
            "items",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("name", sa.String(), unique=True, index=True, nullable=True),
            sa.Column("effect", sa.String(), nullable=True),
            sa.Column("sprite_url", sa.String(), nullable=True),
            sa.Column("category", sa.String(), nullable=True),
            sa.Column("category_id", sa.Integer(), sa.ForeignKey("item_categories.id"), nullable=True),
        )

    if "berry_firmnesses" not in existing_tables:
        op.create_table(
            "berry_firmnesses",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("name", sa.String(), unique=True, index=True, nullable=True),
        )

    if "berry_flavors" not in existing_tables:
        op.create_table(
            "berry_flavors",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("name", sa.String(), unique=True, index=True, nullable=True),
        )

    if "berries" not in existing_tables:
        op.create_table(
            "berries",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("name", sa.String(), unique=True, index=True, nullable=True),
            sa.Column("growth_time", sa.Integer(), nullable=True),
            sa.Column("max_harvest", sa.Integer(), nullable=True),
            sa.Column("natural_gift_power", sa.Integer(), nullable=True),
            sa.Column("size", sa.Integer(), nullable=True),
            sa.Column("smoothness", sa.Integer(), nullable=True),
            sa.Column("soil_dryness", sa.Integer(), nullable=True),
            sa.Column("firmness_id", sa.Integer(), sa.ForeignKey("berry_firmnesses.id"), nullable=True),
            sa.Column("item_id", sa.Integer(), sa.ForeignKey("items.id"), nullable=True),
            sa.Column("natural_gift_type", sa.String(), nullable=True),
        )

    if "berry_flavor_map" not in existing_tables:
        op.create_table(
            "berry_flavor_map",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("berry_id", sa.Integer(), sa.ForeignKey("berries.id"), nullable=True),
            sa.Column("flavor_id", sa.Integer(), sa.ForeignKey("berry_flavors.id"), nullable=True),
            sa.Column("potency", sa.Integer(), default=0),
        )


def downgrade() -> None:
    op.drop_table("berry_flavor_map")
    op.drop_table("berries")
    op.drop_table("berry_flavors")
    op.drop_table("berry_firmnesses")
    op.drop_table("items")
    op.drop_table("item_categories")
    op.drop_table("item_pockets")
    op.drop_table("pokemon_abilities")
    op.drop_table("abilities")
    op.drop_table("pokemon_moves")
    op.drop_table("natures")
    op.drop_table("moves")
    op.drop_table("type_efficacy")
    op.drop_table("pokemon")
    op.drop_table("saved_teams")
    op.drop_table("users")
