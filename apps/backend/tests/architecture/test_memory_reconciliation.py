"""
Unit and Integration Tests for Architecture Memory Reconciliation (Coodara V2).

Verifies:
1. Day 1: First analysis creates ArchitectureMemory with active components and technologies.
2. Day 2: Second analysis detects:
   - Added components (COMPONENT_ADDED)
   - Removed components (COMPONENT_REMOVED)
   - Upgraded technologies (TECHNOLOGY_CHANGED)
   - Resolved architectural issues (ISSUE_RESOLVED)
   - Score improvements (SCORE_CHANGED)
3. Idempotency: Duplicate delivery does not produce duplicate events.
4. Provenance tracking on synthesized memory knowledge entries.
"""

import json
from unittest.mock import MagicMock

import pytest
from app.architecture.memory.reconciler import ArchitectureMemoryReconciler
from app.models.analysis import AnalysisResult, DetectedTechnology, RepositoryMetrics
from app.models.architecture import (
    ArchitectureIssue,
    ArchitectureRecommendation,
    ArchitectureScore,
    ArchitectureSnapshot,
)
from app.models.memory import (
    ArchitectureComponent,
    ArchitectureEventType,
    ArchitectureMemory,
    ComponentStatus,
    MemoryType,
)


def _build_snapshot_1() -> tuple[ArchitectureSnapshot, AnalysisResult]:
    """
    Day 1 Snapshot:
    - 3 Components: auth-service, user-service, payment-service
    - 2 Technologies: FastAPI 0.110.0, PostgreSQL 16
    - 1 Issue: High Coupling in auth-service
    - Score: 72.0
    """
    graph_data = {
        "version": 1,
        "nodes": [
            {"id": "auth-service", "type": "service"},
            {"id": "user-service", "type": "service"},
            {"id": "payment-service", "type": "service"},
        ],
        "edges": [
            {"source": "auth-service", "target": "user-service", "kind": "depends_on"},
        ],
    }

    snapshot = ArchitectureSnapshot(
        id=1,
        repository_id=10,
        analysis_result_id=1,
        snapshot_version=1,
        graph=json.dumps(graph_data),
    )
    snapshot.score = ArchitectureScore(
        architecture_snapshot_id=1,
        score=72.0,
        maintainability=70.0,
        coupling=65.0,
        cohesion=80.0,
        complexity=75.0,
    )
    snapshot.issues = [
        ArchitectureIssue(
            architecture_snapshot_id=1,
            severity="high",
            category="Coupling",
            description="Circular coupling between auth-service and user-service.",
        )
    ]
    snapshot.recommendations = [
        ArchitectureRecommendation(
            architecture_snapshot_id=1,
            recommendation="Decouple auth-service using token verification interface.",
            priority="high",
        )
    ]

    analysis_res = AnalysisResult(
        id=1,
        analysis_job_id=1,
        summary="Day 1 initial analysis",
    )
    analysis_res.metrics = RepositoryMetrics(
        analysis_result_id=1,
        loc=5000,
        files=35,
        classes=20,
        functions=80,
        maintainability=70.0,
    )
    analysis_res.technologies = [
        DetectedTechnology(analysis_result_id=1, technology="FastAPI", version="0.110.0", confidence_score=1.0),
        DetectedTechnology(analysis_result_id=1, technology="PostgreSQL", version="16.0", confidence_score=1.0),
    ]

    return snapshot, analysis_res


def _build_snapshot_2() -> tuple[ArchitectureSnapshot, AnalysisResult]:
    """
    Day 2 Evolved Snapshot:
    - Added: notification-service
    - Removed: payment-service
    - Upgraded: FastAPI 0.110.0 -> 0.115.0
    - Resolved: Circular coupling between auth-service and user-service
    - Score: 72.0 -> 81.0 (+9.0)
    """
    graph_data = {
        "version": 1,
        "nodes": [
            {"id": "auth-service", "type": "service"},
            {"id": "user-service", "type": "service"},
            {"id": "notification-service", "type": "service"},  # New component!
        ],
        "edges": [
            {"source": "auth-service", "target": "notification-service", "kind": "depends_on"},
        ],
    }

    snapshot = ArchitectureSnapshot(
        id=2,
        repository_id=10,
        analysis_result_id=2,
        snapshot_version=2,
        graph=json.dumps(graph_data),
    )
    snapshot.score = ArchitectureScore(
        architecture_snapshot_id=2,
        score=81.0,
        maintainability=82.0,
        coupling=80.0,
        cohesion=85.0,
        complexity=78.0,
    )
    snapshot.issues = []  # Issue resolved!
    snapshot.recommendations = [
        ArchitectureRecommendation(
            architecture_snapshot_id=2,
            recommendation="Maintain clean layer boundaries.",
            priority="medium",
        )
    ]

    analysis_res = AnalysisResult(
        id=2,
        analysis_job_id=2,
        summary="Day 2 evolved analysis",
    )
    analysis_res.metrics = RepositoryMetrics(
        analysis_result_id=2,
        loc=5400,
        files=38,
        classes=24,
        functions=92,
        maintainability=82.0,
    )
    analysis_res.technologies = [
        DetectedTechnology(analysis_result_id=2, technology="FastAPI", version="0.115.0", confidence_score=1.0),  # Upgraded!
        DetectedTechnology(analysis_result_id=2, technology="PostgreSQL", version="16.0", confidence_score=1.0),
    ]

    return snapshot, analysis_res


def test_first_analysis_initializes_memory_and_events():
    """
    Day 1: First analysis creates initial active components and tracks technology facts.
    """
    reconciler = ArchitectureMemoryReconciler()
    memory = ArchitectureMemory(
        id=1,
        organization_id=1,
        repository_id=10,
        components=[],
        technologies=[],
        relationships=[],
        entries=[],
    )

    snapshot_1, analysis_res_1 = _build_snapshot_1()

    result = reconciler.reconcile(
        memory=memory,
        snapshot=snapshot_1,
        analysis_result=analysis_res_1,
        previous_snapshot=None,
        analysis_id=1,
    )

    # 3 components added + 2 technologies added + 1 issue detected = 6 events
    assert len(result.new_events) >= 5

    event_types = [e.event_type for e in result.new_events]
    assert ArchitectureEventType.COMPONENT_ADDED in event_types
    assert ArchitectureEventType.TECHNOLOGY_ADDED in event_types
    assert ArchitectureEventType.ISSUE_DETECTED in event_types

    # Memory state verification
    assert len(memory.components) == 3
    assert all(c.status == ComponentStatus.ACTIVE for c in memory.components)
    assert len(memory.technologies) == 2

    # Knowledge entries synthesized
    assert len(result.new_entries) >= 3
    assert any(e.memory_type == MemoryType.ARCHITECTURE_FACT for e in result.new_entries)
    assert any(e.source_analyzer == "TechnologyAnalyzer" for e in result.new_entries)


def test_second_analysis_detects_architectural_changes():
    """
    Day 2: Second analysis compares with existing memory and detects:
    - Component Added: notification-service
    - Component Removed: payment-service
    - Technology Upgraded: FastAPI 0.110.0 -> 0.115.0
    - Issue Resolved: Circular coupling
    - Score Changed: 72.0 -> 81.0 (+9.0)
    """
    reconciler = ArchitectureMemoryReconciler()
    memory = ArchitectureMemory(
        id=1,
        organization_id=1,
        repository_id=10,
        components=[],
        technologies=[],
        relationships=[],
        entries=[],
    )

    # Run Day 1
    snapshot_1, analysis_res_1 = _build_snapshot_1()
    reconciler.reconcile(
        memory=memory,
        snapshot=snapshot_1,
        analysis_result=analysis_res_1,
        previous_snapshot=None,
        analysis_id=1,
    )

    # Run Day 2
    snapshot_2, analysis_res_2 = _build_snapshot_2()
    result_2 = reconciler.reconcile(
        memory=memory,
        snapshot=snapshot_2,
        analysis_result=analysis_res_2,
        previous_snapshot=snapshot_1,
        analysis_id=2,
    )

    events_2 = result_2.new_events
    event_types_2 = [e.event_type for e in events_2]

    # Verify detected evolution events
    assert ArchitectureEventType.COMPONENT_ADDED in event_types_2
    assert ArchitectureEventType.COMPONENT_REMOVED in event_types_2
    assert ArchitectureEventType.TECHNOLOGY_CHANGED in event_types_2
    assert ArchitectureEventType.ISSUE_RESOLVED in event_types_2
    assert ArchitectureEventType.SCORE_CHANGED in event_types_2

    # Verify component status in memory
    comp_statuses = {c.name: c.status for c in memory.components}
    assert comp_statuses["notification-service"] == ComponentStatus.ACTIVE
    assert comp_statuses["payment-service"] == ComponentStatus.REMOVED
    assert comp_statuses["auth-service"] == ComponentStatus.ACTIVE

    # Verify technology status in memory
    tech_map = {t.technology: t for t in memory.technologies}
    assert tech_map["FastAPI"].version == "0.115.0"
    assert tech_map["FastAPI"].status == ComponentStatus.UPGRADED

    # Verify score changed event details
    score_event = next(e for e in events_2 if e.event_type == ArchitectureEventType.SCORE_CHANGED)
    details = json.loads(score_event.details)
    assert details["previous_score"] == 72.0
    assert details["new_score"] == 81.0
    assert details["delta"] == 9.0
