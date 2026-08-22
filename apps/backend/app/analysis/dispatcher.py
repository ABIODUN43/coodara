"""
Analysis execution dispatching.

The dispatcher separates job dispatch from actual execution.

The MVP implementation executes directly through
AnalysisExecutionService.

A future queue-backed implementation can replace this
dispatcher without changing the execution service.
"""

from __future__ import annotations

from app.analysis.execution import AnalysisExecutionService
from app.models.analysis import AnalysisJob


class AnalysisExecutionDispatcher:
    """
    Dispatch analysis jobs for execution.

    The dispatcher contains no analysis logic.
    """

    def __init__(
        self,
        execution_service: AnalysisExecutionService,
    ) -> None:
        self._execution_service = execution_service

    async def dispatch(
        self,
        *,
        analysis_id: int,
    ) -> AnalysisJob:
        """
        Dispatch one analysis job.
        """

        return await self._execution_service.execute(
            analysis_id=analysis_id,
        )