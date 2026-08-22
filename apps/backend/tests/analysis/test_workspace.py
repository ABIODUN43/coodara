import subprocess
from pathlib import Path

import pytest
from app.analysis.workspace import (
    RepositoryCloneError,
    RepositoryWorkspace,
)


def _create_git_repository(path: Path) -> None:
    path.mkdir()

    subprocess.run(
        ["git", "init"],
        cwd=path,
        check=True,
        capture_output=True,
        text=True,
    )

    (path / "main.py").write_text(
        "print('hello')\n",
        encoding="utf-8",
    )

    subprocess.run(
        ["git", "add", "main.py"],
        cwd=path,
        check=True,
        capture_output=True,
        text=True,
    )

    subprocess.run(
        [
            "git",
            "-c",
            "user.name=Coodara Test",
            "-c",
            "user.email=test@coodara.local",
            "commit",
            "-m",
            "Initial commit",
        ],
        cwd=path,
        check=True,
        capture_output=True,
        text=True,
    )


def test_workspace_rejects_empty_clone_url() -> None:
    with pytest.raises(ValueError, match="clone_url"):
        RepositoryWorkspace(clone_url="")


def test_workspace_rejects_empty_branch() -> None:
    with pytest.raises(ValueError, match="branch"):
        RepositoryWorkspace(
            clone_url="https://github.com/example/repo.git",
            branch="",
        )


def test_repository_path_requires_entered_workspace() -> None:
    workspace = RepositoryWorkspace(
        clone_url="https://github.com/example/repo.git",
    )

    with pytest.raises(RuntimeError):
        _ = workspace.repository_path


def test_workspace_clones_repository(tmp_path: Path) -> None:
    source = tmp_path / "source"
    _create_git_repository(source)

    workspace = RepositoryWorkspace(
        clone_url=str(source),
    )

    with workspace as active_workspace:
        repository_path = active_workspace.repository_path

        assert repository_path.is_dir()
        assert (repository_path / "main.py").is_file()


def test_workspace_cleans_up_after_exit(tmp_path: Path) -> None:
    source = tmp_path / "source"
    _create_git_repository(source)

    workspace = RepositoryWorkspace(
        clone_url=str(source),
    )

    with workspace as active_workspace:
        repository_path = active_workspace.repository_path

        assert repository_path.exists()

    assert not repository_path.exists()


def test_workspace_raises_clone_error_for_invalid_repository() -> None:
    workspace = RepositoryWorkspace(
        clone_url="https://invalid.example/nonexistent.git",
    )

    with pytest.raises(RepositoryCloneError), workspace:
        pass