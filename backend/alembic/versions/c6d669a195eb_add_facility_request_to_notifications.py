"""add_facility_request_to_notifications

Revision ID: c6d669a195eb
Revises: d3acf1f6eba2
Create Date: 2026-03-10 15:54:55.442036

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c6d669a195eb'
down_revision: Union[str, Sequence[str], None] = 'd3acf1f6eba2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add facility_request_id column to notifications and update enum."""
    from alembic import context

    bind = context.get_bind()
    dialect_name = bind.dialect.name

    # Add new notification types to enum (PostgreSQL only)
    if dialect_name == 'postgresql':
        # Add new enum values
        op.execute(
            "ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'FACILITY_REQUEST_SUBMITTED'"
        )
        op.execute(
            "ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'FACILITY_REQUEST_APPROVED'"
        )
        op.execute(
            "ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'FACILITY_REQUEST_REJECTED'"
        )

        # Add facility_request_id column with foreign key (PostgreSQL)
        op.add_column(
            'notifications',
            sa.Column('facility_request_id', sa.CHAR(36), nullable=True)
        )
        op.create_foreign_key(
            'fk_notifications_facility_request_id',
            'notifications',
            'facility_requests',
            ['facility_request_id'],
            ['id'],
            ondelete='SET NULL'
        )
    else:
        # For SQLite, use batch mode to add column
        # Foreign key will be enforced at ORM level
        with op.batch_alter_table('notifications') as batch_op:
            batch_op.add_column(
                sa.Column('facility_request_id', sa.CHAR(36), nullable=True)
            )


def downgrade() -> None:
    """Remove facility_request_id column from notifications."""
    from alembic import context

    bind = context.get_bind()
    dialect_name = bind.dialect.name

    if dialect_name == 'postgresql':
        # Drop foreign key constraint
        op.drop_constraint('fk_notifications_facility_request_id', 'notifications', type_='foreignkey')
        # Drop column
        op.drop_column('notifications', 'facility_request_id')
        # Note: Cannot easily remove enum values from PostgreSQL enum type
        # They will remain but unused after downgrade
    else:
        # For SQLite, use batch mode
        with op.batch_alter_table('notifications') as batch_op:
            batch_op.drop_column('facility_request_id')
