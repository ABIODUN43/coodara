"""add_architecture_memory_models

Revision ID: 3a9b1c2d3e4f
Revises: 2c8451c05279
Create Date: 2026-09-01 20:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '3a9b1c2d3e4f'
down_revision: Union[str, Sequence[str], None] = '2c8451c05279'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema for V2 Architecture Memory."""
    # 1. architecture_memories
    op.create_table(
        'architecture_memories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('repository_id', sa.Integer(), nullable=False),
        sa.Column('latest_analysis_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['latest_analysis_id'], ['analysis_jobs.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['repository_id'], ['repositories.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_architecture_memories_organization_id'), 'architecture_memories', ['organization_id'], unique=False)
    op.create_index(op.f('ix_architecture_memories_repository_id'), 'architecture_memories', ['repository_id'], unique=True)
    op.create_index(op.f('ix_architecture_memories_latest_analysis_id'), 'architecture_memories', ['latest_analysis_id'], unique=False)

    # 2. architecture_components
    op.create_table(
        'architecture_components',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('memory_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('component_type', sa.String(length=100), server_default='module', nullable=False),
        sa.Column('path', sa.String(length=1024), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('active', 'removed', 'upgraded', name='component_status', native_enum=True), server_default='active', nullable=False),
        sa.Column('first_seen_analysis_id', sa.Integer(), nullable=True),
        sa.Column('last_seen_analysis_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['memory_id'], ['architecture_memories.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('memory_id', 'name', name='uq_architecture_component_memory_name')
    )
    op.create_index(op.f('ix_architecture_components_memory_id'), 'architecture_components', ['memory_id'], unique=False)
    op.create_index(op.f('ix_architecture_components_status'), 'architecture_components', ['status'], unique=False)

    # 3. architecture_relationships
    op.create_table(
        'architecture_relationships',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('memory_id', sa.Integer(), nullable=False),
        sa.Column('source_component_id', sa.Integer(), nullable=False),
        sa.Column('target_component_id', sa.Integer(), nullable=False),
        sa.Column('kind', sa.String(length=50), server_default='depends_on', nullable=False),
        sa.Column('status', sa.Enum('active', 'removed', 'upgraded', name='relationship_status', native_enum=True), server_default='active', nullable=False),
        sa.Column('first_seen_analysis_id', sa.Integer(), nullable=True),
        sa.Column('last_seen_analysis_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['memory_id'], ['architecture_memories.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['source_component_id'], ['architecture_components.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['target_component_id'], ['architecture_components.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_architecture_relationships_memory_id'), 'architecture_relationships', ['memory_id'], unique=False)
    op.create_index(op.f('ix_architecture_relationships_source_component_id'), 'architecture_relationships', ['source_component_id'], unique=False)
    op.create_index(op.f('ix_architecture_relationships_target_component_id'), 'architecture_relationships', ['target_component_id'], unique=False)

    # 4. architecture_technology_memories
    op.create_table(
        'architecture_technology_memories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('memory_id', sa.Integer(), nullable=False),
        sa.Column('technology', sa.String(length=100), nullable=False),
        sa.Column('version', sa.String(length=100), nullable=True),
        sa.Column('category', sa.String(length=100), nullable=True),
        sa.Column('status', sa.Enum('active', 'removed', 'upgraded', name='tech_memory_status', native_enum=True), server_default='active', nullable=False),
        sa.Column('first_seen_analysis_id', sa.Integer(), nullable=True),
        sa.Column('last_seen_analysis_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['memory_id'], ['architecture_memories.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('memory_id', 'technology', name='uq_architecture_technology_memory_name')
    )
    op.create_index(op.f('ix_architecture_technology_memories_memory_id'), 'architecture_technology_memories', ['memory_id'], unique=False)

    # 5. architecture_memory_entries
    op.create_table(
        'architecture_memory_entries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('memory_id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('repository_id', sa.Integer(), nullable=False),
        sa.Column('analysis_id', sa.Integer(), nullable=True),
        sa.Column('memory_type', sa.Enum('ARCHITECTURE_FACT', 'ARCHITECTURE_DECISION', 'ARCHITECTURE_PATTERN', 'ARCHITECTURE_ISSUE', 'ARCHITECTURE_CONSTRAINT', 'ARCHITECTURE_CHANGE', name='memory_type', native_enum=True), server_default='ARCHITECTURE_FACT', nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('confidence', sa.Float(), server_default='1.0', nullable=False),
        sa.Column('source_analyzer', sa.String(length=100), nullable=True),
        sa.Column('source_file', sa.String(length=1024), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['analysis_id'], ['analysis_jobs.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['memory_id'], ['architecture_memories.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['repository_id'], ['repositories.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_architecture_memory_entries_memory_id'), 'architecture_memory_entries', ['memory_id'], unique=False)
    op.create_index(op.f('ix_architecture_memory_entries_organization_id'), 'architecture_memory_entries', ['organization_id'], unique=False)
    op.create_index(op.f('ix_architecture_memory_entries_repository_id'), 'architecture_memory_entries', ['repository_id'], unique=False)
    op.create_index(op.f('ix_architecture_memory_entries_memory_type'), 'architecture_memory_entries', ['memory_type'], unique=False)
    op.create_index(op.f('ix_architecture_memory_entries_created_at'), 'architecture_memory_entries', ['created_at'], unique=False)

    # 6. architecture_events
    op.create_table(
        'architecture_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('repository_id', sa.Integer(), nullable=False),
        sa.Column('analysis_id', sa.Integer(), nullable=False),
        sa.Column('event_type', sa.Enum('COMPONENT_ADDED', 'COMPONENT_REMOVED', 'RELATIONSHIP_ADDED', 'RELATIONSHIP_REMOVED', 'TECHNOLOGY_ADDED', 'TECHNOLOGY_REMOVED', 'TECHNOLOGY_CHANGED', 'DEPENDENCY_ADDED', 'DEPENDENCY_REMOVED', 'ISSUE_DETECTED', 'ISSUE_RESOLVED', 'SCORE_CHANGED', 'ARCHITECTURE_CHANGE', name='architecture_event_type', native_enum=True), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('details', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['analysis_id'], ['analysis_jobs.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['repository_id'], ['repositories.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_architecture_events_organization_id'), 'architecture_events', ['organization_id'], unique=False)
    op.create_index(op.f('ix_architecture_events_repository_id'), 'architecture_events', ['repository_id'], unique=False)
    op.create_index(op.f('ix_architecture_events_analysis_id'), 'architecture_events', ['analysis_id'], unique=False)
    op.create_index(op.f('ix_architecture_events_event_type'), 'architecture_events', ['event_type'], unique=False)
    op.create_index(op.f('ix_architecture_events_created_at'), 'architecture_events', ['created_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('architecture_events')
    op.drop_table('architecture_memory_entries')
    op.drop_table('architecture_technology_memories')
    op.drop_table('architecture_relationships')
    op.drop_table('architecture_components')
    op.drop_table('architecture_memories')
