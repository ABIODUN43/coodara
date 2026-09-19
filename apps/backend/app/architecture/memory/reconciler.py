"""
Architecture Memory Reconciliation Engine for Coodara V2.

Compares a newly generated ArchitectureSnapshot and AnalysisResult against the
accumulated ArchitectureMemory to detect:
1. Component Additions / Removals.
2. Structural Relationship / Dependency changes.
3. Technology stack additions, removals, and upgrades.
4. Newly detected and resolved architectural issues.
5. Overall score deltas.
6. Synthesizes provenance-tracked ArchitectureMemoryEntry knowledge items.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from app.models.analysis import AnalysisResult
from app.models.architecture import ArchitectureSnapshot
from app.models.memory import (
    ArchitectureComponent,
    ArchitectureEvent,
    ArchitectureEventType,
    ArchitectureMemory,
    ArchitectureMemoryEntry,
    ArchitectureRelationship,
    ArchitectureTechnologyMemory,
    ComponentStatus,
    MemoryType,
)


@dataclass(frozen=True)
class ReconciliationResult:
    """
    Output of memory reconciliation containing mutated memory entities and new events.
    """

    new_events: list[ArchitectureEvent]
    new_entries: list[ArchitectureMemoryEntry]


class ArchitectureMemoryReconciler:
    """
    Pure domain reconciler comparing analysis snapshots with accumulated memory.
    """

    def reconcile(
        self,
        *,
        memory: ArchitectureMemory,
        snapshot: ArchitectureSnapshot,
        analysis_result: AnalysisResult,
        previous_snapshot: ArchitectureSnapshot | None = None,
        analysis_id: int,
    ) -> ReconciliationResult:
        """
        Perform bidirectional diff between new snapshot and memory.
        """
        events: list[ArchitectureEvent] = []
        entries: list[ArchitectureMemoryEntry] = []

        organization_id = memory.organization_id
        repository_id = memory.repository_id

        # 1. Parse Graph Nodes and Edges
        graph_dict = self._parse_graph(snapshot.graph)
        current_node_ids = {n.get("id") for n in graph_dict.get("nodes", []) if n.get("id")}
        current_edges = [
            (e.get("source"), e.get("target"), e.get("kind", "depends_on"))
            for e in graph_dict.get("edges", [])
            if e.get("source") and e.get("target")
        ]

        # ----------------------------------------------------
        # 2. Components Reconciliation
        # ----------------------------------------------------
        existing_components_by_name = {c.name: c for c in memory.components}

        # Handle added or reactivated components
        for node_info in graph_dict.get("nodes", []):
            name = node_info.get("id")
            if not name:
                continue

            comp_type = node_info.get("type", "module")

            if name not in existing_components_by_name:
                comp = ArchitectureComponent(
                    memory_id=memory.id,
                    name=name,
                    component_type=comp_type,
                    status=ComponentStatus.ACTIVE,
                    first_seen_analysis_id=analysis_id,
                    last_seen_analysis_id=analysis_id,
                )
                memory.components.append(comp)
                existing_components_by_name[name] = comp

                events.append(
                    ArchitectureEvent(
                        organization_id=organization_id,
                        repository_id=repository_id,
                        analysis_id=analysis_id,
                        event_type=ArchitectureEventType.COMPONENT_ADDED,
                        title=f"Component Discovered: {name}",
                        description=f"New {comp_type} component '{name}' discovered in architecture graph.",
                        details=json.dumps({"component": name, "type": comp_type}),
                    )
                )
            else:
                existing_comp = existing_components_by_name[name]
                if existing_comp.status == ComponentStatus.REMOVED:
                    existing_comp.status = ComponentStatus.ACTIVE
                    existing_comp.last_seen_analysis_id = analysis_id
                    events.append(
                        ArchitectureEvent(
                            organization_id=organization_id,
                            repository_id=repository_id,
                            analysis_id=analysis_id,
                            event_type=ArchitectureEventType.COMPONENT_ADDED,
                            title=f"Component Reintroduced: {name}",
                            description=f"Previously removed component '{name}' was re-detected in codebase.",
                            details=json.dumps({"component": name, "type": comp_type}),
                        )
                    )
                else:
                    existing_comp.last_seen_analysis_id = analysis_id

        # Handle removed components
        for name, comp in existing_components_by_name.items():
            if comp.status == ComponentStatus.ACTIVE and name not in current_node_ids:
                comp.status = ComponentStatus.REMOVED
                comp.last_seen_analysis_id = analysis_id
                events.append(
                    ArchitectureEvent(
                        organization_id=organization_id,
                        repository_id=repository_id,
                        analysis_id=analysis_id,
                        event_type=ArchitectureEventType.COMPONENT_REMOVED,
                        title=f"Component Removed: {name}",
                        description=f"Component '{name}' is no longer present in repository architecture.",
                        details=json.dumps({"component": name, "type": comp.component_type}),
                    )
                )

        # ----------------------------------------------------
        # 3. Technologies Reconciliation
        # ----------------------------------------------------
        current_techs = {t.technology: t for t in analysis_result.technologies}
        existing_techs_by_name = {t.technology: t for t in memory.technologies}

        for tech_name, tech_snapshot in current_techs.items():
            if tech_name not in existing_techs_by_name:
                tech_mem = ArchitectureTechnologyMemory(
                    memory_id=memory.id,
                    technology=tech_name,
                    version=tech_snapshot.version,
                    status=ComponentStatus.ACTIVE,
                    first_seen_analysis_id=analysis_id,
                    last_seen_analysis_id=analysis_id,
                )
                memory.technologies.append(tech_mem)
                existing_techs_by_name[tech_name] = tech_mem

                events.append(
                    ArchitectureEvent(
                        organization_id=organization_id,
                        repository_id=repository_id,
                        analysis_id=analysis_id,
                        event_type=ArchitectureEventType.TECHNOLOGY_ADDED,
                        title=f"Technology Detected: {tech_name}",
                        description=f"Discovered '{tech_name}' ({tech_snapshot.version or 'latest'}) in project manifests.",
                        details=json.dumps({"technology": tech_name, "version": tech_snapshot.version}),
                    )
                )
            else:
                existing_tech = existing_techs_by_name[tech_name]
                if existing_tech.status == ComponentStatus.REMOVED:
                    existing_tech.status = ComponentStatus.ACTIVE
                    existing_tech.version = tech_snapshot.version
                    existing_tech.last_seen_analysis_id = analysis_id
                    events.append(
                        ArchitectureEvent(
                            organization_id=organization_id,
                            repository_id=repository_id,
                            analysis_id=analysis_id,
                            event_type=ArchitectureEventType.TECHNOLOGY_ADDED,
                            title=f"Technology Re-added: {tech_name}",
                            description=f"Technology '{tech_name}' re-detected in project.",
                            details=json.dumps({"technology": tech_name, "version": tech_snapshot.version}),
                        )
                    )
                elif existing_tech.version != tech_snapshot.version and tech_snapshot.version:
                    old_ver = existing_tech.version
                    new_ver = tech_snapshot.version
                    existing_tech.version = new_ver
                    existing_tech.status = ComponentStatus.UPGRADED
                    existing_tech.last_seen_analysis_id = analysis_id
                    events.append(
                        ArchitectureEvent(
                            organization_id=organization_id,
                            repository_id=repository_id,
                            analysis_id=analysis_id,
                            event_type=ArchitectureEventType.TECHNOLOGY_CHANGED,
                            title=f"Technology Version Changed: {tech_name}",
                            description=f"Technology '{tech_name}' updated from {old_ver or 'unknown'} to {new_ver}.",
                            details=json.dumps({"technology": tech_name, "previous_version": old_ver, "new_version": new_ver}),
                        )
                    )
                else:
                    existing_tech.last_seen_analysis_id = analysis_id

        # Detect removed technologies
        for tech_name, tech_mem in existing_techs_by_name.items():
            if tech_mem.status == ComponentStatus.ACTIVE and tech_name not in current_techs:
                tech_mem.status = ComponentStatus.REMOVED
                tech_mem.last_seen_analysis_id = analysis_id
                events.append(
                    ArchitectureEvent(
                        organization_id=organization_id,
                        repository_id=repository_id,
                        analysis_id=analysis_id,
                        event_type=ArchitectureEventType.TECHNOLOGY_REMOVED,
                        title=f"Technology Removed: {tech_name}",
                        description=f"Technology '{tech_name}' is no longer used in repository manifests.",
                        details=json.dumps({"technology": tech_name}),
                    )
                )

        # ----------------------------------------------------
        # 4. Architectural Issues Reconciliation
        # ----------------------------------------------------
        current_issue_descs = {i.description: i for i in snapshot.issues}
        prev_issue_descs = {i.description: i for i in previous_snapshot.issues} if previous_snapshot else {}

        # Newly detected issues
        for desc, issue in current_issue_descs.items():
            if desc not in prev_issue_descs:
                events.append(
                    ArchitectureEvent(
                        organization_id=organization_id,
                        repository_id=repository_id,
                        analysis_id=analysis_id,
                        event_type=ArchitectureEventType.ISSUE_DETECTED,
                        title=f"Architectural Risk Detected: {issue.category}",
                        description=issue.description,
                        details=json.dumps({"severity": issue.severity, "category": issue.category}),
                    )
                )

        # Resolved issues
        for desc, prev_issue in prev_issue_descs.items():
            if desc not in current_issue_descs:
                events.append(
                    ArchitectureEvent(
                        organization_id=organization_id,
                        repository_id=repository_id,
                        analysis_id=analysis_id,
                        event_type=ArchitectureEventType.ISSUE_RESOLVED,
                        title=f"Architectural Risk Resolved: {prev_issue.category}",
                        description=f"Resolved previous {prev_issue.severity} issue: {desc}",
                        details=json.dumps({"severity": prev_issue.severity, "category": prev_issue.category}),
                    )
                )

        # ----------------------------------------------------
        # 5. Score Evolution
        # ----------------------------------------------------
        if snapshot.score is not None:
            curr_score = snapshot.score.score
            prev_score = previous_snapshot.score.score if previous_snapshot and previous_snapshot.score else None

            if prev_score is not None and abs(curr_score - prev_score) >= 0.1:
                delta = curr_score - prev_score
                direction = "improved" if delta > 0 else "declined"
                events.append(
                    ArchitectureEvent(
                        organization_id=organization_id,
                        repository_id=repository_id,
                        analysis_id=analysis_id,
                        event_type=ArchitectureEventType.SCORE_CHANGED,
                        title=f"Architecture Health Score {direction.capitalize()}: {curr_score:.1f}",
                        description=f"Architecture health score changed from {prev_score:.1f} to {curr_score:.1f} ({delta:+.1f}).",
                        details=json.dumps({
                            "previous_score": prev_score,
                            "new_score": curr_score,
                            "delta": round(delta, 2),
                            "maintainability": snapshot.score.maintainability,
                            "coupling": snapshot.score.coupling,
                            "cohesion": snapshot.score.cohesion,
                            "complexity": snapshot.score.complexity,
                        }),
                    )
                )

        # ----------------------------------------------------
        # 6. Generate Provenance-Tracked Knowledge Entries
        # ----------------------------------------------------
        entries.extend(
            self._synthesize_knowledge_entries(
                memory_id=memory.id,
                organization_id=organization_id,
                repository_id=repository_id,
                analysis_id=analysis_id,
                snapshot=snapshot,
                analysis_result=analysis_result,
            )
        )

        for entry in entries:
            memory.entries.append(entry)

        return ReconciliationResult(
            new_events=events,
            new_entries=entries,
        )

    def _synthesize_knowledge_entries(
        self,
        *,
        memory_id: int,
        organization_id: int,
        repository_id: int,
        analysis_id: int,
        snapshot: ArchitectureSnapshot,
        analysis_result: AnalysisResult,
    ) -> list[ArchitectureMemoryEntry]:
        """
        Synthesize high-confidence architectural knowledge entries with explicit provenance.
        """
        entries: list[ArchitectureMemoryEntry] = []

        # 1. Tech Stack Knowledge Entry
        if analysis_result.technologies:
            tech_list = [f"{t.technology} ({t.version or 'latest'})" for t in analysis_result.technologies]
            entries.append(
                ArchitectureMemoryEntry(
                    memory_id=memory_id,
                    organization_id=organization_id,
                    repository_id=repository_id,
                    analysis_id=analysis_id,
                    memory_type=MemoryType.ARCHITECTURE_FACT,
                    title="Core Technology Stack",
                    content=f"The repository is built using {', '.join(tech_list)}.",
                    confidence=1.0,
                    source_analyzer="TechnologyAnalyzer",
                    source_file="package manifests",
                )
            )

        # 2. Structural Metrics & Size Fact
        if analysis_result.metrics:
            m = analysis_result.metrics
            maint_str = f"maintainability index {m.maintainability:.1f}" if m.maintainability is not None else ""
            entries.append(
                ArchitectureMemoryEntry(
                    memory_id=memory_id,
                    organization_id=organization_id,
                    repository_id=repository_id,
                    analysis_id=analysis_id,
                    memory_type=MemoryType.ARCHITECTURE_FACT,
                    title="Codebase Scale and Density",
                    content=(
                        f"Codebase consists of {m.loc:,} physical lines across {m.files} files, "
                        f"defining {m.classes} classes and {m.functions} functions. {maint_str}"
                    ).strip(),
                    confidence=1.0,
                    source_analyzer="MetricsAnalyzer",
                    source_file="AST scan",
                )
            )

        # 3. Architecture Issues & Risks
        for issue in snapshot.issues:
            entries.append(
                ArchitectureMemoryEntry(
                    memory_id=memory_id,
                    organization_id=organization_id,
                    repository_id=repository_id,
                    analysis_id=analysis_id,
                    memory_type=MemoryType.ARCHITECTURE_ISSUE,
                    title=f"Architectural Risk: {issue.category} ({issue.severity.upper()})",
                    content=issue.description,
                    confidence=0.95,
                    source_analyzer="ArchitectureAnalyzer",
                    source_file="dependency graph",
                )
            )

        # 4. Refactoring Recommendations
        for rec in snapshot.recommendations:
            entries.append(
                ArchitectureMemoryEntry(
                    memory_id=memory_id,
                    organization_id=organization_id,
                    repository_id=repository_id,
                    analysis_id=analysis_id,
                    memory_type=MemoryType.ARCHITECTURE_DECISION,
                    title=f"Refactoring Blueprint ({rec.priority.upper()} Priority)",
                    content=rec.recommendation,
                    confidence=0.90,
                    source_analyzer="ArchitectureAnalyzer",
                    source_file="recommendation engine",
                )
            )

        return entries

    @staticmethod
    def _parse_graph(graph_raw: str | dict[str, Any]) -> dict[str, Any]:
        """
        Parse raw graph JSON text safely into a dictionary.
        """
        if isinstance(graph_raw, dict):
            return graph_raw
        try:
            return json.loads(graph_raw)
        except Exception:
            return {"nodes": [], "edges": []}
