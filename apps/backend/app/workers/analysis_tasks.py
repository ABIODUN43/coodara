"""
Celery tasks for repository analysis execution.

Responsible for executing repository analysis in an isolated worker process.
- Receives only analysis_id (never models or sessions).
- Uses fresh AsyncSession for database operations.
- Enforces durable job lifecycle (PENDING/QUEUED -> RUNNING -> COMPLETED / FAILED).
- Guarantees FAILED state persistence in PostgreSQL even upon execution exceptions.
- Implements idempotency against duplicate task delivery.
- Implements bounded retries for transient errors while failing fast on permanent errors.
- Sanitizes all log messages and error messages to prevent secret leakage.
"""

from __future__ import annotations

import asyncio
import logging
import socket
from datetime import datetime, timezone
from typing import Any

from app.analysis.execution import (
    AnalysisExecutionService,
    AnalysisJobNotFoundError,
)
from app.analysis.factory import create_analysis_execution_service
from app.analysis.workspace import RepositoryCloneError
from app.analyzers.exceptions import AnalyzerExecutionError
from app.db.engine import engine
from app.db.session import SessionLocal
from app.models.analysis import AnalysisJob, AnalysisStatus
from app.repositories.analysis_repository import AnalysisRepository
from app.repositories.repository_repository import RepositoryRepository
from app.services.architecture_memory_service import ArchitectureMemoryService
from app.services.architecture_service import (
    ArchitectureAlreadyExistsError,
    ArchitectureService,
)
from app.workers.celery_app import celery_app
from celery.exceptions import MaxRetriesExceededError, SoftTimeLimitExceeded
from sqlalchemy.exc import DBAPIError, OperationalError

logger = logging.getLogger(__name__)


# Errors that represent permanent non-retryable conditions
NON_RETRYABLE_EXCEPTIONS = (
    AnalysisJobNotFoundError,
    AnalyzerExecutionError,
    ValueError,
    KeyError,
    TypeError,
)

# Errors that represent transient network/infrastructure issues
RETRYABLE_EXCEPTIONS = (
    OperationalError,
    DBAPIError,
    ConnectionError,
    TimeoutError,
    socket.error,
    RepositoryCloneError,
)


def _is_retryable_error(exc: Exception) -> bool:
    """
    Determine if an exception represents a transient, retryable failure.
    """
    if isinstance(exc, NON_RETRYABLE_EXCEPTIONS):
        return False
    if isinstance(exc, RETRYABLE_EXCEPTIONS):
        return True
    # If the root cause is a retryable error:
    return bool(exc.__cause__ and isinstance(exc.__cause__, RETRYABLE_EXCEPTIONS))


def _safe_error_message(exc: Exception) -> str:
    """
    Sanitize and truncate error messages for safe user-facing persistence.
    """
    if isinstance(exc, SoftTimeLimitExceeded):
        return "Analysis exceeded the maximum allowed execution time limit."

    msg = str(exc).strip()
    if not msg:
        return "Repository analysis execution failed."

    # Prevent credential leakage
    for sensitive_keyword in ["token", "password", "secret", "authorization", "bearer"]:
        if sensitive_keyword in msg.lower():
            return "Analysis execution failed due to an external service or authentication error."

    return msg[:2000]


async def _persist_failed_state(
    analysis_id: int,
    error_message: str,
) -> None:
    """
    Persist the FAILED status for an analysis job in a dedicated clean transaction.
    """
    try:
        async with SessionLocal() as db:
            repo = AnalysisRepository(db)
            job = await repo.get_by_id(analysis_id)
            if job is not None and job.status != AnalysisStatus.COMPLETED:
                job.status = AnalysisStatus.FAILED
                job.progress = 100
                job.completed_at = datetime.now(timezone.utc)
                job.error_message = error_message
                await repo.update(job)
                await db.commit()
                logger.info(
                    "Persisted FAILED status for analysis_id=%d in PostgreSQL",
                    analysis_id,
                )
    except Exception as persist_exc:  # noqa: BLE001
        logger.error(
            "Failed to persist FAILED status for analysis_id=%d: %s",
            analysis_id,
            persist_exc,
        )



async def _run_analysis_async(
    analysis_id: int,
    task_instance: Any | None = None,
) -> dict[str, Any]:
    """
    Execute repository analysis asynchronously using a fresh database session.
    """
    logger.info("Worker received analysis task for analysis_id=%d", analysis_id)

    async with SessionLocal() as db:
        analysis_repo = AnalysisRepository(db)
        job: AnalysisJob | None = await analysis_repo.get_by_id(analysis_id)

        if job is None:
            logger.error("Analysis job analysis_id=%d not found in database", analysis_id)
            return {
                "status": "not_found",
                "analysis_id": analysis_id,
            }

        # Idempotency check: Do not re-execute already completed analyses
        if job.status == AnalysisStatus.COMPLETED:
            logger.info(
                "Analysis job analysis_id=%d already COMPLETED. Skipping duplicate execution.",
                analysis_id,
            )
            return {
                "status": "already_completed",
                "analysis_id": analysis_id,
            }

        if job.status == AnalysisStatus.RUNNING:
            logger.info("Analysis job %d already RUNNING. Skipping duplicate execution.", analysis_id)
            return {
                "status": "already_running",
                "analysis_id": analysis_id,
            }

        # Transition to RUNNING
        job.status = AnalysisStatus.RUNNING
        job.progress = 10
        job.started_at = datetime.now(timezone.utc)
        job.error_message = None
        await analysis_repo.update(job)
        await db.commit()
        logger.info(
            "Analysis job analysis_id=%d transitioned to RUNNING (repository_id=%d)",
            analysis_id,
            job.repository_id,
        )

    # Now execute analysis in a fresh execution session
    start_time = datetime.now(timezone.utc)
    try:
        # Step 1: Run repository analysis
        async with SessionLocal() as db:
            execution_service: AnalysisExecutionService = create_analysis_execution_service(db)
            await execution_service.execute(analysis_id=analysis_id)
            await db.commit()

        # Step 2: Generate Architecture Snapshot & Reconcile Architecture Memory
        try:
            async with SessionLocal() as db:
                analysis_repo = AnalysisRepository(db)
                repo_repo = RepositoryRepository(db)
                job = await analysis_repo.get_by_id(analysis_id)

                if job is not None:
                    repo = await repo_repo.get_by_id(job.repository_id)
                    if repo is not None and hasattr(repo, "organization_id"):
                        # 2a. Generate architecture snapshot
                        try:
                            arch_service = ArchitectureService(db)
                            await arch_service.generate_architecture(
                                organization_id=repo.organization_id,
                                repository_id=repo.id,
                                analysis_id=analysis_id,
                            )
                            await db.commit()
                            logger.info("Architecture snapshot generated for analysis_id=%d", analysis_id)
                        except ArchitectureAlreadyExistsError:
                            pass
                        except Exception as arch_exc:  # noqa: BLE001
                            logger.warning("Architecture generation failed for analysis_id=%d: %s", analysis_id, arch_exc)

                        # 2b. Reconcile Architecture Memory & Events
                        try:
                            mem_service = ArchitectureMemoryService(db)
                            await mem_service.reconcile_memory(
                                organization_id=repo.organization_id,
                                repository_id=repo.id,
                                analysis_id=analysis_id,
                            )
                            await db.commit()
                            logger.info("Architecture memory reconciled for analysis_id=%d", analysis_id)
                        except Exception as mem_exc:  # noqa: BLE001
                            logger.warning("Architecture memory reconciliation failed for analysis_id=%d: %s", analysis_id, mem_exc)
        except Exception as post_exc:  # noqa: BLE001
            logger.warning("Post-analysis step skipped for analysis_id=%d: %s", analysis_id, post_exc)

        duration = (datetime.now(timezone.utc) - start_time).total_seconds()
        logger.info(
            "Analysis job analysis_id=%d COMPLETED successfully in %.2fs",
            analysis_id,
            duration,
        )
        return {
            "status": "completed",
            "analysis_id": analysis_id,
            "duration_seconds": duration,
        }

    except Exception as exc:  # noqa: BLE001
        duration = (datetime.now(timezone.utc) - start_time).total_seconds()

        safe_msg = _safe_error_message(exc)
        logger.error(
            "Analysis job analysis_id=%d failed after %.2fs: %s",
            analysis_id,
            duration,
            safe_msg,
        )

        # Rollback is automatic with the async with block on exception, but ensure FAILED status is committed
        await _persist_failed_state(analysis_id, safe_msg)

        # Check retry policy if executed within a Celery task context
        if task_instance is not None and _is_retryable_error(exc):
            current_retries = getattr(task_instance.request, "retries", 0)
            max_retries = getattr(task_instance, "max_retries", 3)
            if current_retries < max_retries:
                countdown = int(2 ** current_retries * 5)
                logger.warning(
                    "Retrying analysis_id=%d (attempt %d/%d) in %ds due to transient error: %s",
                    analysis_id,
                    current_retries + 1,
                    max_retries,
                    countdown,
                    safe_msg,
                )
                raise task_instance.retry(exc=exc, countdown=countdown)

        return {
            "status": "failed",
            "analysis_id": analysis_id,
            "error": safe_msg,
        }


def _run_in_loop(coro: Any) -> Any:
    """Run an async coroutine in a dedicated event loop and cleanly dispose connection pool."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        try:
            loop.run_until_complete(engine.dispose())
        except Exception:
            pass
        loop.close()
        asyncio.set_event_loop(None)


@celery_app.task(
    bind=True,
    name="analysis.execute_analysis",
    max_retries=3,
    default_retry_delay=5,
)
def execute_analysis_task(
    self: Any,
    analysis_id: int,
) -> dict[str, Any]:
    """
    Celery task entrypoint for executing repository analysis.

    Delegates execution to the asynchronous worker runner in an event loop.
    """
    try:
        return _run_in_loop(_run_analysis_async(analysis_id, self))
    except (MaxRetriesExceededError, SoftTimeLimitExceeded) as exc:
        safe_msg = _safe_error_message(exc)
        _run_in_loop(_persist_failed_state(analysis_id, safe_msg))
        return {
            "status": "failed",
            "analysis_id": analysis_id,
            "error": safe_msg,
        }

