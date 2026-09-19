"""
Tests for Architecture Drift & Constraint Invalidation Engine.
"""

from app.architecture.memory.drift_detector import (
    DriftSeverity,
    detect_architecture_drift,
)
from app.models.memory import ArchitectureMemoryEntry, MemoryType


def test_detect_clean_architecture_zero_drift():
    entries = [
        ArchitectureMemoryEntry(
            id=1,
            memory_id=1,
            organization_id=1,
            repository_id=1,
            analysis_id=1,
            memory_type=MemoryType.ARCHITECTURE_CONSTRAINT,
            title="Domain Purity Rule",
            content="Domain models must not import requests or httpx in app/models",
            confidence=1.0,
        )
    ]
    nodes = ["app/models/order.py", "app/services/order_service.py"]
    edges = [{"source": "app/services/order_service.py", "target": "app/models/order.py"}]

    report = detect_architecture_drift(memory_entries=entries, nodes=nodes, edges=edges)
    assert not report.has_drift
    assert report.drift_score == 100.0
    assert len(report.violations) == 0


def test_detect_architecture_drift_violation():
    entries = [
        ArchitectureMemoryEntry(
            id=1,
            memory_id=1,
            organization_id=1,
            repository_id=1,
            analysis_id=1,
            memory_type=MemoryType.ARCHITECTURE_CONSTRAINT,
            title="Domain Purity Rule",
            content="Domain models must not import requests in app/models",
            confidence=1.0,
        )
    ]
    nodes = ["app/models/order.py", "requests"]
    edges = [{"source": "app/models/order.py", "target": "requests"}]

    report = detect_architecture_drift(memory_entries=entries, nodes=nodes, edges=edges)
    assert report.has_drift
    assert report.violated_decisions_count == 1
    assert report.drift_score < 100.0
    assert report.violations[0].severity == DriftSeverity.CRITICAL
    assert report.violations[0].violating_source == "app/models/order.py"
    assert report.violations[0].violating_target == "requests"
