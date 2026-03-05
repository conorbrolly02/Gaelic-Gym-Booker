"""increase_qr_code_column_size

Revision ID: fea829c40728
Revises: 85e8ac333fe5
Create Date: 2026-03-05 10:55:23.432605

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fea829c40728'
down_revision: Union[str, Sequence[str], None] = '85e8ac333fe5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # SQLite doesn't support ALTER COLUMN TYPE directly
    # Use batch operation to modify column
    with op.batch_alter_table('members', schema=None) as batch_op:
        batch_op.alter_column('qr_code',
                              existing_type=sa.String(length=5000),
                              type_=sa.String(length=100000),
                              existing_nullable=True,
                              existing_comment='QR code for gym access')


def downgrade() -> None:
    """Downgrade schema."""
    # Revert qr_code column size back to 5000
    with op.batch_alter_table('members', schema=None) as batch_op:
        batch_op.alter_column('qr_code',
                              existing_type=sa.String(length=100000),
                              type_=sa.String(length=5000),
                              existing_nullable=True,
                              existing_comment='QR code for gym access')
