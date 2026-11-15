"""learnsets by version group

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-14 11:46:14.382396

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0005'
down_revision: Union[str, Sequence[str], None] = '0004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "pokemon_move_methods",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=False),
        sa.Column("identifier", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=True),
        sa.UniqueConstraint("identifier", name="uq_pokemon_move_methods_identifier"),
    )

    with op.batch_alter_table("pokemon_moves", schema=None) as batch_op:
        batch_op.add_column(sa.Column("version_group_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("method_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("level", sa.Integer(), nullable=False, server_default="0"))
        batch_op.add_column(sa.Column("order", sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            "fk_pm_version_group", "version_groups", ["version_group_id"], ["id"]
        )
        batch_op.create_foreign_key(
            "fk_pm_method", "pokemon_move_methods", ["method_id"], ["id"]
        )
        batch_op.create_unique_constraint(
            "uq_pokemon_moves_natural_key",
            ["pokemon_id", "version_group_id", "move_id", "method_id", "level"],
        )
        batch_op.create_index(
            "ix_pokemon_moves_lookup",
            ["pokemon_id", "version_group_id"],
            unique=False,
        )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("pokemon_moves", schema=None) as batch_op:
        batch_op.drop_index("ix_pokemon_moves_lookup")
        batch_op.drop_constraint("uq_pokemon_moves_natural_key", type_="unique")
        batch_op.drop_constraint("fk_pm_method", type_="foreignkey")
        batch_op.drop_constraint("fk_pm_version_group", type_="foreignkey")
        batch_op.drop_column("order")
        batch_op.drop_column("level")
        batch_op.drop_column("method_id")
        batch_op.drop_column("version_group_id")

    op.drop_table("pokemon_move_methods")
