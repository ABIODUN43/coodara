"""add_architecture_simulations_table

Revision ID: 6f1a2b3c4d5e
Revises: 5e9b2c3d4a1f
Create Date: 2026-09-19 22:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6f1a2b3c4d5e'
down_revision: Union[str, Sequence[str], None] = '5e9b2c3d4a1f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create architecture_simulations table."""
    op.create_table(
        'architecture_simulations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('simulation_id', sa.String(length=100), nullable=False),
        sa.Column('repository_id', sa.Integer(), nullable=False),
        sa.Column('commit_sha', sa.String(length=40), server_default='HEAD', nullable=False),
        sa.Column('user_request', sa.Text(), nullable=False),
        sa.Column('normalized_intervention', sa.String(length=50), server_default='Refactor', nullable=False),
        sa.Column('target_entities', sa.Text(), server_default='[]', nullable=False),
        sa.Column('hypothetical_changes', sa.Text(), server_default='{}', nullable=False),
        sa.Column('predicted_impacts', sa.Text(), server_default='{}', nullable=False),
        sa.Column('evidence', sa.Text(), server_default='[]', nullable=False),
        sa.Column('confidence', sa.String(length=50), server_default='HIGH', nullable=False),
        sa.Column('alternatives', sa.Text(), server_default='[]', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['repository_id'], ['repositories.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_architecture_simulations_simulation_id'), 'architecture_simulations', ['simulation_id'], unique=True)
    op.create_index(op.f('ix_architecture_simulations_repository_id'), 'architecture_simulations', ['repository_id'], unique=False)


def downgrade() -> None:
    """Drop architecture_simulations table."""
    op.drop_index(op.f('ix_architecture_simulations_repository_id'), table_name='architecture_simulations')
    op.drop_index(op.f('ix_architecture_simulations_simulation_id'), table_name='architecture_simulations')
    op.drop_table('architecture_simulations')
