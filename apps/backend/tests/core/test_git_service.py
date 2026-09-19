"""
Unit and security tests for GitRepositoryService.
"""

from __future__ import annotations

import subprocess
from pathlib import Path

import pytest
from app.core.git_service import GitCommitInfo, GitRepositoryService, GitSecurityError


@pytest.fixture
def temp_git_repo(tmp_path: Path) -> Path:
    """Create a temporary real Git repository with two commits."""
    repo_dir = tmp_path / "test_repo"
    repo_dir.mkdir(parents=True, exist_ok=True)

    # Initialize git repo
    subprocess.run(["git", "init"], cwd=str(repo_dir), check=True, capture_output=True)
    subprocess.run(["git", "config", "user.name", "Test Committer"], cwd=str(repo_dir), check=True)
    subprocess.run(["git", "config", "user.email", "committer@test.com"], cwd=str(repo_dir), check=True)

    # Commit 1
    file1 = repo_dir / "main.py"
    file1.write_text("print('v1')", encoding="utf-8")
    subprocess.run(["git", "add", "main.py"], cwd=str(repo_dir), check=True)
    subprocess.run(["git", "commit", "-m", "Initial commit v1"], cwd=str(repo_dir), check=True)

    # Commit 2
    file1.write_text("print('v2')", encoding="utf-8")
    file2 = repo_dir / "service.py"
    file2.write_text("class Service: pass", encoding="utf-8")
    subprocess.run(["git", "add", "main.py", "service.py"], cwd=str(repo_dir), check=True)
    subprocess.run(["git", "commit", "-m", "Add service module v2"], cwd=str(repo_dir), check=True)

    return tmp_path


def test_git_service_list_commits(temp_git_repo: Path) -> None:
    service = GitRepositoryService(base_storage_path=temp_git_repo)
    commits = service.list_commits(repository_id=temp_git_repo / "test_repo")  # name will be matched
    # Since our mock path is temp_git_repo / "101", let's test directly with repository_id = "test_repo"
    service_for_repo = GitRepositoryService(base_storage_path=temp_git_repo)
    # The helper resolves base_storage_path / str(repo_id)
    # So if repo_id is "test_repo", it resolves to temp_git_repo / "test_repo"
    commits = service_for_repo.list_commits(repository_id="test_repo")  # type: ignore
    assert len(commits) == 2
    assert commits[0].message == "Add service module v2"
    assert commits[0].author == "Test Committer"
    assert len(commits[0].sha) >= 7


def test_git_service_commit_diff(temp_git_repo: Path) -> None:
    service = GitRepositoryService(base_storage_path=temp_git_repo)
    commits = service.list_commits(repository_id="test_repo")  # type: ignore
    assert len(commits) == 2

    c2_sha = commits[0].sha
    c1_sha = commits[1].sha

    diff = service.get_commit_diff_summary(
        repository_id="test_repo",  # type: ignore
        base_commit=c1_sha,
        target_commit=c2_sha,
    )
    assert "service.py" in diff.files_added
    assert "main.py" in diff.files_modified
    assert diff.total_files_changed == 2


def test_git_service_security_rejections(temp_git_repo: Path) -> None:
    service = GitRepositoryService(base_storage_path=temp_git_repo)

    # 1. Reject invalid commit SHA format (injection attempts)
    with pytest.raises(GitSecurityError):
        service.get_commit_diff_summary(
            repository_id="test_repo",  # type: ignore
            base_commit="HEAD; rm -rf /",
            target_commit="1234567",
        )

    with pytest.raises(GitSecurityError):
        service.get_file_at_commit(
            repository_id="test_repo",  # type: ignore
            commit_sha="`whoami`",
            file_path="main.py",
        )

    # 2. Reject path traversal
    commits = service.list_commits(repository_id="test_repo")  # type: ignore
    with pytest.raises(GitSecurityError):
        service.get_file_at_commit(
            repository_id="test_repo",  # type: ignore
            commit_sha=commits[0].sha,
            file_path="../../etc/passwd",
        )
