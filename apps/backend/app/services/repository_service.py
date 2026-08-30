"""
Repository application service.

Responsible for repository business workflows.

This service owns:

- GitHub repository import workflow.
- GitHub repository picker/listing workflow.
- Organization ownership enforcement.
- Duplicate detection.
- GitHub access validation.
- Branch validation.
- Repository update rules.
- Repository deletion rules.
- Domain-level error translation.

This service does not own:

- FastAPI request handling.
- SQL construction.
- GitHub HTTP implementation.
- Database transaction commits.
- Git cloning.
- Repository analysis.
- Background jobs.

Transaction boundaries are owned by the application/API layer.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from app.models.repository import Repository, RepositoryVisibility
from app.repositories.repository_repository import RepositoryRepository
from app.schemas.repository import (
    RepositoryImportRequest,
    RepositoryUpdateRequest,
)
from app.services.github_service import (
    GitHubAuthenticationError,
    GitHubClient,
    GitHubNotFoundError,
)
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession


class RepositoryServiceError(Exception):
    """Base exception for repository service failures."""


class RepositoryNotFoundError(RepositoryServiceError):
    """Repository does not exist in the organization."""


class RepositoryAlreadyExistsError(RepositoryServiceError):
    """Repository is already imported."""


class GitHubRepositoryNotFoundError(RepositoryServiceError):
    """GitHub repository does not exist or is inaccessible."""


class GitHubRepositoryAccessError(RepositoryServiceError):
    """GitHub authorization failed."""


class InvalidRepositoryBranchError(RepositoryServiceError):
    """Requested branch does not exist."""


class RepositoryService:
    """
    Application service for repository management.

    Business workflows are coordinated here while persistence,
    GitHub communication, and transaction management remain in
    their respective layers.
    """

    def __init__(
        self,
        *,
        db: AsyncSession,
        github_client: GitHubClient,
        github_access_token: str | None = None,
    ) -> None:
        self.repository_repository = RepositoryRepository(db)
        self.github_client = github_client
        self.github_access_token = github_access_token

    async def import_repository(
        self,
        *,
        organization_id: int,
        payload: RepositoryImportRequest,
    ) -> Repository:
        """
        Import an accessible GitHub repository into an organization.

        Workflow:

        1. Retrieve repository metadata from GitHub.
        2. Validate the GitHub repository ID.
        3. Prevent duplicate imports within the organization.
        4. Resolve and validate the default branch.
        5. Build the Coodara repository entity.
        6. Persist the entity without committing.

        Transaction ownership remains outside the service.
        """

        github_repository = await self._get_github_repository(
            owner=payload.owner,
            repository_name=payload.name,
        )

        github_id = self._extract_github_id(
            github_repository,
        )

        await self._ensure_repository_not_imported(
            organization_id=organization_id,
            github_id=github_id,
        )

        default_branch = await self._resolve_default_branch(
            github_repository=github_repository,
            requested_branch=payload.default_branch,
        )

        repository = self._build_repository(
            organization_id=organization_id,
            github_repository=github_repository,
            default_branch=default_branch,
        )

        try:
            await self.repository_repository.create(repository)

        except IntegrityError as exc:
            if self._is_repository_unique_constraint_violation(exc):
                raise RepositoryAlreadyExistsError(
                    "Repository is already imported into this organization.",
                ) from exc

            raise RepositoryServiceError(
                "Repository could not be persisted.",
            ) from exc

        return repository

    async def get_repository(
        self,
        *,
        organization_id: int,
        repository_id: int,
    ) -> Repository:
        """
        Retrieve a repository belonging to an organization.

        Organization scoping is enforced by the persistence query.
        """

        repository = (
            await self.repository_repository.get_by_organization_and_id(
                organization_id=organization_id,
                repository_id=repository_id,
            )
        )

        if repository is None:
            raise RepositoryNotFoundError(
                "Repository not found.",
            )

        return repository

    async def list_repositories(
        self,
        *,
        organization_id: int,
        page: int = 1,
        per_page: int = 20,
    ) -> tuple[list[Repository], int]:
        """
        List repositories belonging to an organization.

        Returns:

            (
                repositories,
                total_count,
            )
        """

        if page < 1:
            raise ValueError(
                "page must be greater than or equal to 1.",
            )

        if not 1 <= per_page <= 100:
            raise ValueError(
                "per_page must be between 1 and 100.",
            )

        offset = (page - 1) * per_page

        repositories = await (
            self.repository_repository.list_by_organization(
                organization_id=organization_id,
                offset=offset,
                limit=per_page,
            )
        )

        total = await (
            self.repository_repository.count_by_organization(
                organization_id=organization_id,
            )
        )

        return list(repositories), total

    async def list_github_repositories(
        self,
        *,
        page: int = 1,
        per_page: int = 50,
    ) -> list[Mapping[str, Any]]:
        """
        List repositories accessible to the authenticated GitHub user.

        This retrieves GitHub repositories only. It does not persist
        anything into Coodara.

        The authenticated GitHub token is supplied by the API layer.
        """

        if page < 1:
            raise ValueError(
                "page must be greater than or equal to 1.",
            )

        if not 1 <= per_page <= 100:
            raise ValueError(
                "per_page must be between 1 and 100.",
            )

        try:
            repositories = await self.github_client.list_repositories(
                access_token=self._require_github_access_token(),
                page=page,
                per_page=per_page,
            )

        except GitHubAuthenticationError as exc:
            raise GitHubRepositoryAccessError(
                "GitHub authorization is invalid or expired.",
            ) from exc

        if not isinstance(repositories, list):
            raise RepositoryServiceError(
                "GitHub returned an invalid repository list.",
            )

        return [
            repository
            for repository in repositories
            if isinstance(repository, Mapping)
        ]

    async def update_repository(
        self,
        *,
        organization_id: int,
        repository_id: int,
        payload: RepositoryUpdateRequest,
    ) -> Repository:
        """
        Update mutable repository settings.

        Currently supported settings:

        - default_branch
        """

        repository = await self.get_repository(
            organization_id=organization_id,
            repository_id=repository_id,
        )

        if payload.default_branch is not None:
            branch_name = payload.default_branch.strip()

            await self._validate_branch(
                repository=repository,
                branch_name=branch_name,
            )

            repository.default_branch = branch_name

        return await self.repository_repository.update(
            repository,
        )

    async def delete_repository(
        self,
        *,
        organization_id: int,
        repository_id: int,
    ) -> None:
        """
        Delete a repository from Coodara.

        This does not delete anything from GitHub.
        """

        repository = await self.get_repository(
            organization_id=organization_id,
            repository_id=repository_id,
        )

        await self.repository_repository.delete(
            repository,
        )

    def _require_github_access_token(self) -> str:
        """
        Return the GitHub access token required for
        GitHub-dependent operations.
        """

        if not self.github_access_token:
            raise GitHubRepositoryAccessError(
                "GitHub authorization is required.",
            )

        return self.github_access_token

    async def _get_github_repository(
        self,
        *,
        owner: str,
        repository_name: str,
    ) -> Mapping[str, Any]:
        """
        Retrieve repository metadata from GitHub.

        GitHub-specific failures are translated into
        repository service exceptions.
        """

        try:
            repository = await self.github_client.get_repository(
                access_token=self._require_github_access_token(),
                owner=owner,
                repository=repository_name,
            )

        except GitHubNotFoundError as exc:
            raise GitHubRepositoryNotFoundError(
                "GitHub repository was not found or is not accessible.",
            ) from exc

        except GitHubAuthenticationError as exc:
            raise GitHubRepositoryAccessError(
                "GitHub authorization is invalid or expired.",
            ) from exc

        if not isinstance(repository, Mapping):
            raise RepositoryServiceError(
                "GitHub returned an invalid repository response.",
            )

        return repository

    async def _validate_branch(
        self,
        *,
        repository: Repository,
        branch_name: str,
    ) -> None:
        """
        Validate that a branch exists in a stored repository.
        """

        if not branch_name:
            raise InvalidRepositoryBranchError(
                "Repository branch cannot be empty.",
            )

        owner, repository_name = self._split_full_name(
            repository.full_name,
        )

        await self._validate_github_branch(
            owner=owner,
            repository_name=repository_name,
            branch_name=branch_name,
        )

    async def _validate_github_branch(
        self,
        *,
        owner: str,
        repository_name: str,
        branch_name: str,
    ) -> None:
        """
        Validate that a GitHub repository branch exists.

        GitHub-specific exceptions are translated into
        domain-level repository service exceptions.
        """

        if not branch_name:
            raise InvalidRepositoryBranchError(
                "Repository branch cannot be empty.",
            )

        try:
            await self.github_client.get_branch(
                access_token=self._require_github_access_token(),
                owner=owner,
                repository=repository_name,
                branch=branch_name,
            )

        except GitHubNotFoundError as exc:
            raise InvalidRepositoryBranchError(
                f"Branch {branch_name!r} does not exist or is not accessible.",
            ) from exc

        except GitHubAuthenticationError as exc:
            raise GitHubRepositoryAccessError(
                "GitHub authorization is invalid or expired.",
            ) from exc

    async def _resolve_default_branch(
        self,
        *,
        github_repository: Mapping[str, Any],
        requested_branch: str | None,
    ) -> str:
        """
        Resolve the repository default branch.

        If no branch was explicitly requested, the branch returned
        by GitHub is used.

        If a branch was explicitly requested, it must exist on GitHub.
        """

        github_default_branch = github_repository.get(
            "default_branch",
        )

        if not isinstance(github_default_branch, str):
            raise RepositoryServiceError(
                "GitHub repository does not contain a valid default branch.",
            )

        github_default_branch = github_default_branch.strip()

        if not github_default_branch:
            raise RepositoryServiceError(
                "GitHub repository does not contain a valid default branch.",
            )

        if requested_branch is None:
            return github_default_branch

        branch_name = requested_branch.strip()

        if not branch_name:
            raise InvalidRepositoryBranchError(
                "Repository branch cannot be empty.",
            )

        full_name = github_repository.get(
            "full_name",
        )

        owner, repository_name = self._split_full_name(
            full_name,
        )

        await self._validate_github_branch(
            owner=owner,
            repository_name=repository_name,
            branch_name=branch_name,
        )

        return branch_name

    async def _ensure_repository_not_imported(
        self,
        *,
        organization_id: int,
        github_id: int,
    ) -> None:
        """
        Prevent duplicate repository imports within an organization.

        The database unique constraint remains the final protection
        against concurrent duplicate imports.
        """

        existing_repository = (
            await self.repository_repository.get_by_organization_and_github_id(
                organization_id=organization_id,
                github_id=github_id,
            )
        )

        if existing_repository is not None:
            raise RepositoryAlreadyExistsError(
                "Repository is already imported into this organization.",
            )

    @classmethod
    def _build_repository(
        cls,
        *,
        organization_id: int,
        github_repository: Mapping[str, Any],
        default_branch: str,
    ) -> Repository:
        """
        Map validated GitHub repository metadata to a
        Coodara Repository entity.
        """

        github_id = cls._extract_github_id(
            github_repository,
        )

        visibility_value = github_repository.get(
            "visibility",
        )

        try:
            visibility = RepositoryVisibility(
                visibility_value,
            )
        except ValueError as exc:
            raise RepositoryServiceError(
                "Unsupported GitHub repository visibility.",
            ) from exc

        name = cls._require_string(
            github_repository.get("name"),
            "repository name",
        )

        full_name = cls._require_string(
            github_repository.get("full_name"),
            "repository full_name",
        )

        clone_url = cls._require_string(
            github_repository.get("clone_url"),
            "clone URL",
        )

        html_url = cls._require_string(
            github_repository.get("html_url"),
            "HTML URL",
        )

        cls._split_full_name(
            full_name,
        )

        return Repository(
            organization_id=organization_id,
            github_id=github_id,
            name=name,
            full_name=full_name,
            description=cls._optional_string(
                github_repository.get("description"),
            ),
            visibility=visibility,
            default_branch=default_branch,
            primary_language=cls._optional_string(
                github_repository.get("language"),
            ),
            clone_url=clone_url,
            html_url=html_url,
        )

    @staticmethod
    def _extract_github_id(
        github_repository: Mapping[str, Any],
    ) -> int:
        """
        Extract a valid GitHub repository ID.
        """

        github_id = github_repository.get(
            "id",
        )

        if isinstance(github_id, bool):
            raise RepositoryServiceError(
                "GitHub response contains an invalid repository ID.",
            )

        if not isinstance(github_id, int) or github_id <= 0:
            raise RepositoryServiceError(
                "GitHub response contains an invalid repository ID.",
            )

        return github_id

    @staticmethod
    def _require_string(
        value: Any,
        field_name: str,
    ) -> str:
        """
        Validate and normalize a required string field.
        """

        if not isinstance(value, str):
            raise RepositoryServiceError(
                f"GitHub response contains an invalid {field_name}.",
            )

        value = value.strip()

        if not value:
            raise RepositoryServiceError(
                f"GitHub response contains an invalid {field_name}.",
            )

        return value

    @staticmethod
    def _optional_string(
        value: Any,
    ) -> str | None:
        """
        Validate and normalize an optional string field.
        """

        if value is None:
            return None

        if not isinstance(value, str):
            raise RepositoryServiceError(
                "GitHub response contains an invalid string field.",
            )

        value = value.strip()

        return value or None

    @staticmethod
    def _split_full_name(
        full_name: Any,
    ) -> tuple[str, str]:
        """
        Split a GitHub full repository name.

        Expected format:

            owner/repository
        """

        if not isinstance(full_name, str):
            raise RepositoryServiceError(
                "Invalid GitHub repository full_name.",
            )

        owner, separator, repository = full_name.partition("/")

        if (
            not separator
            or not owner
            or not repository
            or "/" in repository
        ):
            raise RepositoryServiceError(
                "Invalid GitHub repository full_name.",
            )

        return owner, repository

    @staticmethod
    def _is_repository_unique_constraint_violation(
        exc: IntegrityError,
    ) -> bool:
        """
        Determine whether an IntegrityError was caused by the
        repository organization/GitHub uniqueness constraint.

        The database remains the authoritative protection against
        concurrent duplicate imports.
        """

        constraint_name = "uq_repository_organization_github"

        message = str(exc.orig).lower()

        return (
            constraint_name.lower() in message
            or (
                "organization_id" in message
                and "github_id" in message
            )
        )