"""
Tests for analysis execution dispatching.
"""

from unittest.mock import AsyncMock, MagicMock

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