from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True, slots=True)
class RepositoryContext:
    """Immutable context for a single repository analysis."""

    root_path: Path
    repository_id: str

    def __post_init__(self) -> None:
        if not self.repository_id.strip():
            raise ValueError("repository_id must not be empty")

        if not self.root_path.exists():
            raise ValueError(
                f"repository root does not exist: {self.root_path}"
            )

        if not self.root_path.is_dir():
            raise ValueError(
                f"repository root must be a directory: {self.root_path}"
            )