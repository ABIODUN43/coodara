"""add result_data to lab_experiment_runs

Revision ID: 9a3b4c5d6e7f
Revises: 8f2a1b3c5e7d
Create Date: 2026-10-03 16:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9a3b4c5d6e7f'
down_revision: Union[str, Sequence[str], None] = '8f2a1b3c5e7d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'lab_experiment_runs',
        sa.Column('result_data', sa.JSON(), server_default='{}', nullable=False)
    )


def downgrade() -> None:
    op.drop_column('lab_experiment_runs', 'result_data')
