"""
Tests for ArchitectureRuleEngine and Quality Gate evaluation.
"""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from app.architecture.rule_engine import ArchitectureRuleEngine


def test_rule_engine_disallow_dependency_violation() -> None:
    engine = ArchitectureRuleEngine()

    rule1 = MagicMock()
    rule1.id = 1
    rule1.name = "Controllers cannot access Database"
    rule1.rule_type = "disallow_dependency"
    rule1.source_pattern = "*controller*"
    rule1.target_pattern = "*db*"
    rule1.severity = "critical"
    rule1.rationale = "Direct database access in presentation layer."
    rule1.is_active = True

    edges = [
        {"source": "src/controllers/order_controller.py", "target": "src/services/order_service.py"},
        {"source": "src/controllers/order_controller.py", "target": "src/db/raw_session.py"},
        {"source": "src/services/order_service.py", "target": "src/db/raw_session.py"},
    ]

    violations = engine.evaluate_rules([rule1], edges)
    assert len(violations) == 1
    assert violations[0].source_component == "src/controllers/order_controller.py"
    assert violations[0].target_component == "src/db/raw_session.py"
    assert violations[0].severity == "critical"


def test_rule_engine_quality_gate_pass_and_fail() -> None:
    engine = ArchitectureRuleEngine()

    rule = MagicMock()
    rule.id = 1
    rule.name = "No Presentation -> DB"
    rule.rule_type = "disallow_dependency"
    rule.source_pattern = "*controller*"
    rule.target_pattern = "*db*"
    rule.severity = "critical"
    rule.rationale = "Layer boundary breach."
    rule.is_active = True

    # 1. Clean edges -> Quality Gate passes
    clean_edges = [
        {"source": "src/controllers/order_controller.py", "target": "src/services/order_service.py"},
        {"source": "src/services/order_service.py", "target": "src/db/session.py"},
    ]
    gate_clean = engine.evaluate_quality_gate(
        rules=[rule],
        edges=clean_edges,
        cycles_count=0,
        health_score=92.5,
    )
    assert gate_clean.passed is True
    assert gate_clean.status == "PASSED"
    assert "Passed" in gate_clean.summary

    # 2. Edges with circular dependency or rule violation -> Quality Gate fails
    violating_edges = [
        {"source": "src/controllers/order_controller.py", "target": "src/db/session.py"},
    ]
    gate_failed = engine.evaluate_quality_gate(
        rules=[rule],
        edges=violating_edges,
        cycles_count=1,
        health_score=65.0,
    )
    assert gate_failed.passed is False
    assert gate_failed.status == "FAILED"
    assert gate_failed.critical_violations_count == 1
    assert gate_failed.circular_dependencies_count == 1
