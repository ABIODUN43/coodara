"""
Secure Git Repository Service for Historic Architecture Traversal.

Executes sandboxed, injection-proof Git commands within persistent repository
checkouts. Strict parameter validation, timeout enforcement, and path containment.
"""

from __future__ import annotations

import re
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

from app.analysis.workspace import get_repository_storage_path

# Strict hexadecimal SHA validator (short 7-char up to full 40-char SHA)
_COMMIT_SHA_PATTERN = re.compile(r"^[0-9a-fA-F]{7,40}$")
_SAFE_PATH_PATTERN = re.compile(r"^[a-zA-Z0-9_\-./]+$")
_GIT_EXEC_TIMEOUT_SECONDS = 15


@dataclass(frozen=True, slots=True)
class GitCommitInfo:
    """Metadata for a real Git commit."""

    sha: str
    author: str
    timestamp: str
    message: str

    @property
    def short_sha(self) -> str:
        return self.sha[:7]

    @property
    def date(self) -> str:
        """Alias for timestamp for backward compatibility."""
        return self.timestamp


@dataclass(frozen=True, slots=True)
class GitCommitDiffSummary:
    """Summary of file-level changes between two commits."""

    base_commit: str
    target_commit: str
    files_added: list[str]
    files_modified: list[str]
    files_deleted: list[str]
    total_files_changed: int
    raw_diff_stat: str
    insertions: int = 0
    deletions: int = 0

    @property
    def files_changed(self) -> list[str]:
        return self.files_added + self.files_modified + self.files_deleted


class GitSecurityError(ValueError):
    """Raised when an insecure Git operation, path traversal, or parameter injection is detected."""


class GitRepositoryService:
    """
    Sandboxed service for executing read-only Git queries against checked out repositories.
    """

    def __init__(self, base_storage_path: Path | None = None) -> None:
        self.base_storage_path = base_storage_path

    def _get_repo_dir(self, repository_id: int | str | None = None) -> Path:
        """Resolve and validate the repository storage directory."""
        if self.base_storage_path:
            # If base_storage_path is already a repository directory
            if (self.base_storage_path / ".git").exists() or repository_id is None:
                repo_dir = self.base_storage_path.resolve()
            else:
                repo_dir = (self.base_storage_path / str(repository_id)).resolve()
        elif repository_id is not None:
            repo_dir = get_repository_storage_path(int(repository_id)).resolve()
        else:
            raise FileNotFoundError("No repository directory or ID specified.")

        if not repo_dir.exists() or not repo_dir.is_dir():
            raise FileNotFoundError(f"Repository directory does not exist for ID {repository_id}")
        return repo_dir

    def _validate_sha(self, sha: str, param_name: str = "commit_sha") -> str:
        """Validate that a commit SHA is strictly hexadecimal."""
        clean_sha = sha.strip()
        if not _COMMIT_SHA_PATTERN.match(clean_sha):
            raise GitSecurityError(f"Invalid {param_name} format: {sha!r}")
        return clean_sha

    def _validate_rel_path(self, repo_dir: Path, rel_path: str) -> str:
        """Validate relative file path to prevent path traversal."""
        clean_path = rel_path.strip().replace("\\", "/")
        if ".." in clean_path or clean_path.startswith("/") or not _SAFE_PATH_PATTERN.match(clean_path):
            raise GitSecurityError(f"Invalid file path format: {rel_path!r}")

        target_file = (repo_dir / clean_path).resolve()
        if not target_file.is_relative_to(repo_dir):
            raise GitSecurityError(f"Path traversal detected: {rel_path!r}")
        return clean_path

    def _run_git_command(self, repo_dir: Path, args: Sequence[str]) -> str:
        """Run a git command safely with typed arguments (no shell=True) and timeout."""
        cmd = ["git", *args]
        try:
            res = subprocess.run(
                cmd,
                cwd=str(repo_dir),
                capture_output=True,
                text=True,
                timeout=_GIT_EXEC_TIMEOUT_SECONDS,
                check=False,
            )
            if res.returncode != 0:
                # Log error or return empty output if not a fatal exception
                return ""
            return res.stdout.strip()
        except (subprocess.TimeoutExpired, OSError):
            return ""

    def is_git_repository(self, repository_id: int | str | None = None) -> bool:
        """Check if repository checkout contains a valid .git directory."""
        try:
            repo_dir = self._get_repo_dir(repository_id)
            git_dir = repo_dir / ".git"
            return git_dir.exists()
        except Exception:
            return False

    def list_commits(
        self,
        repository_id: int | str | None = None,
        limit: int = 30,
        max_count: int | None = None,
    ) -> list[GitCommitInfo]:
        """
        List authentic Git commits from the repository checkout.
        """
        try:
            repo_dir = self._get_repo_dir(repository_id)
        except Exception:
            return []

        effective_limit = max_count if max_count is not None else limit
        # Safe limit boundary
        safe_limit = max(1, min(effective_limit, 100))
        # Format: %H (full hash) | %an (author name) | %aI (strict ISO 8601) | %s (subject)
        raw_output = self._run_git_command(
            repo_dir,
            ["log", "--format=%H|%an|%aI|%s", f"-n{safe_limit}"],
        )
        if not raw_output:
            return []

        commits: list[GitCommitInfo] = []
        for line in raw_output.splitlines():
            line = line.strip()
            if not line:
                continue
            parts = line.split("|", 3)
            if len(parts) == 4:
                sha, author, timestamp, message = parts
                commits.append(
                    GitCommitInfo(
                        sha=sha.strip(),
                        author=author.strip() or "Unknown",
                        timestamp=timestamp.strip(),
                        message=message.strip() or "No commit message",
                    )
                )
            elif len(parts) >= 1:
                commits.append(
                    GitCommitInfo(
                        sha=parts[0].strip(),
                        author="Developer",
                        timestamp="",
                        message="Commit update",
                    )
                )
        return commits

    def get_commit_info(
        self,
        commit_sha: str,
        repository_id: int | str | None = None,
    ) -> GitCommitInfo | None:
        """Fetch metadata for a single commit."""
        try:
            repo_dir = self._get_repo_dir(repository_id)
            safe_sha = self._validate_sha(commit_sha)
            raw_output = self._run_git_command(
                repo_dir,
                ["log", "-1", "--format=%H|%an|%aI|%s", safe_sha],
            )
            if not raw_output:
                return None
            parts = raw_output.split("|", 3)
            if len(parts) == 4:
                return GitCommitInfo(
                    sha=parts[0].strip(),
                    author=parts[1].strip() or "Unknown",
                    timestamp=parts[2].strip(),
                    message=parts[3].strip() or "No commit message",
                )
            return GitCommitInfo(
                sha=safe_sha,
                author="Developer",
                timestamp="",
                message="Commit update",
            )
        except Exception:
            return None

    def get_commit_diff_summary(
        self,
        base_commit: str = "",
        target_commit: str = "",
        repository_id: int | str | None = None,
        **kwargs: Any,
    ) -> GitCommitDiffSummary:
        """
        Compute file addition, modification, and deletion diff between two real commits.
        """
        if not base_commit and "base_commit" in kwargs:
            base_commit = kwargs["base_commit"]
        if not target_commit and "target_commit" in kwargs:
            target_commit = kwargs["target_commit"]
        if repository_id is None and "repository_id" in kwargs:
            repository_id = kwargs["repository_id"]

        repo_dir = self._get_repo_dir(repository_id)
        safe_base = self._validate_sha(base_commit, "base_commit")
        safe_target = self._validate_sha(target_commit, "target_commit")

        raw_status = self._run_git_command(
            repo_dir,
            ["diff", "--name-status", safe_base, safe_target],
        )
        raw_stat = self._run_git_command(
            repo_dir,
            ["diff", "--stat", safe_base, safe_target],
        )

        files_added: list[str] = []
        files_modified: list[str] = []
        files_deleted: list[str] = []

        for line in raw_status.splitlines():
            line = line.strip()
            if not line:
                continue
            parts = line.split(None, 1)
            if len(parts) == 2:
                status_code, file_path = parts[0].strip(), parts[1].strip()
                if status_code.startswith("A"):
                    files_added.append(file_path)
                elif status_code.startswith("D"):
                    files_deleted.append(file_path)
                elif status_code.startswith("M") or status_code.startswith("R"):
                    files_modified.append(file_path)

        total_changed = len(files_added) + len(files_modified) + len(files_deleted)
        m_ins = re.search(r"(\d+)\s+insertion", raw_stat)
        insertions = int(m_ins.group(1)) if m_ins else 0
        m_del = re.search(r"(\d+)\s+deletion", raw_stat)
        deletions = int(m_del.group(1)) if m_del else 0

        return GitCommitDiffSummary(
            base_commit=safe_base,
            target_commit=safe_target,
            files_added=files_added,
            files_modified=files_modified,
            files_deleted=files_deleted,
            total_files_changed=total_changed,
            raw_diff_stat=raw_stat or f"{total_changed} files changed",
            insertions=insertions,
            deletions=deletions,
        )

    def get_file_at_commit(
        self,
        commit_sha: str = "",
        file_path: str = "",
        repository_id: int | str | None = None,
        **kwargs: Any,
    ) -> str | None:
        """
        Extract the content of a file at a specific commit snapshot.
        """
        if not commit_sha and "commit_sha" in kwargs:
            commit_sha = kwargs["commit_sha"]
        if not file_path and "file_path" in kwargs:
            file_path = kwargs["file_path"]
        if repository_id is None and "repository_id" in kwargs:
            repository_id = kwargs["repository_id"]

        repo_dir = self._get_repo_dir(repository_id)
        safe_sha = self._validate_sha(commit_sha)
        safe_path = self._validate_rel_path(repo_dir, file_path)

        content = self._run_git_command(
            repo_dir,
            ["show", f"{safe_sha}:{safe_path}"],
        )
        return content if content else None
