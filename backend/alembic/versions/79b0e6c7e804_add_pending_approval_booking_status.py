"""add_pending_approval_booking_status

Revision ID: 79b0e6c7e804
Revises: def789ghi012
Create Date: 2026-03-03 10:39:27.049780

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '79b0e6c7e804'
down_revision: Union[str, Sequence[str], None] = 'def789ghi012'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add PENDING_APPROVAL status to BookingStatus enum."""
    # Check if we're using PostgreSQL or SQLite
    import sqlalchemy as sa
    from alembic import context

    bind = context.get_bind()
    dialect_name = bind.dialect.name

    if dialect_name == 'postgresql':
        # For PostgreSQL, add new enum value
        op.execute("ALTER TYPE bookingstatus ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL' BEFORE 'CONFIRMED'")
    # For SQLite, enums are stored as strings, so no schema change needed


def downgrade() -> None:
    """Downgrade schema."""
    # Note: Removing enum values from PostgreSQL is complex and risky
    # For SQLite, no action needed
    # Leaving empty - manual intervention required if rollback needed
    pass
