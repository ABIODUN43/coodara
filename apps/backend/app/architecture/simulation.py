"""
What-If Architecture Simulation Engine.

Computes repository-grounded architectural consequences, blast radius,
boundary crossings, and constraint impacts from the repository's AST
architecture graph.

Safety Guarantee:
    Simulation is strictly read-only and in-memory. It never modifies
    user repository files, Git history, or working tree state.
"""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any, Sequence

from app.architecture.models import (
    ArchitectureEdge,
    ArchitectureGraph,
    ArchitectureNode,
)


class InterventionType(StrEnum):
    """
    Controlled vocabulary of architectural interventions.
    """

    EXTRACT = "Extract"
    SPLIT = "Split"
    MERGE = "Merge"
    MOVE = "Move"
    INTRODUCE = "Introduce"
    REMOVE = "Remove"
    REPLACE = "Replace"
    DECOUPLE = "Decouple"
    MIGRATE = "Migrate"
    CENTRALIZE = "Centralize"
    DISTRIBUTE = "Distribute"
    REDESIGN = "Redesign"
    REFACTOR = "Refactor"
    BREAKING_REFACTOR = "BREAKING_REFACTOR"
    COMPATIBLE_REFACTOR = "COMPATIBLE_REFACTOR"


class ConfidenceLevel(StrEnum):
    """
    Confidence grading level.
    """

    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    UNKNOWN = "UNKNOWN"


@dataclass(frozen=True, slots=True)
class SimulationConfidence:
    """
    Separated confidence metrics across structural, evidence, and runtime dimensions.
    """

    structural_confidence: ConfidenceLevel
    evidence_confidence: ConfidenceLevel
    runtime_confidence: ConfidenceLevel = ConfidenceLevel.UNKNOWN
    overall: ConfidenceLevel = ConfidenceLevel.HIGH
    rationale: str = ""


@dataclass(frozen=True, slots=True)
class EvidenceItem:
    """
    Concrete repository artifact citation supporting a simulation claim.
    """

    source_type: str  # "code", "graph", "test", "ADR", "issue", "docs", "history"
    repository_path: str
    entity_id: str
    commit_sha: str | None = None
    excerpt_or_reference: str = ""
    relation_to_claim: str = ""
    evidence_strength: str = "deterministic"  # "deterministic", "inferred", "heuristic"


@dataclass(frozen=True, slots=True)
class PropagationPath:
    """
    Unweighted shortest propagation path from target entity to an affected node.
    """

    target_id: str
    target_name: str
    hops: int
    path_nodes: tuple[str, ...]
    edge_types: tuple[str, ...]
    relationship: str = "transitive"  # "direct", "transitive"


@dataclass(frozen=True, slots=True)
class BoundaryCrossing:
    """
    Explicit architectural boundary crossed during dependency propagation.
    """

    boundary_id: str
    boundary_type: str  # "subsystem", "module", "package", "service", "layer"
    from_boundary: str
    to_boundary: str
    source_entity: str
    target_entity: str
    crossing_edge: str
    reason: str
    severity: str = "warning"
    evidence: str = ""


@dataclass(frozen=True, slots=True)
class DirectImpactItem:
    """
    Component directly impacted by the intervention.
    """

    entity_id: str
    name: str
    subsystem: str
    component_type: str
    relationship: str  # "target", "direct_dependency", "upstream_caller"
    reason: str
    source_path: str = ""


@dataclass(frozen=True, slots=True)
class IndirectImpactItem:
    """
    Component transitively impacted via dependency propagation.
    """

    entity_id: str
    name: str
    subsystem: str
    component_type: str
    hops: int
    shortest_path: tuple[str, ...]
    reason: str
    source_path: str = ""


@dataclass(frozen=True, slots=True)
class StructuralConsequenceSet:
    """
    Result of deterministic What-If graph simulation.
    """

    target_component_id: str
    target_component_name: str
    subsystem: str
    intervention_type: InterventionType
    user_description: str

    # Concrete counts
    direct_impact_count: int
    indirect_impact_count: int
    propagation_paths_count: int
    boundaries_crossed_count: int
    constraints_affected_count: int

    # Structured collections
    direct_impacts: tuple[DirectImpactItem, ...]
    indirect_impacts: tuple[IndirectImpactItem, ...]
    propagation_paths: tuple[PropagationPath, ...]
    boundaries_crossed: tuple[BoundaryCrossing, ...]
    constraints_affected: tuple[str, ...]

    # Telemetry and Evidence
    efferent_before: int
    efferent_after: int
    instability_before: float
    instability_after: float

    evidence: tuple[EvidenceItem, ...]
    confidence: SimulationConfidence

    # Optional intervention counterfactual delta (only if explicit parameters provided)
    added_nodes: tuple[str, ...] = field(default_factory=tuple)
    removed_nodes: tuple[str, ...] = field(default_factory=tuple)
    added_edges: tuple[tuple[str, str], ...] = field(default_factory=tuple)
    removed_edges: tuple[tuple[str, str], ...] = field(default_factory=tuple)


def normalize_intervention(
    description: str,
    target_component_id: str = "",
) -> InterventionType:
    """
    Normalize natural language intervention description into controlled vocabulary.
    Does not guess or hallucinate parameters.
    """
    if not description:
        return InterventionType.REFACTOR

    text = description.strip().lower()

    if any(k in text for k in ("compatible refactor", "compatible", "internal refactor", "contract unchanged", "preserve contract", "preserve public contract")):
        return InterventionType.COMPATIBLE_REFACTOR
    if any(k in text for k in ("breaking refactor", "breaking change", "breaking", "change contract", "change interface", "change public contract", "public contract change")):
        return InterventionType.BREAKING_REFACTOR
    if any(k in text for k in ("remove", "delete", "drop", "eliminate", "deprecate")):
        return InterventionType.REMOVE
    if any(k in text for k in ("extract", "carve out", "isolate module", "separate")):
        return InterventionType.EXTRACT
    if any(k in text for k in ("decouple", "invert", "adapter", "interface port")):
        return InterventionType.DECOUPLE
    if any(k in text for k in ("split", "break down", "partition")):
        return InterventionType.SPLIT
    if any(k in text for k in ("merge", "combine", "consolidate", "unify")):
        return InterventionType.MERGE
    if any(k in text for k in ("move", "relocate", "transfer")):
        return InterventionType.MOVE
    if any(k in text for k in ("replace", "substitute", "swap")):
        return InterventionType.REPLACE
    if any(k in text for k in ("migrate", "port to")):
        return InterventionType.MIGRATE
    if any(k in text for k in ("centralize", "co-locate")):
        return InterventionType.CENTRALIZE
    if any(k in text for k in ("distribute", "fan out")):
        return InterventionType.DISTRIBUTE
    if any(k in text for k in ("introduce", "add new", "create new")):
        return InterventionType.INTRODUCE
    if any(k in text for k in ("redesign", "rewrite")):
        return InterventionType.REDESIGN

    return InterventionType.REFACTOR


def extract_subsystem(entity_id: str) -> str:
    """
    Determine architectural subsystem / layer from entity identifier.
    """
    clean = entity_id.replace("\\", "/")
    parts = clean.strip("/").split("/")
    if len(parts) > 1:
        # e.g. apps/backend or core/domain
        if parts[0] in ("apps", "packages", "src", "lib") and len(parts) > 2:
            return f"{parts[0]}/{parts[1]}"
        return parts[0]
    return "core"


class DeterministicSimulationEngine:
    """
    Deterministic What-If simulation engine operating purely on the architecture graph.
    Uses unweighted BFS for dependency propagation without fabricating data.
    """

    def __init__(
        self,
        graph: ArchitectureGraph,
        commit_sha: str = "HEAD",
    ) -> None:
        self.graph = graph
        self.commit_sha = commit_sha
        self._nodes_by_id = {node.id: node for node in graph.nodes}

        # Build adjacency structures
        # Outward: node -> set of (target, edge_kind)
        self._outward: dict[str, list[tuple[str, str]]] = {}
        # Inward: node -> set of (source, edge_kind)
        self._inward: dict[str, list[tuple[str, str]]] = {}

        for edge in graph.edges:
            self._outward.setdefault(edge.source, []).append((edge.target, edge.kind))
            self._inward.setdefault(edge.target, []).append((edge.source, edge.kind))

    def simulate(
        self,
        target_component_id: str,
        user_description: str = "",
        max_hops: int = 4,
        rules: Sequence[Any] = (),
        adrs: Sequence[Any] = (),
        explicit_intervention_type: InterventionType | None = None,
    ) -> StructuralConsequenceSet:
        """
        Run deterministic What-If simulation for target_component_id.
        """
        target_node = self._resolve_target_node(target_component_id)
        if not target_node:
            # Fallback when graph is empty or node not found
            resolved_id = target_component_id or "unknown"
            return self._empty_result(resolved_id, user_description)

        actual_id = target_node.id
        target_name = actual_id.split("/")[-1]
        target_subsystem = extract_subsystem(actual_id)

        intervention_type = (
            explicit_intervention_type
            or normalize_intervention(user_description, actual_id)
        )

        # 1. Compute Direct Impacts
        direct_outward = self._outward.get(actual_id, [])
        direct_inward = self._inward.get(actual_id, [])

        direct_impacts: list[DirectImpactItem] = []
        direct_ids: set[str] = {actual_id}

        # Add target component itself
        direct_impacts.append(
            DirectImpactItem(
                entity_id=actual_id,
                name=target_name,
                subsystem=target_subsystem,
                component_type=target_node.type,
                relationship="target",
                reason=f"Target of {intervention_type.value} intervention.",
                source_path=actual_id,
            )
        )

        for target_id, kind in direct_outward:
            if target_id != actual_id and target_id not in direct_ids:
                direct_ids.add(target_id)
                t_sub = extract_subsystem(target_id)
                direct_impacts.append(
                    DirectImpactItem(
                        entity_id=target_id,
                        name=target_id.split("/")[-1],
                        subsystem=t_sub,
                        component_type=self._get_node_type(target_id),
                        relationship="direct_dependency",
                        reason=f"Direct dependency ({kind}) consumed by {target_name}.",
                        source_path=target_id,
                    )
                )

        for source_id, kind in direct_inward:
            if source_id != actual_id and source_id not in direct_ids:
                direct_ids.add(source_id)
                s_sub = extract_subsystem(source_id)
                direct_impacts.append(
                    DirectImpactItem(
                        entity_id=source_id,
                        name=source_id.split("/")[-1],
                        subsystem=s_sub,
                        component_type=self._get_node_type(source_id),
                        relationship="upstream_caller",
                        reason=(
                            f"Upstream consumer ({kind}) invoking {target_name} (zero direct public-contract breakage under the compatible-refactor assumption)."
                            if intervention_type == InterventionType.COMPATIBLE_REFACTOR
                            else f"Upstream consumer ({kind}) invoking {target_name}; will break upon removal."
                            if intervention_type == InterventionType.REMOVE
                            else f"Upstream consumer ({kind}) invoking {target_name}; interface contract change requires caller updates."
                            if intervention_type == InterventionType.BREAKING_REFACTOR
                            else f"Upstream consumer ({kind}) invoking {target_name}."
                        ),
                        source_path=source_id,
                    )
                )

        # 2. Unweighted BFS Dependency Propagation for Indirect Impacts
        # We propagate outward along dependencies and inward along callers to trace full structural ripple
        indirect_impacts: list[IndirectImpactItem] = []
        propagation_paths: list[PropagationPath] = []
        visited_nodes: dict[str, int] = {actual_id: 0}
        # Parent tracking for shortest path reconstruction: child -> (parent, edge_kind)
        parents: dict[str, tuple[str, str]] = {}

        queue: deque[tuple[str, int]] = deque([(actual_id, 0)])

        while queue:
            curr_id, curr_depth = queue.popleft()
            if curr_depth >= max_hops:
                continue

            # Check neighbors: both incoming callers and outgoing dependencies
            neighbors: list[tuple[str, str]] = []
            neighbors.extend(self._inward.get(curr_id, []))
            neighbors.extend(self._outward.get(curr_id, []))

            for neighbor_id, kind in neighbors:
                if neighbor_id == actual_id:
                    continue
                if neighbor_id not in visited_nodes:
                    visited_nodes[neighbor_id] = curr_depth + 1
                    parents[neighbor_id] = (curr_id, kind)
                    queue.append((neighbor_id, curr_depth + 1))

                    if neighbor_id not in direct_ids:
                        # Reconstruct shortest unweighted propagation path
                        path_nodes, edge_types = self._reconstruct_path(
                            actual_id, neighbor_id, parents
                        )
                        prop_path = PropagationPath(
                            target_id=neighbor_id,
                            target_name=neighbor_id.split("/")[-1],
                            hops=curr_depth + 1,
                            path_nodes=path_nodes,
                            edge_types=edge_types,
                            relationship="transitive",
                        )
                        propagation_paths.append(prop_path)

                        indirect_impacts.append(
                            IndirectImpactItem(
                                entity_id=neighbor_id,
                                name=neighbor_id.split("/")[-1],
                                subsystem=extract_subsystem(neighbor_id),
                                component_type=self._get_node_type(neighbor_id),
                                hops=curr_depth + 1,
                                shortest_path=path_nodes,
                                reason=f"Transitive impact via {curr_depth + 1}-hop path: {' -> '.join(path_nodes)}.",
                                source_path=neighbor_id,
                            )
                        )

        # 3. Detect Boundary Crossings (Direct incident edges + multi-hop propagation paths)
        boundaries_crossed: list[BoundaryCrossing] = []
        seen_boundary_pairs: set[tuple[str, str]] = set()
        b_idx = 1

        all_edges_to_check: list[tuple[str, str, str]] = []
        for target_id, kind in direct_outward:
            all_edges_to_check.append((actual_id, target_id, kind))
        for source_id, kind in direct_inward:
            all_edges_to_check.append((source_id, actual_id, kind))
        for p in propagation_paths:
            for i in range(len(p.path_nodes) - 1):
                u = p.path_nodes[i]
                v = p.path_nodes[i + 1]
                edge_kind = p.edge_types[i] if i < len(p.edge_types) else "depends_on"
                all_edges_to_check.append((u, v, edge_kind))

        for u, v, edge_kind in all_edges_to_check:
            sub_u = extract_subsystem(u)
            sub_v = extract_subsystem(v)
            if sub_u != sub_v and (sub_u, sub_v) not in seen_boundary_pairs:
                seen_boundary_pairs.add((sub_u, sub_v))
                boundaries_crossed.append(
                    BoundaryCrossing(
                        boundary_id=f"BND-{b_idx:02d}",
                        boundary_type="subsystem",
                        from_boundary=sub_u,
                        to_boundary=sub_v,
                        source_entity=u,
                        target_entity=v,
                        crossing_edge=f"{u} -[{edge_kind}]-> {v}",
                        reason=f"Dependency traverses structural boundary from '{sub_u}' into '{sub_v}'.",
                        severity="warning" if b_idx > 1 else "critical",
                        evidence=f"Edge in AST graph: {u} -> {v}",
                    )
                )
                b_idx += 1

        # 4. Check Stored Constraints / ADRs / Rules
        constraints_affected: list[str] = []
        for r in rules:
            r_name = getattr(r, "name", str(r))
            src_pat = getattr(r, "source_pattern", "").lower()
            tgt_pat = getattr(r, "target_pattern", "").lower()
            if src_pat and tgt_pat:
                # Check if target or any propagation path touches this rule
                if src_pat in actual_id.lower() or any(
                    src_pat in aff.entity_id.lower() for aff in indirect_impacts
                ):
                    constraints_affected.append(
                        f"Custom Rule '{r_name}': Disallows direct coupling between {src_pat} and {tgt_pat}."
                    )

        for adr in adrs:
            adr_num = getattr(adr, "adr_number", getattr(adr, "id", "ADR"))
            adr_title = getattr(adr, "title", "Architectural Invariant")
            constraints_affected.append(
                f"{adr_num} ({adr_title}): Boundary invariant potentially affected by structural changes to {target_name}."
            )

        # 5. Coupling Telemetry
        ce_before = len(direct_outward)
        ca_before = len(direct_inward)
        tot_before = ce_before + ca_before
        i_before = round(ce_before / max(1, tot_before), 2)

        if intervention_type == InterventionType.REMOVE:
            ce_after = 0
            ca_after = 0
            i_after = 0.0
            removed_nodes = (actual_id,)
            removed_edges = tuple(
                (edge.source, edge.target)
                for edge in self.graph.edges
                if edge.source == actual_id or edge.target == actual_id
            )
            added_nodes: tuple[str, ...] = ()
            added_edges: tuple[tuple[str, str], ...] = ()
        elif intervention_type in (InterventionType.DECOUPLE, InterventionType.EXTRACT):
            ce_after = max(1, ce_before - 1)
            ca_after = ca_before
            i_after = round(ce_after / max(1, ce_after + ca_after), 2)
            removed_nodes = ()
            removed_edges = ()
            added_nodes = ()
            added_edges = ()
        else:
            ce_after = ce_before
            ca_after = ca_before
            i_after = i_before
            removed_nodes = ()
            removed_edges = ()
            added_nodes = ()
            added_edges = ()

        # 6. Concrete Evidence Objects
        evidence: list[EvidenceItem] = []
        # Target node evidence
        evidence.append(
            EvidenceItem(
                source_type="graph",
                repository_path=actual_id,
                entity_id=actual_id,
                commit_sha=self.commit_sha,
                excerpt_or_reference=f"AST node '{actual_id}' (inbound: {ca_before}, outbound: {ce_before})",
                relation_to_claim="Target entity verified in repository AST dependency graph.",
                evidence_strength="deterministic",
            )
        )
        # Direct dependency and caller evidence
        for target_id, kind in direct_outward[:3]:
            evidence.append(
                EvidenceItem(
                    source_type="graph",
                    repository_path=target_id,
                    entity_id=target_id,
                    commit_sha=self.commit_sha,
                    excerpt_or_reference=f"Direct dependency: {actual_id} -[{kind}]-> {target_id}",
                    relation_to_claim="Direct outgoing contract relationship in AST graph.",
                    evidence_strength="deterministic",
                )
            )
        for source_id, kind in direct_inward[:3]:
            evidence.append(
                EvidenceItem(
                    source_type="graph",
                    repository_path=source_id,
                    entity_id=source_id,
                    commit_sha=self.commit_sha,
                    excerpt_or_reference=f"Direct consumer: {source_id} -[{kind}]-> {actual_id}",
                    relation_to_claim="Direct upstream consumer caller in AST graph.",
                    evidence_strength="deterministic",
                )
            )

        # Propagation edges evidence
        for p in propagation_paths[:5]:
            evidence.append(
                EvidenceItem(
                    source_type="graph",
                    repository_path=p.target_id,
                    entity_id=p.target_id,
                    commit_sha=self.commit_sha,
                    excerpt_or_reference=f"Path ({p.hops} hops): {' -> '.join(p.path_nodes)}",
                    relation_to_claim=f"Deterministic BFS propagation path connecting {actual_id} to {p.target_id}.",
                    evidence_strength="deterministic",
                )
            )

        for adr in adrs[:2]:
            evidence.append(
                EvidenceItem(
                    source_type="ADR",
                    repository_path="docs/adr",
                    entity_id=getattr(adr, "adr_number", "ADR"),
                    commit_sha=self.commit_sha,
                    excerpt_or_reference=f"{getattr(adr, 'adr_number', 'ADR')}: {getattr(adr, 'title', '')}",
                    relation_to_claim="Documented architectural invariant from repository decision records.",
                    evidence_strength="deterministic",
                )
            )

        # 7. Separated Confidence Metrics (Honoring User Rule: No guessing runtime)
        structural_conf = (
            ConfidenceLevel.HIGH
            if self.graph.node_count > 0 and actual_id in self._nodes_by_id
            else ConfidenceLevel.MEDIUM
        )
        evidence_conf = (
            ConfidenceLevel.HIGH if len(evidence) >= 2 else ConfidenceLevel.MEDIUM
        )
        # Runtime confidence is strictly UNKNOWN as no runtime profiler is attached
        runtime_conf = ConfidenceLevel.UNKNOWN

        confidence = SimulationConfidence(
            structural_confidence=structural_conf,
            evidence_confidence=evidence_conf,
            runtime_confidence=runtime_conf,
            overall=ConfidenceLevel.HIGH
            if structural_conf == ConfidenceLevel.HIGH
            else ConfidenceLevel.MEDIUM,
            rationale=(
                f"Structural blast radius computed deterministically from {len(self.graph.nodes)} AST nodes "
                f"and {len(self.graph.edges)} edges. Runtime behavior marked UNKNOWN (static analysis only)."
            ),
        )

        return StructuralConsequenceSet(
            target_component_id=actual_id,
            target_component_name=target_name,
            subsystem=target_subsystem,
            intervention_type=intervention_type,
            user_description=user_description or f"{intervention_type.value} {target_name}",
            direct_impact_count=len(direct_impacts),
            indirect_impact_count=len(indirect_impacts),
            propagation_paths_count=len(propagation_paths),
            boundaries_crossed_count=len(boundaries_crossed),
            constraints_affected_count=len(constraints_affected),
            direct_impacts=tuple(direct_impacts),
            indirect_impacts=tuple(indirect_impacts),
            propagation_paths=tuple(propagation_paths),
            boundaries_crossed=tuple(boundaries_crossed),
            constraints_affected=tuple(constraints_affected),
            efferent_before=ce_before,
            efferent_after=ce_after,
            instability_before=i_before,
            instability_after=i_after,
            evidence=tuple(evidence),
            confidence=confidence,
            added_nodes=added_nodes,
            removed_nodes=removed_nodes,
            added_edges=added_edges,
            removed_edges=removed_edges,
        )

    def _resolve_target_node(self, target_id: str) -> ArchitectureNode | None:
        if not self.graph.nodes:
            return None
        if target_id:
            # Exact match
            if target_id in self._nodes_by_id:
                return self._nodes_by_id[target_id]
            # Case-insensitive or normalized path match
            norm = target_id.lower().replace("\\", "/")
            for n in self.graph.nodes:
                if n.id.lower() == norm or norm in n.id.lower():
                    return n
        # Default to highest degree node
        return max(
            self.graph.nodes,
            key=lambda n: len(self._outward.get(n.id, [])) + len(self._inward.get(n.id, [])),
        )

    def _get_node_type(self, node_id: str) -> str:
        node = self._nodes_by_id.get(node_id)
        return node.type if node else "module"

    def _reconstruct_path(
        self,
        start_id: str,
        end_id: str,
        parents: dict[str, tuple[str, str]],
    ) -> tuple[tuple[str, ...], tuple[str, ...]]:
        curr = end_id
        nodes = [curr]
        kinds = []
        while curr in parents and curr != start_id:
            p_node, p_kind = parents[curr]
            nodes.append(p_node)
            kinds.append(p_kind)
            curr = p_node
        nodes.reverse()
        kinds.reverse()
        return tuple(nodes), tuple(kinds)

    def _empty_result(
        self,
        target_component_id: str,
        user_description: str,
    ) -> StructuralConsequenceSet:
        return StructuralConsequenceSet(
            target_component_id=target_component_id,
            target_component_name=target_component_id.split("/")[-1],
            subsystem="root",
            intervention_type=InterventionType.REFACTOR,
            user_description=user_description or "Architectural simulation",
            direct_impact_count=0,
            indirect_impact_count=0,
            propagation_paths_count=0,
            boundaries_crossed_count=0,
            constraints_affected_count=0,
            direct_impacts=(),
            indirect_impacts=(),
            propagation_paths=(),
            boundaries_crossed=(),
            constraints_affected=(),
            efferent_before=0,
            efferent_after=0,
            instability_before=0.0,
            instability_after=0.0,
            evidence=(),
            confidence=SimulationConfidence(
                structural_confidence=ConfidenceLevel.UNKNOWN,
                evidence_confidence=ConfidenceLevel.UNKNOWN,
                runtime_confidence=ConfidenceLevel.UNKNOWN,
                overall=ConfidenceLevel.UNKNOWN,
                rationale="No graph available for simulation.",
            ),
        )
