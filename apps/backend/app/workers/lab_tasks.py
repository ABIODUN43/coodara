"""
Celery background tasks for Architecture Lab experiment execution.

Executes architectural experiment runs asynchronously in an isolated worker process.
Guarantees:
- Uses fresh SessionLocal() for database operations.
- Enforces ExperimentRun lifecycle transitions (PENDING/READY -> RUNNING -> COMPLETED / FAILED).
- Guarantees FAILED state persistence upon exceptions.
- Sanitizes all log messages to prevent secret leakage.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.db.session import SessionLocal
from app.services.experiment_execution_service import (
    ExperimentExecutionService,
    _safe_error_message,
)
from app.workers.celery_app import celery_app
from celery.exceptions import SoftTimeLimitExceeded

logger = logging.getLogger(__name__)


async def _run_experiment_async(
    *,
    organization_id: int,
    repository_id: int,
    experiment_id: int,
    run_id: int,
) -> dict[str, Any]:
    """
    Execute experiment run using an isolated async session.
    """
    logger.info(
        "Worker starting experiment run id=%d for experiment_id=%d (repo_id=%d)",
        run_id,
        experiment_id,
        repository_id,
    )
    async with SessionLocal() as db:
        execution_service = ExperimentExecutionService(db)
        run = await execution_service.execute_run(
            organization_id=organization_id,
            repository_id=repository_id,
            experiment_id=experiment_id,
            run_id=run_id,
        )
        return {
            "status": run.status,
            "run_id": run.id,
            "experiment_id": experiment_id,
            "completed_at": run.completed_at.isoformat() if run.completed_at else None,
        }


@celery_app.task(
    bind=True,
    name="lab.execute_experiment",
    max_retries=1,
    default_retry_delay=10,
    track_started=True,
)
def execute_experiment_task(
    self: Any,
    *,
    organization_id: int,
    repository_id: int,
    experiment_id: int,
    run_id: int,
) -> dict[str, Any]:
    """
    Celery task entry point for experiment evaluation.
    """
    try:
        return asyncio.run(
            _run_experiment_async(
                organization_id=organization_id,
                repository_id=repository_id,
                experiment_id=experiment_id,
                run_id=run_id,
            )
        )
    except SoftTimeLimitExceeded as timeout_exc:
        logger.error(
            "Experiment run id=%d exceeded soft execution time limit.",
            run_id,
        )
        return {
            "status": "failed",
            "run_id": run_id,
            "error": "Experiment exceeded maximum execution time limit.",
        }
    except Exception as exc:
        safe_msg = _safe_error_message(exc)
        logger.error(
            "Celery task failed for experiment run id=%d: %s",
            run_id,
            safe_msg,
        )
        return {
            "status": "failed",
            "run_id": run_id,
            "error": safe_msg,
        }
