"""
Tests for Celery application configuration.
"""

from __future__ import annotations

from app.workers.celery_app import celery_app


def test_celery_app_configuration() -> None:
    """Verify Celery app has expected production-grade configurations."""
    assert celery_app.main == "coodara"
    assert celery_app.conf.task_serializer == "json"
    assert celery_app.conf.result_serializer == "json"
    assert "json" in celery_app.conf.accept_content
    assert celery_app.conf.task_acks_late is True
    assert celery_app.conf.task_reject_on_worker_lost is True
    assert celery_app.conf.worker_prefetch_multiplier == 1
    assert celery_app.conf.task_soft_time_limit == 600
    assert celery_app.conf.task_time_limit == 900
    assert celery_app.conf.worker_concurrency == 2
    assert "app.workers.analysis_tasks" in celery_app.conf.include
