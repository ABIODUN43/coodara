"""
Multi-Turn Intent & Reference Resolver for Coodara AI Chat.

Resolves conversational state, pronoun references, and 25+ distinct architectural intents
with explicit entity resolution and priority ordering.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from enum import StrEnum
from typing import Sequence

from app.schemas.chat import ChatMessageHistoryItem


class ChatIntent(StrEnum):
    """Classified user intent across 25+ architectural dimensions."""

    # 1. System Overview & Reconstruction
    ARCHITECTURE_RECONSTRUCTION = "architecture_reconstruction"
    EXPLAIN_STRUCTURE = "explain_structure"
    TECHNOLOGY_STACK = "technology_stack"
    GENERAL_ARCHITECTURE = "general_architecture"
    SYSTEM_CAPABILITIES = "system_capabilities"
    PORTFOLIO_STATS = "portfolio_stats"

    # 2. Execution & Data/Message Flows
    TRACE_REQUEST_FLOW = "trace_request_flow"
    TRACE_DATA_FLOW = "trace_data_flow"
    TRACE_MESSAGE_FLOW = "trace_message_flow"

    # 3. Dependencies & Graph Topology
    TRACE_DEPENDENCY = "trace_dependency"
    ANALYZE_COUPLING = "analyze_coupling"
    CENTRALITY_ANALYSIS = "centrality_analysis"
    MODULE_IMPORTANCE = "module_importance"
    DETECT_CYCLES = "detect_cycles"
    ARCHITECTURAL_BOUNDARY = "architectural_boundary"

    # 4. Risk & Blast Radius Simulation
    SIMULATE_CHANGE = "simulate_change"
    BLAST_RADIUS = "blast_radius"
    FAILURE_ANALYSIS = "failure_analysis"
    REFACTORING_ROADMAP = "refactoring_roadmap"

    # 5. Architecture Memory & Rules
    SAVE_MEMORY_DECISION = "save_memory_decision"
    RETRIEVE_ADR = "retrieve_adr"
    DETECT_DRIFT = "detect_drift"
    AUDIT_ARCHITECTURE_RULES = "audit_architecture_rules"
    EXPLAIN_WHY = "explain_why"

    # 6. Deep Code & Symbol Inspection
    SYMBOL_INSPECTION = "symbol_inspection"
    SEARCH_CONCEPTS = "search_concepts"
    GENERATE_CODE_PATCH = "generate_code_patch"


@dataclass(frozen=True)
class ResolvedChatQuery:
    """Resolved query with entity target and classified architectural intent."""

    original_query: str
    cleaned_query: str
    intent: ChatIntent
    target_component: str | None
    referenced_source: str | None
    referenced_target: str | None
    resolved_entity_name: str | None
    is_follow_up: bool
    is_compound_intervention: bool = False
    intervention_hint: str | None = None
    requires_coordinator_resolution: bool = False


class ChatIntentResolver:
    """
    Resolver for user intent, multi-turn references, and target entities.
    """

    PRONOUNS = {"it", "this", "that", "this service", "that service", "this module", "that module", "this component", "the cycle", "the invariant", "the rule"}

    def resolve(
        self,
        *,
        query: str,
        conversation_history: Sequence[ChatMessageHistoryItem] | None = None,
        known_components: Sequence[str] | None = None,
    ) -> ResolvedChatQuery:
        """
        Analyze current query against conversational history to identify intent and target entity.
        """
        q_clean = query.strip()
        q_lower = q_clean.lower()
        known = [c.strip() for c in (known_components or []) if c.strip()]

        # 1. Check for explicit entity mention
        target_component = self._extract_explicit_entity(q_clean, known)
        is_follow_up = False

        # 2. Check pronouns if entity missing
        if not target_component and conversation_history:
            target_component = self._resolve_from_history(conversation_history, known)
            if target_component:
                is_follow_up = True

        # 3. Path tracing resolution (only if not a request flow query)
        if "request flow" in q_lower or "request pipeline" in q_lower or "trace the request" in q_lower or "message lifecycle" in q_lower:
            ref_source, ref_target = None, None
        else:
            ref_source, ref_target = self._extract_dependency_pair(q_clean, known)

        # 4. Classify intent
        intent = self._classify_intent(q_lower, target_component, ref_source, ref_target)

        # 5. Detect compound interventions and coordinator requests
        is_compound = ("remove" in q_lower and "refactor" in q_lower)
        requires_coord = any(
            k in q_lower
            for k in (
                "highest-coupling coordinator",
                "highest coupling coordinator",
                "highest coupling",
                "highest-coupling",
                "coordinator",
            )
        )

        hint = None
        if is_compound:
            hint = "remove_or_refactor"
        elif "compatible refactor" in q_lower or "internal refactor" in q_lower or "contract unchanged" in q_lower:
            hint = "compatible_refactor"
        elif "breaking refactor" in q_lower or "breaking change" in q_lower or "change contract" in q_lower:
            hint = "breaking_refactor"
        elif "remove" in q_lower or "delete" in q_lower:
            hint = "remove"
        elif "refactor" in q_lower:
            hint = "refactor"

        return ResolvedChatQuery(
            original_query=query,
            cleaned_query=q_clean,
            intent=intent,
            target_component=target_component,
            referenced_source=ref_source,
            referenced_target=ref_target,
            resolved_entity_name=target_component,
            is_follow_up=is_follow_up,
            is_compound_intervention=is_compound,
            intervention_hint=hint,
            requires_coordinator_resolution=requires_coord,
        )

    def _extract_explicit_entity(self, text: str, known: list[str]) -> str | None:
        # Check against known components
        for comp in known:
            if re.search(rf"\b{re.escape(comp)}\b", text, re.IGNORECASE):
                return comp

        # Check backticked tokens like `ReplicaManager` or `architecture-service`
        backticked = re.findall(r"`([^`]+)`", text)
        if backticked:
            return backticked[0]

        # Check kebab-case or PascalCase component names
        kebab_match = re.search(r"\b([a-z0-9_-]+(?:service|controller|router|module|manager|repository|adapter|engine))\b", text, re.IGNORECASE)
        if kebab_match:
            return kebab_match.group(1)

        # Check CamelCase class names like ReplicaManager, KafkaApis, UnifiedLog, SocketServer
        match = re.search(r"\b([A-Z][A-Za-z0-9_]+(?:Manager|Server|Apis|Log|Channel|Coordinator|Service|Controller|Router|Module|Repository|Adapter|Engine|Client|Partition))\b", text)
        if match:
            return match.group(1)

        pascal_match = re.search(r"\b([A-Z][a-z0-9]+[A-Z][A-Za-z0-9]+)\b", text)
        if pascal_match and pascal_match.group(1) not in {"Coodara", "FastAPI", "PostgreSQL", "Docker", "Apache", "Kafka"}:
            return pascal_match.group(1)

        return None

    def _extract_dependency_pair(self, text: str, known: list[str]) -> tuple[str | None, str | None]:
        patterns = [
            r"(?:from|between)\s+([A-Za-z0-9_\-./]+)\s+(?:to|and)\s+([A-Za-z0-9_\-./]+)",
            r"([A-Za-z0-9_\-./]+)\s+(?:->|-->|depends on|calls|connects to)\s+([A-Za-z0-9_\-./]+)",
        ]
        for pat in patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                return m.group(1), m.group(2)
        return None, None

    def _resolve_from_history(self, history: Sequence[ChatMessageHistoryItem], known: list[str]) -> str | None:
        # Prioritize previous user turns first to capture the user's focus entity
        for item in reversed(history):
            if item.role == "user":
                content = item.content
                for comp in known:
                    if re.search(rf"\b{re.escape(comp)}\b", content, re.IGNORECASE):
                        return comp
                backticked = re.findall(r"`([^`]+)`", content)
                if backticked:
                    return backticked[0]
                kebab_match = re.search(r"\b([a-z0-9_-]+(?:service|controller|router|module|manager|repository|adapter|engine))\b", content, re.IGNORECASE)
                if kebab_match:
                    return kebab_match.group(1)

        for item in reversed(history):
            content = item.content
            for comp in known:
                if re.search(rf"\b{re.escape(comp)}\b", content, re.IGNORECASE):
                    return comp
            backticked = re.findall(r"`([^`]+)`", content)
            if backticked:
                return backticked[0]
            kebab_match = re.search(r"\b([a-z0-9_-]+(?:service|controller|router|module|manager|repository|adapter|engine))\b", content, re.IGNORECASE)
            if kebab_match:
                return kebab_match.group(1)
        return None

    def _classify_intent(
        self,
        q_lower: str,
        target_component: str | None,
        ref_source: str | None,
        ref_target: str | None,
    ) -> ChatIntent:
        """
        Classify intent with strict priority ordering to avoid misclassification.
        """
        # 1. System capabilities
        if any(w in q_lower for w in ["capacity", "what you can do", "what can you do", "capabilities", "what are you"]):
            return ChatIntent.SYSTEM_CAPABILITIES

        # 2. Portfolio overview & count
        if any(w in q_lower for w in ["how many repo", "analyzed repo", "portfolio", "across organization", "all repo"]):
            return ChatIntent.PORTFOLIO_STATS

        # 3. Flow tracing (e.g., message lifecycle, producer to consumer, request flow)
        if (
            "request flow" in q_lower
            or "request pipeline" in q_lower
            or "trace the request" in q_lower
            or "trace request" in q_lower
            or "trace execution" in q_lower
            or "message lifecycle" in q_lower
            or "producer to consumer" in q_lower
            or "trace message" in q_lower
            or "trace a message" in q_lower
            or "message travel" in q_lower
            or "request travel" in q_lower
            or "data flow" in q_lower
        ):
            if "request" in q_lower:
                return ChatIntent.TRACE_REQUEST_FLOW
            if "message" in q_lower or "producer" in q_lower:
                return ChatIntent.TRACE_MESSAGE_FLOW
            return ChatIntent.TRACE_DATA_FLOW

        # 4. Architecture Memory & ADR recording
        if any(w in q_lower for w in ["save this decision", "record this decision", "remember this", "save invariant", "record architecture rule", "save decision"]):
            return ChatIntent.SAVE_MEMORY_DECISION

        # 5. Drift & Invariant Violation Audit
        if any(w in q_lower for w in ["drift", "violate", "violating", "architectural drift", "conformance", "check drift"]):
            return ChatIntent.DETECT_DRIFT

        # 6. Architecture Rules & Invariants
        if any(w in q_lower for w in ["architectural invariant", "architecture rule", "fitness rule", "archunit", "domain purity", "hexagonal"]):
            return ChatIntent.AUDIT_ARCHITECTURE_RULES

        # 7. Retrieve ADRs / Decisions
        if any(w in q_lower for w in ["what decisions", "recorded adr", "recorded decision", "show memory", "list adr", "list decisions", "(adrs)", "architectural decisions (adrs)"]):
            return ChatIntent.RETRIEVE_ADR

        # 8. Refactoring Roadmap / Fix It
        if any(w in q_lower for w in ["fix it", "how can i fix", "refactoring roadmap", "how to decouple", "remediation"]):
            return ChatIntent.REFACTORING_ROADMAP

        # 9. Failure Analysis & SPOF
        if any(w in q_lower for w in ["failure", "single point of failure", "spof", "controller fails", "unavailable", "failure propagation", "failure boundary", "failure domain"]):
            return ChatIntent.FAILURE_ANALYSIS

        # 10. Blast Radius & Change Simulation
        if (
            any(w in q_lower for w in ["blast radius", "what happens if", "if i remove", "if i change", "impact of changing", "simulate change", "what happens if i remove"])
            or ("remove" in q_lower and target_component)
        ):
            return ChatIntent.SIMULATE_CHANGE

        # 11. Centrality & Module Importance
        if any(w in q_lower for w in ["most important", "which modules are most important", "critical components", "central component", "most central", "centrality", "highest centrality", "important components", "core components"]):
            return ChatIntent.MODULE_IMPORTANCE

        # 12. Structure & Boundaries
        if any(w in q_lower for w in ["explain the module dependency structure", "how services connect", "structure", "architecture breakdown", "how is this system structured"]):
            return ChatIntent.EXPLAIN_STRUCTURE

        # 13. Coupling Analysis
        if any(w in q_lower for w in ["coupling", "fan-in", "fan-out", "afferent", "efferent", "instability", "hotspot", "high coupling"]):
            return ChatIntent.ANALYZE_COUPLING

        # 14. Circular Dependencies
        if any(w in q_lower for w in ["circular dependency", "circular dependencies", "detect cycle", "cycles", "tarjan", "scc"]):
            return ChatIntent.DETECT_CYCLES

        # 15. Architecture Reconstruction & Subsystems
        if any(w in q_lower for w in ["reconstruct", "architectural overview", "subsystems", "major subsystems", "what is this system made of"]):
            return ChatIntent.ARCHITECTURE_RECONSTRUCTION

        # 16. Architectural Boundaries & Layers
        if any(w in q_lower for w in ["boundary", "boundaries", "architectural layers", "layers", "isolation"]):
            return ChatIntent.ARCHITECTURAL_BOUNDARY

        # 16. Semantic Concept Search
        if any(w in q_lower for w in ["where is", "implemented", "find concept", "search for", "rate limiting", "jwt", "auth"]):
            return ChatIntent.SEARCH_CONCEPTS

        # 17. Symbol Inspection
        if any(w in q_lower for w in ["symbol definition", "callers", "callees", "method signature", "class definition", "symbol"]):
            return ChatIntent.SYMBOL_INSPECTION

        # 18. Technology Stack
        if any(w in q_lower for w in ["tech stack", "technologies", "libraries", "frameworks", "language", "frameworks and technologies"]):
            return ChatIntent.TECHNOLOGY_STACK

        # 18. Architecture Rationale
        if any(w in q_lower for w in ["why was", "why is", "rationale", "trade-off", "tradeoff"]):
            return ChatIntent.EXPLAIN_WHY

        # 19. Dependency Tracing between specific pairs
        if (ref_source and ref_target) or ("how does" in q_lower and "connect" in q_lower):
            return ChatIntent.TRACE_DEPENDENCY

        # 20. Code Patch & Refactoring
        if any(w in q_lower for w in ["refactor", "generate patch", "code patch", "fix cycle", "extract interface"]):
            return ChatIntent.GENERATE_CODE_PATCH

        return ChatIntent.GENERAL_ARCHITECTURE
