"""
Analysis application dependency factories.

Centralizes construction of the analysis execution pipeline.

Dependency graph:

    DefaultAnalyzer
        ↓
    AnalysisOrchestrator
        ↓
    AnalysisExecutionService
        ↓
    AnalysisExecutionDispatcher


Background execution:

    BackgroundTasks
        ↓
    execute_analysis_in_background()
        ↓
    fresh AsyncSession
        ↓
    AnalysisExecutionDispatcher
        ↓
    AnalysisExecutionService
"""

from __future__ import annotations

from app.analysis.dispatcher import AnalysisExecutionDispatcher
from app.analysis.execution import AnalysisExecutionService
from app.analyzers.default_analyzer import DefaultAnalyzer
from app.analyzers.orchestrator import AnalysisOrchestrator
from app.db.session import SessionLocal
from sqlalchemy.ext.asyncio import AsyncSession


def create_analysis_orchestrator() -> AnalysisOrchestrator:
    """
    Create the canonical repository analysis orchestrator.
    """

    return AnalysisOrchestrator(
        analyzers=(
            DefaultAnalyzer(),
        ),
    )


def create_analysis_execution_service(
    db: AsyncSession,
) -> AnalysisExecutionService:
    """
    Create the analysis execution service.

    The service receives the canonical analyzer orchestrator.
    """

    return AnalysisExecutionService(
        db=db,
        orchestrator=create_analysis_orchestrator(),
    )


def create_analysis_dispatcher(
    db: AsyncSession,
) -> AnalysisExecutionDispatcher:
    """
    Create the analysis execution dispatcher.
    """

    return AnalysisExecutionDispatcher(
        execution_service=create_analysis_execution_service(db),
    )


async def execute_analysis_in_background(
    analysis_id: int,
) -> None:
    """
    Execute an analysis job using a fresh database session.

    Background execution must never reuse the request-scoped
    database
    session.

    Transaction ownership belongs to this background execution
    boundary. Successful execution is committed; failures are rolled
    back and propagated to the caller.
    """

    async with SessionLocal() as db:
        dispatcher = create_analysis_dispatcher(db)

        try:
            await dispatcher.dispatch(
                analysis_id=analysis_id,
            )

            await db.commit()

        except Exception:
            await db.rollback()
            raise