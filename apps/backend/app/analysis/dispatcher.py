"""
Analysis execution dispatching.

The dispatcher separates job dispatch from actual execution.

Responsibilities:
- In asynchronous production mode: enqueue the analysis task into Celery / Redis.
- In synchronous/direct mode: execute directly through AnalysisExecutionService.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.analysis.execution import AnalysisExecutionService
    from app.models.analysis import AnalysisJob

logger = logging.getLogger(__name__)


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

    def enqueue(
        self,
        *,
        analysis_id: int,
    ) -> str | None:
        """
        Enqueue an analysis job to the Celery task queue.

        Must only be called AFTER the AnalysisJob is durably committed to the database.
        Returns the Celery task ID, or None if queue submission failed.
        """
        try:
            from app.workers.analysis_tasks import execute_analysis_task

            task_result = execute_analysis_task.delay(analysis_id)
            task_id = str(task_result.id)
            logger.info(
                "Enqueued analysis_id=%d to Celery queue (task_id=%s)",
                analysis_id,
                task_id,
            )
            return task_id
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "Failed to enqueue analysis_id=%d to Celery queue: %s",
                analysis_id,
                exc,
            )
            return None


    async def dispatch(
        self,
        *,
        analysis_id: int,
    ) -> AnalysisJob:
        """
        Dispatch one analysis job directly for execution.
        """
        return await self._execution_service.execute(
            analysis_id=analysis_id,
        )