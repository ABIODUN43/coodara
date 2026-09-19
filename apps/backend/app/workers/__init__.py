"""
Coodara worker package.
"""

from __future__ import annotations

from app.workers.analysis_tasks import execute_analysis_task
from app.workers.celery_app import celery_app

__all__ = [
    "celery_app",
    "execute_analysis_task",
]
