"""
Tests for analysis execution dispatching.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from app.analysis.dispatcher import AnalysisExecutionDispatcher
from app.models.analysis import AnalysisJob


def make_execution_service() -> MagicMock:
    """Create a mocked execution service."""
    service = MagicMock()
    service.execute = AsyncMock()
    return service


def make_job() -> MagicMock:
    """Create a mocked analysis job."""
    return MagicMock(spec=AnalysisJob)


@pytest.mark.asyncio
async def test_dispatch_executes_analysis_job() -> None:
    """Dispatcher should delegate execution to the execution service."""

    execution_service = make_execution_service()

    job = make_job()

    execution_service.execute.return_value = job

    dispatcher = AnalysisExecutionDispatcher(
        execution_service=execution_service,
    )

    result = await dispatcher.dispatch(
        analysis_id=42,
    )

    assert result is job

    execution_service.execute.assert_awaited_once_with(
        analysis_id=42,
    )


def test_enqueue_submits_task_to_celery() -> None:
    """Dispatcher enqueue should call execute_analysis_task.delay."""
    execution_service = make_execution_service()
    dispatcher = AnalysisExecutionDispatcher(
        execution_service=execution_service,
    )

    mock_async_result = MagicMock()
    mock_async_result.id = "task-123"

    with patch(
        "app.workers.analysis_tasks.execute_analysis_task.delay",
        return_value=mock_async_result,
    ) as mock_delay:
        task_id = dispatcher.enqueue(analysis_id=101)

        assert task_id == "task-123"
        mock_delay.assert_called_once_with(101)


def test_enqueue_handles_broker_error_gracefully() -> None:
    """Dispatcher enqueue should catch exceptions and return None."""
    execution_service = make_execution_service()
    dispatcher = AnalysisExecutionDispatcher(
        execution_service=execution_service,
    )

    with patch(
        "app.workers.analysis_tasks.execute_analysis_task.delay",
        side_effect=Exception("Redis connection error"),
    ):
        task_id = dispatcher.enqueue(analysis_id=101)
        assert task_id is None