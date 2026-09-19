"""
Architecture Drift & Constraint Invalidation Engine for Coodara V2.

Detects discrepancies and violations between stored Architectural Decisions / Invariants
and the live AST dependency graph topology across git commits.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any, Sequence

from app.models.memory import ArchitectureMemoryEntry, MemoryType


class DriftSeverity(StrEnum):
    """Severity of detected architectural drift."""

    CRITICAL = "CRITICAL"
    WARNING = "WARNING"
    INFO = "INFO"


@dataclass(frozen=True)
class DriftViolation:
    """A detected architectural drift violation."""

    decision_id: int
    decision_title: str
    severity: DriftSeverity
    violating_source: str
    violating_target: str
    observed_edge: str
    explanation: str
    remediation: str


@dataclass(frozen=True)
class ArchitectureDriftReport:
    """Complete drift audit scorecard."""

    has_drift: bool
    total_decisions_checked: int
    violated_decisions_count: int
    drift_score: float  # 100.0 (clean) down to 0.0 (severe drift)
    violations: list[DriftViolation] = field(default_factory=list)
    evaluable: bool = True
    total_constraints_checked: int = 0
    violated_constraints_count: int = 0


def detect_architecture_drift(
    *,
    memory_entries: Sequence[ArchitectureMemoryEntry],
    nodes: Sequence[str] | None = None,
    graph_edges: Sequence[dict[str, str] | tuple[str, str]] | None = None,
    edges: Sequence[dict[str, str] | tuple[str, str]] | None = None,
) -> ArchitectureDriftReport:
    """
    Compare active architectural decisions & constraints against the live graph edges.
    """
    effective_edges = graph_edges if graph_edges is not None else (edges or [])

    # Filter for active constraints and invariants
    constraints = [
        e for e in memory_entries
        if "INVARIANT" in str(getattr(e, "memory_type", ""))
        or "CONSTRAINT" in str(getattr(e, "memory_type", ""))
        or "DECISION" in str(getattr(e, "memory_type", ""))
        or "invariant" in str(getattr(e, "title", "")).lower()
        or "must not" in str(getattr(e, "content", "")).lower()
        or "forbid" in str(getattr(e, "content", "")).lower()
    ]

    if not constraints:
        return ArchitectureDriftReport(
            evaluable=False,
            has_drift=False,
            total_decisions_checked=0,
            violated_decisions_count=0,
            drift_score=0.0,
            violations=[],
            total_constraints_checked=0,
            violated_constraints_count=0,
        )

    edge_list: list[tuple[str, str]] = []
    for e in effective_edges:
        if isinstance(e, tuple):
            edge_list.append((e[0], e[1]))
        elif isinstance(e, dict):
            edge_list.append((e.get("source", ""), e.get("target", "")))

    violations: list[DriftViolation] = []

    for c in constraints:
        c_title = getattr(c, "title", "Rule")
        c_content = getattr(c, "content", "")
        c_id = getattr(c, "id", 1)
        c_text = f"{c_title} {c_content}".lower()

        # Check: "must not import" / "cannot depend on" / "forbid"
        forbid_matches = re.findall(r"\b(?:must not|cannot|never|forbid)\s+(?:import|call|depend on)\s+([A-Za-z0-9_\-./]+)", c_text)
        scope_matches = re.findall(r"\b(?:in|from|within)\s+([A-Za-z0-9_\-./]+)", c_text)

        target_forbidden = forbid_matches[0] if forbid_matches else None
        source_scope = scope_matches[0] if scope_matches else None

        if target_forbidden:
            for src, dst in edge_list:
                src_match = source_scope in src.lower() if source_scope else True
                dst_match = target_forbidden.lower() in dst.lower()

                if src_match and dst_match:
                    violations.append(
                        DriftViolation(
                            decision_id=c_id,
                            decision_title=c_title,
                            severity=DriftSeverity.CRITICAL if "critical" in c_text or "must" in c_text else DriftSeverity.WARNING,
                            violating_source=src,
                            violating_target=dst,
                            observed_edge=f"`{src}` -> `{dst}`",
                            explanation=f"Invariant '{c_title}' forbids `{target_forbidden}`, but edge `{src}` -> `{dst}` was detected in live graph snapshot.",
                            remediation="Refactor the dependency or update the rule in Architecture Memory.",
                        )
                    )

    crit_count = sum(1 for v in violations if v.severity == DriftSeverity.CRITICAL)
    warn_count = sum(1 for v in violations if v.severity == DriftSeverity.WARNING)

    deduction = (crit_count * 25.0) + (warn_count * 10.0)
    drift_score = max(0.0, min(100.0, round(100.0 - deduction, 1)))

    return ArchitectureDriftReport(
        evaluable=True,
        has_drift=len(violations) > 0,
        total_decisions_checked=len(constraints),
        violated_decisions_count=len(violations),
        drift_score=drift_score,
        violations=violations,
        total_constraints_checked=len(constraints),
        violated_constraints_count=len(violations),
    )
