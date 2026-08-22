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

    # ------------------------------------------------------------------
    # Existing repository schema from the initial migration:
    #
    #   id
    #   name
    #   github_id
    #   organization_id
    #   created_at
    #
    # Add the repository metadata required by the expanded model.
    # ------------------------------------------------------------------

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

    # ------------------------------------------------------------------
    # The initial migration created:
    #
    #     sa.UniqueConstraint("github_id")
    #
    # without explicitly naming the constraint.
    #
    # PostgreSQL therefore creates the constraint as:
    #
    #     repositories_github_id_key
    #
    # Do not attempt to drop "uq_repository_github" because that
    # constraint does not exist in the initial migration.
    # ------------------------------------------------------------------

    op.execute(
        """
        ALTER TABLE repositories
        DROP CONSTRAINT IF EXISTS repositories_github_id_key
        """
    )

    # ------------------------------------------------------------------
    # github_id should remain indexed, but uniqueness is now scoped to
    # the organization.
    # ------------------------------------------------------------------

    op.create_index(
        "ix_repositories_github_id",
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

    # Remove organization-scoped uniqueness.
    op.drop_constraint(
        "uq_repository_organization_github",
        "repositories",
        type_="unique",
    )

    # Remove the non-unique github_id index.
    op.drop_index(
        "ix_repositories_github_id",
        table_name="repositories",
    )

    # Restore repository-wide github_id uniqueness.
    op.create_unique_constraint(
        "uq_repository_github",
        "repositories",
        ["github_id"],
    )

    # Remove expanded repository metadata.
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