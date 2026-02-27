"""Add pitch booking columns (resource_id and area)

Revision ID: abc123def456
Revises: ee9d9855d8bd
Create Date: 2026-02-25 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'abc123def456'
down_revision: Union[str, Sequence[str], None] = 'ee9d9855d8bd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add area column to bookings table for pitch booking support.

    Note: resource_id column already exists in the database, so we only add area.

    - area: For pitch bookings, specifies which part of the pitch is booked
            (whole, half-left, half-right, quarter-tl, quarter-tr, quarter-bl, quarter-br)
    """
    # Add area column (nullable, only used for pitch bookings)
    op.add_column(
        'bookings',
        sa.Column(
            'area',
            sa.String(20),
            nullable=True
        )
    )


def downgrade() -> None:
    """
    Remove area column from bookings table.

    Note: We don't remove resource_id as it existed before this migration.
    """
    # Remove area column
    op.drop_column('bookings', 'area')
