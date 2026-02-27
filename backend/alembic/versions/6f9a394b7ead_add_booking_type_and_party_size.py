"""add_booking_type_and_party_size

Revision ID: 6f9a394b7ead
Revises: f2f547987da9
Create Date: 2026-02-24 11:06:03.783424

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6f9a394b7ead'
down_revision: Union[str, Sequence[str], None] = 'f2f547987da9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add booking_type column with default value 'SINGLE'
    op.add_column('bookings', sa.Column('booking_type', sa.String(), nullable=False, server_default='SINGLE'))

    # Add party_size column with default value 1
    op.add_column('bookings', sa.Column('party_size', sa.Integer(), nullable=False, server_default='1'))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove the added columns
    op.drop_column('bookings', 'party_size')
    op.drop_column('bookings', 'booking_type')
