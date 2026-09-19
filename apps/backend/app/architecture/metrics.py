"""
Robert C. Martin's Component & Architecture Metrics.

Calculates:
- Afferent Coupling (Ca): Number of incoming internal dependencies.
- Efferent Coupling (Ce): Number of outgoing internal dependencies.
- Instability (I = Ce / (Ca + Ce)): 0.0 (maximally stable) to 1.0 (maximally unstable).
- Abstractness (A): Ratio of abstract interfaces/classes to total classes (default 0.0).
- Normalized Distance from Main Sequence (D = |A + I - 1|).
- Hub Module Detection (Ca >= 10 and Ce >= 10).
- Stable Abstractions Principle violations (stable component depending on unstable component).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence


@dataclass(frozen=True, slots=True)
class ModuleCouplingMetric:
    """Architectural coupling and instability metric for a single module."""

    node_id: str
    ca: int
    ce: int
    instability: float
    abstractness: float
    distance: float
    is_hub: bool
    is_zone_of_pain: bool


@dataclass(frozen=True, slots=True)
class UnstableDependencyViolation:
    """A stable module depending on an unstable module (breaks Stable Dependencies Principle)."""

    source: str
    source_instability: float
    target: str
    target_instability: float


class RobertMartinMetricsEngine:
    """
    Computes Robert C. Martin package and component metrics over internal graph topology.
    """

    HUB_THRESHOLD = 10
    STABLE_THRESHOLD = 0.3
    UNSTABLE_THRESHOLD = 0.7

    def compute_metrics(
        self,
        nodes: Sequence[str],
        internal_edges: Sequence[tuple[str, str]],
    ) -> dict[str, ModuleCouplingMetric]:
        """
        Compute Ca, Ce, Instability, and Distance from Main Sequence for all nodes.
        """
        node_set = set(nodes)
        incoming: dict[str, set[str]] = {n: set() for n in nodes}
        outgoing: dict[str, set[str]] = {n: set() for n in nodes}

        for src, tgt in internal_edges:
            if src in node_set and tgt in node_set and src != tgt:
                outgoing[src].add(tgt)
                incoming[tgt].add(src)

        metrics: dict[str, ModuleCouplingMetric] = {}

        for n in sorted(node_set):
            ca = len(incoming[n])
            ce = len(outgoing[n])
            total = ca + ce
            instability = round(ce / total, 4) if total > 0 else 0.0
            # Abstractness defaults to 0.0 for general modules unless tagged
            abstractness = 0.0
            distance = round(abs(abstractness + instability - 1.0), 4)

            is_hub = (ca >= self.HUB_THRESHOLD) and (ce >= self.HUB_THRESHOLD)
            is_zone_of_pain = (distance > 0.7) and (instability < 0.2) and (ca >= self.HUB_THRESHOLD)

            metrics[n] = ModuleCouplingMetric(
                node_id=n,
                ca=ca,
                ce=ce,
                instability=instability,
                abstractness=abstractness,
                distance=distance,
                is_hub=is_hub,
                is_zone_of_pain=is_zone_of_pain,
            )

        return metrics

    def detect_unstable_dependencies(
        self,
        metrics: dict[str, ModuleCouplingMetric],
        internal_edges: Sequence[tuple[str, str]],
    ) -> list[UnstableDependencyViolation]:
        """
        Detect Stable Dependencies Principle violations:
        A module with low instability (stable) depending on a module with high instability (unstable).
        """
        violations: list[UnstableDependencyViolation] = []

        for src, tgt in internal_edges:
            if src in metrics and tgt in metrics and src != tgt:
                src_m = metrics[src]
                tgt_m = metrics[tgt]

                # Stable module depending on unstable module
                if (
                    src_m.instability <= self.STABLE_THRESHOLD
                    and tgt_m.instability >= self.UNSTABLE_THRESHOLD
                    and (src_m.ca + src_m.ce) >= 3
                ):
                    violations.append(
                        UnstableDependencyViolation(
                            source=src,
                            source_instability=src_m.instability,
                            target=tgt,
                            target_instability=tgt_m.instability,
                        )
                    )

        return violations
