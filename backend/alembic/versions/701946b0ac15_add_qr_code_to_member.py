"""add_qr_code_to_member

Revision ID: 701946b0ac15
Revises: 79b0e6c7e804
Create Date: 2026-03-05 09:31:52.664977

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '701946b0ac15'
down_revision: Union[str, Sequence[str], None] = '79b0e6c7e804'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('members', sa.Column('qr_code', sa.String(length=5000), nullable=True, comment='QR code for gym access'))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('members', 'qr_code')
