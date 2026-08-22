"""
Tests for the analysis application factories.

These tests verify:

    DefaultAnalyzer
        ↓
    AnalysisOrchestrator
        ↓
    AnalysisExecutionService
        ↓
    AnalysisExecutionDispatcher

They also verify that background execution:

- creates a fresh database session;
- commits successful execution;
- rolls back failed execution;
- propagates execution failures.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from app.analysis.dispatcher import AnalysisExecutionDispatcher
from app.analysis.execution import AnalysisExecutionService
from app.analysis.factory import (
    create_analysis_dispatcher,
    create_analysis_execution_service,
    create_analysis_orchestrator,
    execute_analysis_in_background,
)
from app.analyzers.default_analyzer import DefaultAnalyzer
from app.analyzers.orchestrator import AnalysisOrchestrator

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_database_session() -> MagicMock:
    """
    Create a mocked asynchronous database session.

    Transaction methods are asynchronous and therefore use AsyncMock.
    """

    db = MagicMock()

    db.commit = AsyncMock()
    db.rollback = AsyncMock()

    return db


def make_session_context(
    db: MagicMock,
) -> MagicMock:
    """
    Create a mocked async context manager for SessionLocal.
    """

    session_factory = MagicMock()

    session_factory.__aenter__ = AsyncMock(
        return_value=db,
    )
    session_factory.__aexit__ = AsyncMock(
        return_value=None,
    )

    return session_factory


# ---------------------------------------------------------------------------
# Orchestrator factory
# ---------------------------------------------------------------------------


def test_create_analysis_orchestrator_uses_default_analyzer() -> None:
    """
    The canonical orchestrator should use DefaultAnalyzer.
    """

    orchestrator = create_analysis_orchestrator()

    assert isinstance(
        orchestrator,
        AnalysisOrchestrator,
    )

    assert len(orchestrator._analyzers) == 1

    analyzer = orchestrator._analyzers[0]

    assert isinstance(
        analyzer,
        DefaultAnalyzer,
    )


def test_create_analysis_orchestrator_contains_default_analyzer() -> None:
    """
    The canonical orchestrator should contain exactly the
    configured DefaultAnalyzer instance.
    """

    orchestrator = create_analysis_orchestrator()

    analyzers = orchestrator._analyzers

    assert analyzers

    assert any(
        isinstance(analyzer, DefaultAnalyzer)
        for analyzer in analyzers
    )


# ---------------------------------------------------------------------------
# Execution service factory
# ---------------------------------------------------------------------------


def test_create_analysis_execution_service() -> None:
    """
    The execution-service factory should construct the canonical
    AnalysisExecutionService.
    """

    db = make_database_session()

    service = create_analysis_execution_service(db)

    assert isinstance(
        service,
        AnalysisExecutionService,
    )

    assert service.orchestrator is not None

    assert isinstance(
        service.orchestrator,
        AnalysisOrchestrator,
    )


# ---------------------------------------------------------------------------
# Dispatcher factory
# ---------------------------------------------------------------------------


def test_create_analysis_dispatcher() -> None:
    """
    The dispatcher factory should construct an
    AnalysisExecutionDispatcher with the canonical execution service.
    """

    db = make_database_session()

    dispatcher = create_analysis_dispatcher(db)

    assert isinstance(
        dispatcher,
        AnalysisExecutionDispatcher,
    )

    assert dispatcher._execution_service is not None

    assert isinstance(
        dispatcher._execution_service,
        AnalysisExecutionService,
    )


# ---------------------------------------------------------------------------
# Background execution
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_execute_analysis_in_background_commits_on_success() -> None:
    """
    Successful background execution should commit its transaction.
    """

    dispatcher = MagicMock()

    dispatcher.dispatch = AsyncMock(
        return_value=MagicMock(),
    )

    db = make_database_session()

    session_factory = make_session_context(db)

    with (
        patch(
            "app.analysis.factory.SessionLocal",
            return_value=session_factory,
        ),
        patch(
            "app.analysis.factory.create_analysis_dispatcher",
            return_value=dispatcher,
        ),
    ):
        await execute_analysis_in_background(
            analysis_id=42,
        )

    dispatcher.dispatch.assert_awaited_once_with(
        analysis_id=42,
    )

    db.commit.assert_awaited_once()

    db.rollback.assert_not_awaited()

    session_factory.__aenter__.assert_awaited_once()

    session_factory.__aexit__.assert_awaited_once()


@pytest.mark.asyncio
async def test_execute_analysis_in_background_rolls_back_on_failure() -> None:
    """
    Failed background execution should roll back its transaction
    and propagate the original exception.
    """

    dispatcher = MagicMock()

    error = RuntimeError(
        "analysis failed",
    )

    dispatcher.dispatch = AsyncMock(
        side_effect=error,
    )

    db = make_database_session()

    session_factory = make_session_context(db)

    with (
        patch(
            "app.analysis.factory.SessionLocal",
            return_value=session_factory,
        ),
        patch(
            "app.analysis.factory.create_analysis_dispatcher",
            return_value=dispatcher,
        ),pytest.raises(
        RuntimeError,
        match="analysis failed",
    ) as exc_info
    ):
        await execute_analysis_in_background(
            analysis_id=42,
        )

    assert exc_info.value is error

    dispatcher.dispatch.assert_awaited_once_with(
        analysis_id=42,
    )

    db.commit.assert_not_awaited()

    db.rollback.assert_awaited_once()

    session_factory.__aenter__.assert_awaited_once()

    session_factory.__aexit__.assert_awaited_once()