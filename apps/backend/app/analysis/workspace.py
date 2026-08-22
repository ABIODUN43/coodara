"""
Repository workspace management for analysis execution.

This module owns temporary filesystem workspaces used during analysis.
It deliberately knows nothing about SQLAlchemy, FastAPI, or analyzers.
"""

from __future__ import annotations

import subprocess
import types
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Self


class RepositoryWorkspaceError(Exception):
    """Base exception for repository workspace failures."""


class RepositoryCloneError(RepositoryWorkspaceError):
    """Raised when a repository cannot be cloned."""


class RepositoryWorkspace:
    """
    Temporary workspace containing one repository checkout.

    The workspace is responsible for:
    - creating an isolated temporary directory;
    - cloning the repository into that directory;
    - cleaning the directory when execution finishes.

    It does not persist anything.
    """

    def __init__(
        self,
        *,
        clone_url: str,
        branch: str | None = None,
    ) -> None:
        if not clone_url.strip():
            raise ValueError("clone_url must not be empty")

        if branch is not None and not branch.strip():
            raise ValueError("branch must not be empty when provided")

        self._clone_url = clone_url.strip()
        self._branch = branch.strip() if branch is not None else None
        self._temporary_directory: TemporaryDirectory[str] | None = None
        self._repository_path: Path | None = None

    def __enter__(self) -> Self:
        self._temporary_directory = TemporaryDirectory(
            prefix="coodara-analysis-",
        )

        workspace_root = Path(self._temporary_directory.name)
        repository_path = workspace_root / "repository"

        command = [
            "git",
            "clone",
            "--depth",
            "1",
        ]

        if self._branch is not None:
            command.extend(
                [
                    "--branch",
                    self._branch,
                ],
            )

        command.extend(
            [
                self._clone_url,
                str(repository_path),
            ],
        )

        try:
            subprocess.run(
                command,
                check=True,
                capture_output=True,
                text=True,
                timeout=300,
            )
        except (
            OSError,
            subprocess.SubprocessError,
        ) as exc:
            self.close()

            raise RepositoryCloneError(
                "Failed to clone repository for analysis.",
            ) from exc

        if not repository_path.is_dir():
            self.close()

            raise RepositoryCloneError(
                "Repository clone completed without creating "
                "a valid repository directory.",
            )

        self._repository_path = repository_path

        return self

    @property
    def repository_path(self) -> Path:
        """
        Return the checked-out repository path.
        """

        if self._repository_path is None:
            raise RuntimeError(
                "RepositoryWorkspace must be entered before "
                "repository_path can be accessed.",
            )

        return self._repository_path

    def close(self) -> None:
        """
        Remove the temporary workspace.
        """

        if self._temporary_directory is not None:
            self._temporary_directory.cleanup()
            self._temporary_directory = None

        self._repository_path = None

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_value: BaseException | None,
        traceback: types.TracebackType | None,
    ) -> None:
        self.close()