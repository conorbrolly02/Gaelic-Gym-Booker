"""add_version_column_to_bookings

Revision ID: 85e8ac333fe5
Revises: 701946b0ac15
Create Date: 2026-03-05 10:37:17.740070

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '85e8ac333fe5'
down_revision: Union[str, Sequence[str], None] = '701946b0ac15'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add version column to bookings table with default value of 1
    op.add_column('bookings', sa.Column('version', sa.Integer(), nullable=False, server_default='1', comment='Version number for optimistic locking'))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove version column from bookings table
    op.drop_column('bookings', 'version')
