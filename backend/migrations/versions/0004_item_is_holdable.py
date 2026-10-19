"""add items.is_holdable

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-19 12:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_columns = {c["name"] for c in inspector.get_columns("items")}

    if "is_holdable" not in existing_columns:
        op.add_column(
            "items",
            sa.Column(
                "is_holdable",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_columns = {c["name"] for c in inspector.get_columns("items")}

    if "is_holdable" in existing_columns:
        op.drop_column("items", "is_holdable")
