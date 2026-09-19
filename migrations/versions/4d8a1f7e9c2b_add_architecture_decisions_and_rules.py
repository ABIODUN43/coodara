"""add_architecture_decisions_and_rules

Revision ID: 4d8a1f7e9c2b
Revises: 3a9b1c2d3e4f
Create Date: 2026-09-17 07:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4d8a1f7e9c2b'
down_revision: Union[str, Sequence[str], None] = '3a9b1c2d3e4f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema for Architecture Decisions (ADRs) and Custom Rules."""
    # 1. architecture_decisions
    op.create_table(
        'architecture_decisions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('repository_id', sa.Integer(), nullable=False),
        sa.Column('adr_number', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=50), server_default='accepted', nullable=False),
        sa.Column('decision_date', sa.String(length=50), nullable=False),
        sa.Column('author', sa.String(length=255), server_default='Architect', nullable=False),
        sa.Column('context', sa.Text(), nullable=False),
        sa.Column('decision', sa.Text(), nullable=False),
        sa.Column('consequences', sa.Text(), server_default='[]', nullable=False),
        sa.Column('affected_components', sa.Text(), server_default='[]', nullable=False),
        sa.Column('tags', sa.Text(), server_default='[]', nullable=False),
        sa.Column('source_file', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['repository_id'], ['repositories.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_architecture_decisions_repository_id'), 'architecture_decisions', ['repository_id'], unique=False)
    op.create_index(op.f('ix_architecture_decisions_adr_number'), 'architecture_decisions', ['adr_number'], unique=False)

    # 2. architecture_rules
    op.create_table(
        'architecture_rules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('repository_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('rule_type', sa.String(length=50), server_default='disallow_dependency', nullable=False),
        sa.Column('source_pattern', sa.String(length=255), nullable=False),
        sa.Column('target_pattern', sa.String(length=255), nullable=False),
        sa.Column('severity', sa.String(length=50), server_default='critical', nullable=False),
        sa.Column('rationale', sa.Text(), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['repository_id'], ['repositories.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_architecture_rules_repository_id'), 'architecture_rules', ['repository_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_architecture_rules_repository_id'), table_name='architecture_rules')
    op.drop_table('architecture_rules')
    op.drop_index(op.f('ix_architecture_decisions_adr_number'), table_name='architecture_decisions')
    op.drop_index(op.f('ix_architecture_decisions_repository_id'), table_name='architecture_decisions')
    op.drop_table('architecture_decisions')
