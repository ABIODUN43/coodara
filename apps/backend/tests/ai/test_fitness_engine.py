"""
Unit tests for Declarative Architecture Fitness & Rule Engine.
"""

from app.ai.tools.fitness_engine import (
    RuleSeverity,
    evaluate_architecture_fitness,
)


def test_evaluate_clean_architecture_fitness():
    # Clean layered architecture: api -> service -> domain
    nodes = ["app/api/orders.py", "app/services/orders.py", "app/domain/orders.py"]
    edges = [
        {"source": "app/api/orders.py", "target": "app/services/orders.py"},
        {"source": "app/services/orders.py", "target": "app/domain/orders.py"},
    ]

    report = evaluate_architecture_fitness(nodes, edges)
    assert report.fitness_score == 100.0
    assert report.violations_count == 0


def test_evaluate_layer_violation_and_cycles():
    # Violations: api directly imports db (layer bypass), and a cycle between orders and billing
    nodes = ["app/api/orders.py", "app/db/models.py", "app/billing.py", "app/orders.py"]
    edges = [
        {"source": "app/api/orders.py", "target": "app/db/models.py"},
        {"source": "app/orders.py", "target": "app/billing.py"},
        {"source": "app/billing.py", "target": "app/orders.py"},
    ]

    report = evaluate_architecture_fitness(nodes, edges)
    assert report.fitness_score < 100.0
    assert report.violations_count >= 2

    # Check for layer violation
    layer_violation = next(v for v in report.violations if v.rule_id == "RULE-01")
    assert layer_violation.severity == RuleSeverity.HIGH

    # Check for ADP cycle violation
    cycle_violation = next(v for v in report.violations if v.rule_id == "RULE-03")
    assert cycle_violation.severity == RuleSeverity.CRITICAL
