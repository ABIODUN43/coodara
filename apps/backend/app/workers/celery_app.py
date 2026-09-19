"""
Celery application configuration.

Responsible for initializing the Celery distributed task queue using Redis.
The worker runs as an independent process and does not depend on FastAPI.
"""

from __future__ import annotations

import logging

from app.core.config import settings
from celery import Celery

logger = logging.getLogger(__name__)

celery_app = Celery(
    "coodara",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=[
        "app.workers.analysis_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    task_soft_time_limit=settings.CELERY_TASK_SOFT_TIME_LIMIT,
    task_time_limit=settings.CELERY_TASK_TIME_LIMIT,
    worker_concurrency=settings.CELERY_WORKER_CONCURRENCY,
    task_track_started=True,
)
