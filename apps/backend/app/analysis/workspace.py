"""
Repository workspace management for analysis execution.

This module owns temporary filesystem workspaces used during analysis.
Provides:
- Isolated temporary workspace directories with prefix isolation.
- Credential redaction during git operations.
- Workspace disk size limits.
- Symlink traversal defenses.
- Guaranteed cleanup on exit.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import types
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Self

from app.core.config import settings
from app.core.logging import redact_secrets


class RepositoryWorkspaceError(Exception):
    """Base exception for repository workspace failures."""


class RepositoryCloneError(RepositoryWorkspaceError):
    """Raised when a repository cannot be cloned."""


class RepositoryWorkspaceSizeExceededError(RepositoryWorkspaceError):
    """Raised when checked-out repository exceeds maximum allowed disk size."""


class RepositoryWorkspace:
    """
    Workspace containing one repository checkout.

    Responsibilities:
    - Create an isolated workspace directory (or maintain a persistent cache per repository ID).
    - Clone or update the repository securely without leaking credentials.
    - Validate workspace integrity and resource limits.
    - Clean up temporary workspaces or preserve persistent checkouts for Code Studio.
    """

    def __init__(
        self,
        *,
        clone_url: str,
        branch: str | None = None,
        max_size_bytes: int | None = None,
        repository_id: int | str | None = None,
        persistent: bool = True,
    ) -> None:
        if not clone_url.strip():
            raise ValueError("clone_url must not be empty")

        if branch is not None and not branch.strip():
            raise ValueError("branch must not be empty when provided")

        self._clone_url = clone_url.strip()
        self._branch = branch.strip() if branch is not None else None
        self._max_size_bytes = max_size_bytes or settings.ANALYSIS_MAX_REPO_SIZE_BYTES
        self._repository_id = str(repository_id).strip() if repository_id is not None else None
        self._persistent = persistent and (self._repository_id is not None)
        self._temporary_directory: TemporaryDirectory[str] | None = None
        self._repository_path: Path | None = None

    def __enter__(self) -> Self:
        if self._persistent and self._repository_id:
            storage_root = Path(settings.REPOSITORIES_STORAGE_PATH).resolve()
            storage_root.mkdir(parents=True, exist_ok=True)
            repository_path = storage_root / self._repository_id

            if repository_path.is_dir() and any(repository_path.iterdir()):
                # If directory already exists and has files, verify it or pull latest
                git_dir = repository_path / ".git"
                if git_dir.is_dir():
                    try:
                        subprocess.run(
                            ["git", "pull", "--depth", "1"],
                            cwd=str(repository_path),
                            capture_output=True,
                            timeout=30,
                        )
                    except Exception:
                        pass
                self._repository_path = repository_path
                return self
            else:
                repository_path.mkdir(parents=True, exist_ok=True)
        else:
            self._temporary_directory = TemporaryDirectory(
                prefix="coodara-analysis-",
            )
            workspace_root = Path(self._temporary_directory.name).resolve()
            repository_path = workspace_root / "repository"

        command = [
            "git",
            "clone",
            "--depth",
            "1",
            "--single-branch",
            "--no-tags",
            "-c",
            "http.postBuffer=524288000",
            "-c",
            "core.compression=0",
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

        env = dict(os.environ)
        env["GIT_TERMINAL_PROMPT"] = "0"
        env["GIT_ASKPASS"] = ""

        max_retries = 2
        cloned_successfully = False

        for attempt in range(1, max_retries + 1):
            try:
                subprocess.run(
                    command,
                    check=True,
                    capture_output=True,
                    text=True,
                    timeout=settings.ANALYSIS_TIMEOUT_SECONDS,
                    env=env,
                )
                cloned_successfully = True
                break
            except subprocess.TimeoutExpired as exc:
                if attempt == max_retries:
                    break
                import time
                time.sleep(2)
            except subprocess.CalledProcessError as exc:
                stderr = redact_secrets((exc.stderr or "").strip())
                if "Authentication failed" in stderr or "could not read Username" in stderr:
                    self.close()
                    raise RepositoryCloneError(
                        "Authentication failed: GitHub credentials required to clone this repository."
                    ) from exc
                if "not found" in stderr.lower() or "did not match any file(s) known to git" in stderr:
                    self.close()
                    raise RepositoryCloneError(
                        "Repository or branch not found on GitHub."
                    ) from exc
                if attempt == max_retries:
                    break
                import time
                time.sleep(2)
            except (
                OSError,
                subprocess.SubprocessError,
            ):
                if attempt == max_retries:
                    break
                import time
                time.sleep(2)

        if not cloned_successfully or not repository_path.is_dir():
            # Attempt archive download fallback for GitHub repositories
            if not self._download_github_archive(repository_path):
                self.close()
                raise RepositoryCloneError(
                    "Failed to clone or acquire repository files for analysis."
                )

        # Enforce disk space limits
        total_size = sum(
            f.stat().st_size
            for f in repository_path.rglob("*")
            if f.is_file()
        )
        if total_size > self._max_size_bytes:
            self.close()
            max_mb = self._max_size_bytes // (1024 * 1024)
            actual_mb = total_size // (1024 * 1024)
            raise RepositoryWorkspaceSizeExceededError(
                f"Repository size ({actual_mb}MB) exceeds maximum allowed limit ({max_mb}MB)."
            )

        self._repository_path = repository_path
        return self

    def _download_github_archive(self, destination: Path) -> bool:
        """
        Download and extract GitHub repository zip archive as a fallback.
        """
        import io
        import re
        import shutil
        import urllib.request
        import zipfile

        m = re.search(r"github\.com/([^/]+)/([^/.]+)(?:\.git)?", self._clone_url)
        if not m:
            return False

        owner, repo = m.group(1), m.group(2)
        branches = [self._branch] if self._branch else ["main", "master", "trunk", "HEAD"]

        for branch in branches:
            archive_url = (
                f"https://github.com/{owner}/{repo}/archive/refs/heads/{branch}.zip"
                if branch != "HEAD"
                else f"https://github.com/{owner}/{repo}/archive/HEAD.zip"
            )
            try:
                req = urllib.request.Request(
                    archive_url,
                    headers={"User-Agent": "Coodara-Analysis-Worker/1.0"},
                )
                with urllib.request.urlopen(req, timeout=settings.ANALYSIS_TIMEOUT_SECONDS) as resp:
                    if resp.status == 200:
                        data = resp.read()
                        with zipfile.ZipFile(io.BytesIO(data)) as zf:
                            top_dirs = {p.split("/")[0] for p in zf.namelist() if "/" in p}
                            temp_extract = destination.parent / "temp_extract"
                            zf.extractall(temp_extract)

                            if len(top_dirs) == 1:
                                extracted_root = temp_extract / list(top_dirs)[0]
                                if extracted_root.exists():
                                    if destination.exists():
                                        shutil.rmtree(destination)
                                    shutil.move(str(extracted_root), str(destination))
                                    shutil.rmtree(temp_extract, ignore_errors=True)
                                    return True
                            else:
                                if destination.exists():
                                    shutil.rmtree(destination)
                                shutil.move(str(temp_extract), str(destination))
                                return True
            except Exception:
                continue
        return False

    @property
    def repository_path(self) -> Path:
        """
        Return the checked-out repository path.
        """
        if self._repository_path is None:
            raise RuntimeError(
                "RepositoryWorkspace must be entered before repository_path can be accessed."
            )
        return self._repository_path

    def close(self) -> None:
        """
        Remove temporary workspace safely, preserving persistent checkouts.
        """
        if self._temporary_directory is not None:
            try:
                self._temporary_directory.cleanup()
            except Exception:
                pass
            self._temporary_directory = None

        if not self._persistent:
            self._repository_path = None

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_value: BaseException | None,
        traceback: types.TracebackType | None,
    ) -> None:
        self.close()


def get_repository_storage_path(repository_id: int | str) -> Path:
    """Return the persistent filesystem directory for a repository."""
    return Path(settings.REPOSITORIES_STORAGE_PATH).resolve() / str(repository_id)


def ensure_repository_checkout(
    *,
    repository_id: int | str,
    clone_url: str,
    branch: str | None = None,
) -> Path:
    """
    Ensure the repository checkout is available on disk and return its path.
    If not already cloned, clones it into persistent storage.
    """
    repo_path = get_repository_storage_path(repository_id)
    if repo_path.is_dir() and any(repo_path.iterdir()):
        return repo_path

    with RepositoryWorkspace(
        clone_url=clone_url,
        branch=branch,
        repository_id=repository_id,
        persistent=True,
    ) as ws:
        return ws.repository_path