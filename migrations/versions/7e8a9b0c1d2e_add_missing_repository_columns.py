"""add missing repository columns

Revision ID: 7e8a9b0c1d2e
Revises: 6f1a2b3c4d5e
Create Date: 2026-09-20 20:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '7e8a9b0c1d2e'
down_revision: Union[str, Sequence[str], None] = '6f1a2b3c4d5e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add missing columns to repositories table to align with Repository model."""
    bind = op.get_bind()

    # 1. Create the repository_visibility PostgreSQL enum if on PostgreSQL
    repository_visibility = sa.Enum('public', 'private', name='repository_visibility')
    if bind.dialect.name == 'postgresql':
        pg_enum = postgresql.ENUM('public', 'private', name='repository_visibility')
        pg_enum.create(bind, checkfirst=True)

    # 2. Add description (nullable Text)
    op.add_column(
        'repositories',
        sa.Column('description', sa.Text(), nullable=True),
    )

    # 3. Add visibility (non-null enum, with safe existing-row default 'public')
    op.add_column(
        'repositories',
        sa.Column(
            'visibility',
            repository_visibility,
            server_default='public',
            nullable=False,
        ),
    )
    # Remove server_default so future inserts rely on application/model validation
    op.alter_column('repositories', 'visibility', server_default=None)

    # 4. Add default_branch (non-null String(255), with safe existing-row default 'main')
    op.add_column(
        'repositories',
        sa.Column(
            'default_branch',
            sa.String(length=255),
            server_default='main',
            nullable=False,
        ),
    )
    # Remove server_default so future inserts rely on application/model validation
    op.alter_column('repositories', 'default_branch', server_default=None)

    # 5. Add primary_language (nullable String(100))
    op.add_column(
        'repositories',
        sa.Column('primary_language', sa.String(length=100), nullable=True),
    )

    # 6. Add last_synced_at (nullable timezone-aware DateTime)
    op.add_column(
        'repositories',
        sa.Column('last_synced_at', sa.DateTime(timezone=True), nullable=True),
    )

    # 7. Add updated_at (non-null timezone-aware DateTime with server_default=now())
    op.add_column(
        'repositories',
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
    )


def downgrade() -> None:
    """Remove repository columns added in this migration."""
    op.drop_column('repositories', 'updated_at')
    op.drop_column('repositories', 'last_synced_at')
    op.drop_column('repositories', 'primary_language')
    op.drop_column('repositories', 'default_branch')
    op.drop_column('repositories', 'visibility')
    op.drop_column('repositories', 'description')

    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        pg_enum = postgresql.ENUM('public', 'private', name='repository_visibility')
        pg_enum.drop(bind, checkfirst=True)
