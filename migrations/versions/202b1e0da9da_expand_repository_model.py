"""expand repository model

Revision ID: 202b1e0da9da
Revises: f7dfaced807e
Create Date: 2026-08-08 10:03:38.021924

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "202b1e0da9da"
down_revision: str | Sequence[str] | None = "f7dfaced807e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Expand the repository model."""

    # The initial schema already provides:
    # - repositories.github_id
    # - repositories.name
    # - repositories.organization_id
    #
    # Add the repository metadata required by the expanded model.

    op.add_column(
        "repositories",
        sa.Column(
            "full_name",
            sa.String(length=512),
            nullable=False,
        ),
    )

    op.add_column(
        "repositories",
        sa.Column(
            "clone_url",
            sa.String(length=1000),
            nullable=False,
        ),
    )

    op.add_column(
        "repositories",
        sa.Column(
            "html_url",
            sa.String(length=1000),
            nullable=False,
        ),
    )

    # Replace the old repository-wide GitHub ID uniqueness constraint
    # with an organization-scoped uniqueness constraint.
    op.drop_constraint(
        op.f("uq_repository_github"),
        "repositories",
        type_="unique",
    )

    op.create_index(
        op.f("ix_repositories_github_id"),
        "repositories",
        ["github_id"],
        unique=False,
    )

    op.create_unique_constraint(
        "uq_repository_organization_github",
        "repositories",
        ["organization_id", "github_id"],
    )


def downgrade() -> None:
    """Revert the repository model expansion."""

    op.drop_constraint(
        "uq_repository_organization_github",
        "repositories",
        type_="unique",
    )

    op.drop_index(
        op.f("ix_repositories_github_id"),
        table_name="repositories",
    )

    op.create_unique_constraint(
        op.f("uq_repository_github"),
        "repositories",
        ["github_id"],
        postgresql_nulls_not_distinct=False,
    )

    op.drop_column(
        "repositories",
        "html_url",
    )

    op.drop_column(
        "repositories",
        "clone_url",
    )

    op.drop_column(
        "repositories",
        "full_name",
    )