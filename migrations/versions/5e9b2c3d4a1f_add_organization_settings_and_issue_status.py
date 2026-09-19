"""add_organization_settings_and_issue_status

Revision ID: 5e9b2c3d4a1f
Revises: 4d8a1f7e9c2b
Create Date: 2026-09-17 11:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5e9b2c3d4a1f'
down_revision: Union[str, Sequence[str], None] = '4d8a1f7e9c2b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema for OrganizationSettings and Architecture Issue/Recommendation lifecycle status."""
    # 1. Create organization_settings
    op.create_table(
        'organization_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('block_on_circular', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('auto_scan_on_push', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('min_health_threshold', sa.Integer(), server_default='70', nullable=False),
        sa.Column('llm_provider', sa.String(length=50), server_default='coodara', nullable=False),
        sa.Column('llm_model', sa.String(length=100), server_default='coodara-architecture-engine-v1', nullable=False),
        sa.Column('api_key_ciphertext', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_organization_settings_organization_id'), 'organization_settings', ['organization_id'], unique=True)

    # 2. Add lifecycle status columns to architecture_issues
    op.add_column('architecture_issues', sa.Column('status', sa.String(length=50), server_default='open', nullable=False))
    op.add_column('architecture_issues', sa.Column('dismissed_reason', sa.Text(), nullable=True))
    op.add_column('architecture_issues', sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True))

    # 3. Add lifecycle status columns to architecture_recommendations
    op.add_column('architecture_recommendations', sa.Column('status', sa.String(length=50), server_default='open', nullable=False))
    op.add_column('architecture_recommendations', sa.Column('action_plan', sa.Text(), nullable=True))
    op.add_column('architecture_recommendations', sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('architecture_recommendations', 'resolved_at')
    op.drop_column('architecture_recommendations', 'action_plan')
    op.drop_column('architecture_recommendations', 'status')

    op.drop_column('architecture_issues', 'resolved_at')
    op.drop_column('architecture_issues', 'dismissed_reason')
    op.drop_column('architecture_issues', 'status')

    op.drop_index(op.f('ix_organization_settings_organization_id'), table_name='organization_settings')
    op.drop_table('organization_settings')
