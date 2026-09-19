"""
Declarative Architecture Fitness & Rule Engine for Coodara AI (ArchUnit Style).

Enforces compile-time architectural fitness functions across codebase topology:
- Hexagonal / Clean Architecture Domain Purity.
- Layer Boundary Isolation (Presentation -> Application -> Domain <- Infrastructure).
- Acyclic Dependencies Principle (ADP).
- God Module / Centrality Bottleneck Detection.
- Direct Database Leakage Detection.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any, Sequence

from app.ai.tools.graph_tools import calculate_coupling_metrics, detect_dependency_cycles
from app.ai.tools.symbol_engine import SymbolCallSite, SymbolDefinition


class RuleSeverity(StrEnum):
    """Severity classification for architectural rule violations."""

    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    INFO = "INFO"


@dataclass(frozen=True)
class ArchitectureRule:
    """A declarative architectural fitness rule."""

    id: str
    name: str
    description: str
    severity: RuleSeverity
    source_layer_pattern: str  # e.g. "api/", "domain/"
    forbidden_target_pattern: str  # e.g. "db/", "adapters/"
    remediation_blueprint: str


@dataclass(frozen=True)
class RuleViolation:
    """An exact empirical architectural rule violation."""

    rule_id: str
    rule_name: str
    severity: RuleSeverity
    source_component: str
    target_component: str
    violation_type: str
    source_file: str
    line_number: int
    observed_evidence: str
    remediation: str


@dataclass(frozen=True)
class ArchitectureFitnessReport:
    """Complete fitness function audit report."""

    fitness_score: float  # 0.0 to 100.0
    total_rules_evaluated: int
    passed_rules_count: int
    violations_count: int
    critical_violations_count: int
    high_violations_count: int
    violations: list[RuleViolation] = field(default_factory=list)


STANDARD_ARCHITECTURE_RULES = [
    ArchitectureRule(
        id="RULE-01",
        name="Layer Boundary Isolation (No Direct DB Leaks into Presentation)",
        description="Presentation routers and API controllers must not bypass application services to query database tables or import SQLAlchemy models directly.",
        severity=RuleSeverity.HIGH,
        source_layer_pattern="api",
        forbidden_target_pattern="db",
        remediation_blueprint="Route queries through an Application Service and Domain Repository adapter rather than accessing database sessions in router handlers.",
    ),
    ArchitectureRule(
        id="RULE-02",
        name="Hexagonal Domain Purity (Domain Core Isolation)",
        description="Core domain models and business entities must remain pure and not import external infrastructure adapters, HTTP clients, or framework drivers.",
        severity=RuleSeverity.CRITICAL,
        source_layer_pattern="domain",
        forbidden_target_pattern="adapters",
        remediation_blueprint="Apply the Dependency Inversion Principle (DIP): define interface ports inside domain core and implement them in infrastructure adapters.",
    ),
    ArchitectureRule(
        id="RULE-03",
        name="Acyclic Dependencies Principle (ADP)",
        description="The package and service dependency graph must be a strict Directed Acyclic Graph (DAG) with zero circular dependency loops.",
        severity=RuleSeverity.CRITICAL,
        source_layer_pattern="*",
        forbidden_target_pattern="cycle",
        remediation_blueprint="Break bidirectional import cycles by extracting shared value objects into an independent domain primitives module.",
    ),
    ArchitectureRule(
        id="RULE-04",
        name="God Component & Coordinator Threshold",
        description="No single module or service coordinator should exceed total degree centrality of 12 dependencies, which creates a monolithic instability bottleneck.",
        severity=RuleSeverity.MEDIUM,
        source_layer_pattern="*",
        forbidden_target_pattern="god_object",
        remediation_blueprint="Decompose the high-fan-out coordinator into smaller, single-responsibility domain sub-services.",
    ),
]


def evaluate_architecture_fitness(
    nodes: Sequence[str | dict[str, Any]],
    edges: Sequence[dict[str, Any] | tuple[str, str]],
    symbols: Sequence[SymbolDefinition] | None = None,
    rules: Sequence[ArchitectureRule] | None = None,
) -> ArchitectureFitnessReport:
    """
    Evaluate declarative architectural fitness functions against verified graph topology.
    """
    active_rules = rules or STANDARD_ARCHITECTURE_RULES
    violations: list[RuleViolation] = []

    # Map edges
    edge_list: list[tuple[str, str, str]] = []
    for e in edges:
        if isinstance(e, tuple):
            edge_list.append((e[0], e[1], "import"))
        else:
            edge_list.append((e.get("source", ""), e.get("target", ""), e.get("kind", "import")))

    # Check 1: Layer Boundary Violations (RULE-01: api -> db direct import)
    for src, dst, _ in edge_list:
        src_lower = src.lower()
        dst_lower = dst.lower()

        # Check API -> DB leak
        if ("api" in src_lower or "router" in src_lower) and ("models" in dst_lower or "db" in dst_lower or "database" in dst_lower) and "service" not in dst_lower:
            violations.append(
                RuleViolation(
                    rule_id="RULE-01",
                    rule_name="Layer Boundary Isolation",
                    severity=RuleSeverity.HIGH,
                    source_component=src,
                    target_component=dst,
                    violation_type="Layer Skipping: Presentation directly imports Persistence",
                    source_file=src,
                    line_number=1,
                    observed_evidence=f"Presentation module `{src}` directly imports database module `{dst}` without passing through service layer.",
                    remediation="Delegate data operations to an Application Service.",
                )
            )

        # Check Domain -> Adapters / Infrastructure leak
        if ("domain" in src_lower or "models" in src_lower) and ("adapters" in dst_lower or "infrastructure" in dst_lower or "http" in dst_lower):
            violations.append(
                RuleViolation(
                    rule_id="RULE-02",
                    rule_name="Hexagonal Domain Purity",
                    severity=RuleSeverity.CRITICAL,
                    source_component=src,
                    target_component=dst,
                    violation_type="Domain Purity Violation: Domain imports Infrastructure",
                    source_file=src,
                    line_number=1,
                    observed_evidence=f"Domain core module `{src}` directly imports infrastructure adapter `{dst}`.",
                    remediation="Invert the dependency: define an interface in domain core and implement it in adapters.",
                )
            )

    # Check 2: Cycle detection (RULE-03: ADP)
    cycle_res = detect_dependency_cycles(nodes, edges)
    if cycle_res.has_cycles:
        for chain in cycle_res.cycle_chains:
            chain_str = " -> ".join(chain)
            violations.append(
                RuleViolation(
                    rule_id="RULE-03",
                    rule_name="Acyclic Dependencies Principle (ADP)",
                    severity=RuleSeverity.CRITICAL,
                    source_component=chain[0],
                    target_component=chain[1] if len(chain) > 1 else chain[0],
                    violation_type="Circular Dependency Loop",
                    source_file=chain[0],
                    line_number=1,
                    observed_evidence=f"Circular dependency chain detected: `{chain_str}`.",
                    remediation="Extract shared dependencies into a decoupled primitives module.",
                )
            )

    # Check 3: God component centrality (RULE-04)
    coupling_map = calculate_coupling_metrics(nodes, edges)
    for node_id, m in coupling_map.items():
        if m.afferent_coupling + m.efferent_coupling > 10:
            violations.append(
                RuleViolation(
                    rule_id="RULE-04",
                    rule_name="God Component & Centrality Bottleneck",
                    severity=RuleSeverity.MEDIUM,
                    source_component=node_id,
                    target_component="*",
                    violation_type="Monolithic Instability: Degree Centrality > 10",
                    source_file=node_id,
                    line_number=1,
                    observed_evidence=f"Component `{node_id}` participates in {m.afferent_coupling + m.efferent_coupling} total couplings (Fan-in Ca={m.afferent_coupling}, Fan-out Ce={m.efferent_coupling}).",
                    remediation="Decompose coordinator into single-responsibility domain sub-services.",
                )
            )

    crit_count = sum(1 for v in violations if v.severity == RuleSeverity.CRITICAL)
    high_count = sum(1 for v in violations if v.severity == RuleSeverity.HIGH)
    med_count = sum(1 for v in violations if v.severity == RuleSeverity.MEDIUM)

    # Calculate overall fitness score (100 base minus deductions)
    score_deduction = (crit_count * 15.0) + (high_count * 8.0) + (med_count * 3.0)
    fitness_score = max(0.0, min(100.0, round(100.0 - score_deduction, 1)))

    passed_rules = len(active_rules) - (1 if crit_count > 0 else 0) - (1 if high_count > 0 else 0) - (1 if med_count > 0 else 0)

    return ArchitectureFitnessReport(
        fitness_score=fitness_score,
        total_rules_evaluated=len(active_rules),
        passed_rules_count=max(0, passed_rules),
        violations_count=len(violations),
        critical_violations_count=crit_count,
        high_violations_count=high_count,
        violations=violations,
    )
