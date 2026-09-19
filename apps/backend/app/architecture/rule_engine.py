"""
Architecture Boundary Rule and Quality Gate Evaluation Engine.

Provides ArchUnit-style declarative rule evaluation against repository dependency
graphs. Supports glob patterns, layer constraints, and automated CI/CD Quality Gate verdicts.
"""

from __future__ import annotations

import fnmatch
from dataclasses import dataclass, field
from typing import Any, Sequence

from app.models.architecture import ArchitectureRule


@dataclass(frozen=True, slots=True)
class RuleViolation:
    """A detected architectural boundary policy violation."""

    rule_id: int | None
    rule_name: str
    source_component: str
    target_component: str
    severity: str  # "critical", "warning", "info"
    rationale: str
    suggested_fix: str


@dataclass(frozen=True, slots=True)
class QualityGateResult:
    """Automated Quality Gate verdict for CI/CD pipelines and architectural compliance."""

    passed: bool
    status: str  # "PASSED", "FAILED"
    violations: list[RuleViolation]
    critical_violations_count: int
    warning_violations_count: int
    circular_dependencies_count: int
    health_score: float
    summary: str


class ArchitectureRuleEngine:
    """
    Evaluates custom boundary assertions and architectural policies against dependency graphs.
    """

    @staticmethod
    def _matches_pattern(component_path: str, pattern: str) -> bool:
        """Check if component path matches a glob pattern (case-insensitive)."""
        clean_path = component_path.replace("\\", "/").lower()
        clean_pat = pattern.replace("\\", "/").lower()

        # Direct match or substring match if no glob characters
        if "*" not in clean_pat and "?" not in clean_pat:
            return clean_pat in clean_path

        # Standard wildcard glob match
        return fnmatch.fnmatch(clean_path, clean_pat) or fnmatch.fnmatch(clean_path, f"*{clean_pat}*")

    def evaluate_rules(
        self,
        rules: Sequence[ArchitectureRule],
        edges: Sequence[dict[str, Any]],
    ) -> list[RuleViolation]:
        """
        Evaluate all active rules against the given graph edges.
        """
        violations: list[RuleViolation] = []

        for rule in rules:
            if not getattr(rule, "is_active", True):
                continue

            rule_type = getattr(rule, "rule_type", "disallow_dependency")
            src_pat = getattr(rule, "source_pattern", "")
            tgt_pat = getattr(rule, "target_pattern", "")
            rule_name = getattr(rule, "name", "Boundary Rule")
            severity = getattr(rule, "severity", "critical")
            rationale = getattr(rule, "rationale", "Violates defined boundary constraint.")
            rule_id = getattr(rule, "id", None)

            if rule_type == "disallow_dependency":
                for edge in edges:
                    source = str(edge.get("source", ""))
                    target = str(edge.get("target", ""))

                    if self._matches_pattern(source, src_pat) and self._matches_pattern(target, tgt_pat):
                        violations.append(
                            RuleViolation(
                                rule_id=rule_id,
                                rule_name=rule_name,
                                source_component=source,
                                target_component=target,
                                severity=severity,
                                rationale=rationale,
                                suggested_fix=(
                                    f"Decouple `{source}` from `{target}`. Route requests through "
                                    f"an abstraction interface or asynchronous domain event."
                                ),
                            )
                        )

            elif rule_type == "require_interface":
                for edge in edges:
                    source = str(edge.get("source", ""))
                    target = str(edge.get("target", ""))

                    if self._matches_pattern(source, src_pat) and self._matches_pattern(target, tgt_pat):
                        # Verify target filename or symbol indicates an interface
                        target_name = target.split("/")[-1].split(".")[-1]
                        is_interface = (
                            target_name.startswith("I")
                            or "interface" in target.lower()
                            or "port" in target.lower()
                            or "facade" in target.lower()
                        )
                        if not is_interface:
                            violations.append(
                                RuleViolation(
                                    rule_id=rule_id,
                                    rule_name=rule_name,
                                    source_component=source,
                                    target_component=target,
                                    severity=severity,
                                    rationale=f"Direct dependency on concrete implementation. {rationale}",
                                    suggested_fix=f"Extract and depend on an interface/port for `{target}`.",
                                )
                            )

        return violations

    def evaluate_quality_gate(
        self,
        rules: Sequence[ArchitectureRule],
        edges: Sequence[dict[str, Any]],
        cycles_count: int,
        health_score: float,
        min_health_threshold: float = 70.0,
    ) -> QualityGateResult:
        """
        Produce a strict Quality Gate verdict for merge readiness and CI/CD pipelines.
        """
        violations = self.evaluate_rules(rules, edges)
        critical_count = sum(1 for v in violations if v.severity == "critical")
        warning_count = sum(1 for v in violations if v.severity != "critical")

        # Failure conditions: Any critical violation, any circular dependency cycle, or score below threshold
        has_critical = critical_count > 0
        has_cycles = cycles_count > 0
        score_failed = health_score < min_health_threshold

        passed = not (has_critical or has_cycles or score_failed)

        failure_reasons: list[str] = []
        if has_critical:
            failure_reasons.append(f"{critical_count} critical boundary rule violation(s)")
        if has_cycles:
            failure_reasons.append(f"{cycles_count} circular dependency loop(s)")
        if score_failed:
            failure_reasons.append(
                f"Architecture health score {health_score:.1f}% is below threshold {min_health_threshold:.1f}%"
            )

        if passed:
            summary = (
                f"✅ Quality Gate Passed: Architecture score is {health_score:.1f}%, "
                f"zero critical boundary violations, and zero circular dependency loops."
            )
        else:
            summary = f"🚨 Quality Gate Failed: " + "; ".join(failure_reasons) + "."

        return QualityGateResult(
            passed=passed,
            status="PASSED" if passed else "FAILED",
            violations=violations,
            critical_violations_count=critical_count,
            warning_violations_count=warning_count,
            circular_dependencies_count=cycles_count,
            health_score=round(health_score, 1),
            summary=summary,
        )
