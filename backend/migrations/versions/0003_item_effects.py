"""item_effects

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-18 15:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "item_effects" not in existing_tables:
        op.create_table(
            "item_effects",
            sa.Column(
                "item_id",
                sa.Integer(),
                sa.ForeignKey("items.id"),
                primary_key=True,
                autoincrement=False,
            ),
            sa.Column("short_effect", sa.Text(), nullable=True),
            sa.Column("effect", sa.Text(), nullable=True),
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "item_effects" in existing_tables:
        op.drop_table("item_effects")
