"""
Tests for analysis Celery worker tasks.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from app.analysis.workspace import RepositoryCloneError
from app.analyzers.exceptions import AnalyzerExecutionError
from app.models.analysis import AnalysisJob, AnalysisStatus
from app.workers.analysis_tasks import (
    _is_retryable_error,
    _persist_failed_state,
    _run_analysis_async,
    _safe_error_message,
)


def _make_mock_job(
    *,
    job_id: int = 1,
    repository_id: int = 10,
    status: AnalysisStatus = AnalysisStatus.PENDING,
) -> AnalysisJob:
    job = MagicMock(spec=AnalysisJob)
    job.id = job_id
    job.repository_id = repository_id
    job.status = status
    job.progress = 0
    job.started_at = None
    job.completed_at = None
    job.error_message = None
    return job


def test_is_retryable_error() -> None:
    """Test separation between retryable and non-retryable errors."""
    from sqlalchemy.exc import OperationalError

    # Non-retryable
    assert not _is_retryable_error(AnalyzerExecutionError("Invariant broken"))
    assert not _is_retryable_error(ValueError("Invalid argument"))
    assert not _is_retryable_error(KeyError("Missing key"))

    # Retryable
    assert _is_retryable_error(RepositoryCloneError("git clone network error"))
    assert _is_retryable_error(ConnectionError("Connection reset by peer"))
    assert _is_retryable_error(TimeoutError("Connection timed out"))
    assert _is_retryable_error(OperationalError("statement", {}, Exception("DB down")))


def test_safe_error_message_sanitizes_secrets() -> None:
    """Test error message sanitizer hides credentials."""
    msg = _safe_error_message(Exception("Failed with github_token=ghp_secret123456789"))
    assert "ghp_secret" not in msg
    assert "authentication error" in msg

    normal_msg = _safe_error_message(Exception("Repository not found."))
    assert normal_msg == "Repository not found."


@pytest.mark.asyncio
async def test_run_analysis_async_success() -> None:
    """Test happy path lifecycle: PENDING -> RUNNING -> COMPLETED."""
    job = _make_mock_job(status=AnalysisStatus.PENDING)

    mock_db = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.rollback = AsyncMock()

    mock_repo = MagicMock()
    mock_repo.get_by_id = AsyncMock(return_value=job)
    mock_repo.update = AsyncMock(return_value=job)

    mock_session_ctx = MagicMock()
    mock_session_ctx.__aenter__ = AsyncMock(return_value=mock_db)
    mock_session_ctx.__aexit__ = AsyncMock(return_value=None)

    mock_exec_service = MagicMock()
    mock_exec_service.execute = AsyncMock(return_value=job)

    with (
        patch("app.workers.analysis_tasks.SessionLocal", return_value=mock_session_ctx),
        patch("app.workers.analysis_tasks.AnalysisRepository", return_value=mock_repo),
        patch(
            "app.workers.analysis_tasks.create_analysis_execution_service",
            return_value=mock_exec_service,
        ),
    ):
        result = await _run_analysis_async(analysis_id=1)

    assert result["status"] == "completed"
    assert result["analysis_id"] == 1

    # Verified transitioned to RUNNING first
    assert job.status == AnalysisStatus.RUNNING
    assert job.progress == 10
    assert job.started_at is not None

    mock_exec_service.execute.assert_awaited_once_with(analysis_id=1)
    assert mock_db.commit.await_count >= 2


@pytest.mark.asyncio
async def test_run_analysis_async_idempotency_completed() -> None:
    """Test worker skips already completed jobs."""
    job = _make_mock_job(status=AnalysisStatus.COMPLETED)

    mock_db = MagicMock()
    mock_repo = MagicMock()
    mock_repo.get_by_id = AsyncMock(return_value=job)

    mock_session_ctx = MagicMock()
    mock_session_ctx.__aenter__ = AsyncMock(return_value=mock_db)
    mock_session_ctx.__aexit__ = AsyncMock(return_value=None)

    mock_exec_service = MagicMock()
    mock_exec_service.execute = AsyncMock()

    with (
        patch("app.workers.analysis_tasks.SessionLocal", return_value=mock_session_ctx),
        patch("app.workers.analysis_tasks.AnalysisRepository", return_value=mock_repo),
        patch(
            "app.workers.analysis_tasks.create_analysis_execution_service",
            return_value=mock_exec_service,
        ),
    ):
        result = await _run_analysis_async(analysis_id=1)

    assert result["status"] == "already_completed"
    mock_exec_service.execute.assert_not_awaited()


@pytest.mark.asyncio
async def test_run_analysis_async_idempotency_running() -> None:
    """Test worker skips already running jobs."""
    job = _make_mock_job(status=AnalysisStatus.RUNNING)

    mock_db = MagicMock()
    mock_repo = MagicMock()
    mock_repo.get_by_id = AsyncMock(return_value=job)

    mock_session_ctx = MagicMock()
    mock_session_ctx.__aenter__ = AsyncMock(return_value=mock_db)
    mock_session_ctx.__aexit__ = AsyncMock(return_value=None)

    mock_exec_service = MagicMock()
    mock_exec_service.execute = AsyncMock()

    with (
        patch("app.workers.analysis_tasks.SessionLocal", return_value=mock_session_ctx),
        patch("app.workers.analysis_tasks.AnalysisRepository", return_value=mock_repo),
        patch(
            "app.workers.analysis_tasks.create_analysis_execution_service",
            return_value=mock_exec_service,
        ),
    ):
        result = await _run_analysis_async(analysis_id=1)

    assert result["status"] == "already_running"
    mock_exec_service.execute.assert_not_awaited()


@pytest.mark.asyncio
async def test_run_analysis_async_permanent_failure_persists_failed() -> None:
    """Test non-retryable failure persists FAILED status in PostgreSQL."""
    job = _make_mock_job(status=AnalysisStatus.PENDING)

    mock_db = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.rollback = AsyncMock()

    mock_repo = MagicMock()
    mock_repo.get_by_id = AsyncMock(return_value=job)
    mock_repo.update = AsyncMock(return_value=job)

    mock_session_ctx = MagicMock()
    mock_session_ctx.__aenter__ = AsyncMock(return_value=mock_db)
    mock_session_ctx.__aexit__ = AsyncMock(return_value=None)

    mock_exec_service = MagicMock()
    mock_exec_service.execute = AsyncMock(
        side_effect=AnalyzerExecutionError("Fatal analyzer invariant broken"),
    )

    mock_persist = AsyncMock()

    with (
        patch("app.workers.analysis_tasks.SessionLocal", return_value=mock_session_ctx),
        patch("app.workers.analysis_tasks.AnalysisRepository", return_value=mock_repo),
        patch(
            "app.workers.analysis_tasks.create_analysis_execution_service",
            return_value=mock_exec_service,
        ),
        patch(
            "app.workers.analysis_tasks._persist_failed_state",
            mock_persist,
        ),
    ):
        result = await _run_analysis_async(analysis_id=1)

    assert result["status"] == "failed"
    assert "Fatal analyzer invariant broken" in result["error"]
    mock_persist.assert_awaited_once_with(1, "Fatal analyzer invariant broken")


@pytest.mark.asyncio
async def test_run_analysis_async_retryable_failure_triggers_retry() -> None:
    """Test retryable error triggers Celery task.retry."""
    job = _make_mock_job(status=AnalysisStatus.PENDING)

    mock_db = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.rollback = AsyncMock()

    mock_repo = MagicMock()
    mock_repo.get_by_id = AsyncMock(return_value=job)
    mock_repo.update = AsyncMock(return_value=job)

    mock_session_ctx = MagicMock()
    mock_session_ctx.__aenter__ = AsyncMock(return_value=mock_db)
    mock_session_ctx.__aexit__ = AsyncMock(return_value=None)

    mock_exec_service = MagicMock()
    mock_exec_service.execute = AsyncMock(
        side_effect=RepositoryCloneError("git clone failed due to transient timeout"),
    )

    mock_persist = AsyncMock()
    mock_task = MagicMock()
    mock_task.request.retries = 0
    mock_task.max_retries = 3
    mock_task.retry = MagicMock(side_effect=Exception("TaskRetrying"))

    with (
        patch("app.workers.analysis_tasks.SessionLocal", return_value=mock_session_ctx),
        patch("app.workers.analysis_tasks.AnalysisRepository", return_value=mock_repo),
        patch(
            "app.workers.analysis_tasks.create_analysis_execution_service",
            return_value=mock_exec_service,
        ),
        patch(
            "app.workers.analysis_tasks._persist_failed_state",
            mock_persist,
        ),
        pytest.raises(Exception, match="TaskRetrying"),
    ):
        await _run_analysis_async(analysis_id=1, task_instance=mock_task)

    mock_persist.assert_awaited_once()
    mock_task.retry.assert_called_once()


@pytest.mark.asyncio
async def test_persist_failed_state_updates_database() -> None:
    """Test _persist_failed_state sets FAILED and commits."""
    job = _make_mock_job(status=AnalysisStatus.RUNNING)

    mock_db = MagicMock()
    mock_db.commit = AsyncMock()

    mock_repo = MagicMock()
    mock_repo.get_by_id = AsyncMock(return_value=job)
    mock_repo.update = AsyncMock(return_value=job)

    mock_session_ctx = MagicMock()
    mock_session_ctx.__aenter__ = AsyncMock(return_value=mock_db)
    mock_session_ctx.__aexit__ = AsyncMock(return_value=None)

    with (
        patch("app.workers.analysis_tasks.SessionLocal", return_value=mock_session_ctx),
        patch("app.workers.analysis_tasks.AnalysisRepository", return_value=mock_repo),
    ):
        await _persist_failed_state(analysis_id=1, error_message="Clone error")

    assert job.status == AnalysisStatus.FAILED
    assert job.progress == 100
    assert job.error_message == "Clone error"
    assert job.completed_at is not None
    mock_repo.update.assert_awaited_once_with(job)
    mock_db.commit.assert_awaited_once()
