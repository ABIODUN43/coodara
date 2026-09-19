"""
Architecture Query Planner for Coodara AI.

Produces structured query execution plans defining required evidence types,
graph depth, target entities, and evidence sufficiency criteria for every architectural question.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any

from app.ai.chat.intent_resolver import ChatIntent
from app.ai.evidence.models import EvidenceType


@dataclass(frozen=True)
class ArchitectureQueryPlan:
    """Execution plan for an architectural query."""

    intent: ChatIntent
    target_entity: str | None = None
    referenced_source: str | None = None
    referenced_target: str | None = None
    required_evidence_types: list[EvidenceType] = field(default_factory=list)
    target_graph_levels: list[str] = field(default_factory=lambda: ["SUBSYSTEM", "MODULE"])
    min_evidence_threshold: int = 1
    allow_inference: bool = True
    must_have_provenance: bool = True


class ArchitectureQueryPlanner:
    """
    Constructs targeted evidence retrieval and reasoning plans tailored to specific architectural intents.
    """

    def create_plan(
        self,
        *,
        intent: ChatIntent,
        target_entity: str | None = None,
        referenced_source: str | None = None,
        referenced_target: str | None = None,
    ) -> ArchitectureQueryPlan:
        """
        Build an ArchitectureQueryPlan according to the intent and entity parameters.
        """
        if intent in {ChatIntent.TRACE_REQUEST_FLOW, ChatIntent.TRACE_DATA_FLOW, ChatIntent.TRACE_MESSAGE_FLOW}:
            return ArchitectureQueryPlan(
                intent=intent,
                target_entity=target_entity,
                referenced_source=referenced_source,
                referenced_target=referenced_target,
                required_evidence_types=[EvidenceType.CALL_SITE, EvidenceType.STATIC_IMPORT, EvidenceType.MESSAGE_LIFECYCLE],
                target_graph_levels=["CALL_GRAPH", "SUBSYSTEM", "MODULE"],
                min_evidence_threshold=2,
            )

        if intent in {ChatIntent.SIMULATE_CHANGE, ChatIntent.BLAST_RADIUS}:
            return ArchitectureQueryPlan(
                intent=intent,
                target_entity=target_entity,
                required_evidence_types=[EvidenceType.CALL_SITE, EvidenceType.STATIC_IMPORT, EvidenceType.INHERITANCE],
                target_graph_levels=["SYMBOL", "CALL_GRAPH", "MODULE"],
                min_evidence_threshold=1,
            )

        if intent in {ChatIntent.CENTRALITY_ANALYSIS, ChatIntent.MODULE_IMPORTANCE}:
            return ArchitectureQueryPlan(
                intent=intent,
                target_entity=target_entity,
                required_evidence_types=[EvidenceType.STATIC_IMPORT, EvidenceType.CALL_SITE],
                target_graph_levels=["MODULE", "SUBSYSTEM", "SYMBOL"],
                min_evidence_threshold=3,
            )

        if intent in {ChatIntent.DETECT_DRIFT, ChatIntent.AUDIT_ARCHITECTURE_RULES}:
            return ArchitectureQueryPlan(
                intent=intent,
                target_entity=target_entity,
                required_evidence_types=[EvidenceType.ADR_CONSTRAINT, EvidenceType.STATIC_IMPORT],
                target_graph_levels=["MODULE", "SUBSYSTEM"],
                min_evidence_threshold=1,
            )

        if intent == ChatIntent.FAILURE_ANALYSIS:
            return ArchitectureQueryPlan(
                intent=intent,
                target_entity=target_entity,
                required_evidence_types=[EvidenceType.CALL_SITE, EvidenceType.STATIC_IMPORT],
                target_graph_levels=["SUBSYSTEM", "MODULE", "CALL_GRAPH"],
                min_evidence_threshold=2,
            )

        # Default Architecture Reconstruction / Explanation
        return ArchitectureQueryPlan(
            intent=intent,
            target_entity=target_entity,
            required_evidence_types=[EvidenceType.STATIC_IMPORT, EvidenceType.CALL_SITE],
            target_graph_levels=["SUBSYSTEM", "MODULE", "SYMBOL"],
            min_evidence_threshold=1,
        )
