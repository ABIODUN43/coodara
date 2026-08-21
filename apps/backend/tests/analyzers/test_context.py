from pathlib import Path

import pytest
from app.analyzers.context import RepositoryContext


def test_repository_context_accepts_existing_directory(
    tmp_path: Path,
) -> None:
    context = RepositoryContext(
        root_path=tmp_path,
        repository_id="repository-123",
    )

    assert context.root_path == tmp_path
    assert context.repository_id == "repository-123"


def test_repository_context_rejects_empty_repository_id(
    tmp_path: Path,
) -> None:
    with pytest.raises(ValueError, match="repository_id"):
        RepositoryContext(
            root_path=tmp_path,
            repository_id="",
        )


def test_repository_context_rejects_missing_directory(
    tmp_path: Path,
) -> None:
    missing_path = tmp_path / "missing"

    with pytest.raises(ValueError, match="does not exist"):
        RepositoryContext(
            root_path=missing_path,
            repository_id="repository-123",
        )


def test_repository_context_rejects_file(
    tmp_path: Path,
) -> None:
    file_path = tmp_path / "repository.txt"
    file_path.write_text("test")

    with pytest.raises(ValueError, match="must be a directory"):
        RepositoryContext(
            root_path=file_path,
            repository_id="repository-123",
        )