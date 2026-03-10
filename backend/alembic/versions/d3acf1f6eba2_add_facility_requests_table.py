"""add_facility_requests_table

Revision ID: d3acf1f6eba2
Revises: a1b2c3d4e5f6
Create Date: 2026-03-10 15:47:55.887156

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd3acf1f6eba2'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the facility_requests table."""
    from alembic import context

    bind = context.get_bind()
    dialect_name = bind.dialect.name

    # Create enum type for PostgreSQL
    if dialect_name == 'postgresql':
        op.execute(
            "CREATE TYPE IF NOT EXISTS facility_request_status AS ENUM ("
            "'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')"
        )

    # Create facility_requests table
    op.create_table(
        'facility_requests',
        sa.Column('id', sa.CHAR(36), nullable=False),
        sa.Column('member_id', sa.CHAR(36), nullable=False),
        sa.Column('facility_type', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('requested_equipment', sa.Text(), nullable=True),
        sa.Column('start_date', sa.DateTime(), nullable=False),
        sa.Column('end_date', sa.DateTime(), nullable=False),
        sa.Column('purpose', sa.Text(), nullable=False),
        sa.Column('status', sa.String(50), nullable=False, server_default='PENDING'),
        sa.Column('created_by', sa.CHAR(36), nullable=False),
        sa.Column('approved_by', sa.CHAR(36), nullable=True),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['member_id'], ['members.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['approved_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )

    # Create indexes for better query performance
    op.create_index('ix_facility_requests_member_id', 'facility_requests', ['member_id'])
    op.create_index('ix_facility_requests_status', 'facility_requests', ['status'])
    op.create_index('ix_facility_requests_start_date', 'facility_requests', ['start_date'])


def downgrade() -> None:
    """Drop the facility_requests table."""
    op.drop_index('ix_facility_requests_start_date', 'facility_requests')
    op.drop_index('ix_facility_requests_status', 'facility_requests')
    op.drop_index('ix_facility_requests_member_id', 'facility_requests')
    op.drop_table('facility_requests')

    # Drop enum type for PostgreSQL
    from alembic import context
    bind = context.get_bind()
    if bind.dialect.name == 'postgresql':
        op.execute("DROP TYPE IF EXISTS facility_request_status")
