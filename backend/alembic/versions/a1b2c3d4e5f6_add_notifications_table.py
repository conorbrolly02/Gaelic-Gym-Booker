"""add_notifications_table

Revision ID: a1b2c3d4e5f6
Revises: fea829c40728
Create Date: 2026-03-10 09:32:25.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'fea829c40728'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the notifications table."""
    from alembic import context

    bind = context.get_bind()
    dialect_name = bind.dialect.name

    if dialect_name == 'postgresql':
        op.execute(
            "CREATE TYPE IF NOT EXISTS notificationtype AS ENUM ("
            "'BOOKING_APPROVED', 'BOOKING_REJECTED', 'MEMBERSHIP_APPROVED', "
            "'MEMBERSHIP_SUSPENDED', 'MEMBERSHIP_REACTIVATED')"
        )

    op.create_table(
        'notifications',
        sa.Column('id', sa.CHAR(36), nullable=False),
        sa.Column('user_id', sa.CHAR(36), nullable=False),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('message', sa.String(500), nullable=False),
        sa.Column('booking_id', sa.CHAR(36), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default=sa.text('0')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['booking_id'], ['bookings.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_notifications_user_id', 'notifications', ['user_id'])


def downgrade() -> None:
    """Drop the notifications table."""
    op.drop_index('ix_notifications_user_id', 'notifications')
    op.drop_table('notifications')

    from alembic import context
    bind = context.get_bind()
    if bind.dialect.name == 'postgresql':
        op.execute("DROP TYPE IF EXISTS notificationtype")
