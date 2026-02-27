"""Add pitch booking detail fields

Revision ID: def789ghi012
Revises: abc123def456
Create Date: 2026-02-25 17:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'def789ghi012'
down_revision: Union[str, Sequence[str], None] = 'abc123def456'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add pitch booking detail fields to bookings and resources tables.

    For bookings:
    - title: Booking title/description
    - requester_name: Name of person requesting
    - team_name: Team or organization name
    - notes: Additional notes

    For resources:
    - surface: Surface type (e.g., Grass, Artificial Turf)
    - location: Physical location description
    """
    # Add fields to bookings table
    op.add_column(
        'bookings',
        sa.Column('title', sa.String(200), nullable=True)
    )
    op.add_column(
        'bookings',
        sa.Column('requester_name', sa.String(100), nullable=True)
    )
    op.add_column(
        'bookings',
        sa.Column('team_name', sa.String(100), nullable=True)
    )
    op.add_column(
        'bookings',
        sa.Column('notes', sa.String(500), nullable=True)
    )

    # Add fields to resources table
    op.add_column(
        'resources',
        sa.Column('surface', sa.String(50), nullable=True)
    )
    op.add_column(
        'resources',
        sa.Column('location', sa.String(200), nullable=True)
    )


def downgrade() -> None:
    """
    Remove pitch booking detail fields from bookings and resources tables.
    """
    # Remove from bookings
    op.drop_column('bookings', 'notes')
    op.drop_column('bookings', 'team_name')
    op.drop_column('bookings', 'requester_name')
    op.drop_column('bookings', 'title')

    # Remove from resources
    op.drop_column('resources', 'location')
    op.drop_column('resources', 'surface')
