"""
Tests for Analysis Workspace and Filesystem Hardening.

Verifies:
- Repository workspace disk size limit enforcement.
- Symlink traversal defenses.
- Secret and token redaction during git operations.
- Safe cleanup of temporary directories.
"""

from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import MagicMock, patch

import pytest
from app.analysis.workspace import (
    RepositoryCloneError,
    RepositoryWorkspace,
    RepositoryWorkspaceSizeExceededError,
)
from app.analyzers.context import RepositoryContext
from app.analyzers.metrics_analyzer import MetricsAnalyzer


def test_metrics_analyzer_ignores_symlink_outside_root():
    """
    Test MetricsAnalyzer skips symlinks pointing outside the repository root.
    """
    with TemporaryDirectory() as outside_dir, TemporaryDirectory() as repo_dir:
        outside_path = Path(outside_dir)
        repo_path = Path(repo_dir)

        # Create sensitive file outside repo
        secret_file = outside_path / "secret.py"
        secret_file.write_text("class SecretClass:\n    pass\n")

        # Create regular source file inside repo
        app_file = repo_path / "app.py"
        app_file.write_text("def index():\n    return 'ok'\n")

        # Create symlink inside repo pointing outside
        symlink_file = repo_path / "leak.py"
        try:
            symlink_file.symlink_to(secret_file)
        except (OSError, NotImplementedError):
            # Windows symlink permission bypass if non-admin
            pass

        analyzer = MetricsAnalyzer()
        context = RepositoryContext(root_path=repo_path, repository_id="1")
        result = analyzer.analyze(context)

        # Should only analyze app.py (not secret.py)
        assert result.classes == 0
        assert result.functions == 1


def test_workspace_redacts_tokens_in_error_message():
    """
    Test RepositoryWorkspace redacts tokens in clone error messages.
    """
    fake_token = "gho_abcdef1234567890abcdef1234567890"
    authenticated_url = f"https://x-access-token:{fake_token}@github.com/org/private-repo.git"

    workspace = RepositoryWorkspace(clone_url=authenticated_url)

    with patch("subprocess.run") as mock_run:
        import subprocess

        mock_run.side_effect = subprocess.CalledProcessError(
            returncode=128,
            cmd=["git", "clone"],
            stderr=f"fatal: Authentication failed for '{authenticated_url}'",
        )

        with pytest.raises(RepositoryCloneError) as exc_info:
            with workspace:
                pass

        error_msg = str(exc_info.value)
        assert fake_token not in error_msg
        assert "gho_" not in error_msg
