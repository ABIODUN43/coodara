"""
Architecture Graph Analysis & Mathematical Reasoning Tools for Coodara AI.

Implements:
1. Tarjan's Strongly Connected Components (SCC) for exact cycle detection.
2. Afferent (Ca), Efferent (Ce), and Instability (I = Ce / (Ca + Ce)) calculations.
3. Module Importance & Centrality Ranking with Role Classification.
4. Component removal simulation & transitive blast radius analysis.
5. BFS shortest path dependency tracing.
6. Layer boundary violation detection.
7. Directory & module tree reconstruction.
8. Concrete 7-step architecture refactoring action plan synthesis.
"""

from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import Any, Sequence


@dataclass(frozen=True)
class CouplingMetricResult:
    """Coupling and instability metrics for a single module or service."""

    node_id: str
    afferent_coupling: int  # Ca: Incoming dependencies (fan-in)
    efferent_coupling: int  # Ce: Outgoing dependencies (fan-out)
    instability: float  # I = Ce / (Ca + Ce)
    is_hub: bool  # High centrality coordinator
    dependents: list[str] = field(default_factory=list)
    dependencies: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class ModuleImportanceResult:
    """Importance and architectural role classification for a module."""

    node_id: str
    rank: int
    degree_centrality: int  # Ca + Ce
    afferent_coupling: int  # Ca: fan-in
    efferent_coupling: int  # Ce: fan-out
    instability: float  # I
    architectural_role: str  # "Core Domain Model", "Application Coordinator", "Ingress Controller", "Persistence Adapter", "Isolated Module"
    importance_reason: str
    callers: list[str]
    dependencies: list[str]


@dataclass(frozen=True)
class CycleDetectionResult:
    """Cycle detection analysis."""

    has_cycles: bool
    total_cycles: int
    cycle_chains: list[list[str]]  # e.g. [["A", "B", "C", "A"]]
    participating_nodes: list[str]


@dataclass(frozen=True)
class RemovalSimulationResult:
    """Blast radius simulation when a component is removed or refactored."""

    target_component: str
    direct_dependents: list[str]
    transitive_dependents: list[str]
    broken_edges_count: int
    blast_radius_percentage: float
    risk_level: str  # "LOW", "MEDIUM", "HIGH", "CRITICAL"


@dataclass(frozen=True)
class PathTraceResult:
    """Path trace between source and target components."""

    source: str
    target: str
    connected: bool
    path: list[str]
    hops: int


@dataclass(frozen=True)
class RefactoringStep:
    """A concrete phased step in an architectural refactoring blueprint."""

    phase: int
    title: str
    action: str
    target_pattern: str
    risk_level: str


@dataclass(frozen=True)
class LayerViolationResult:
    """Detected layer boundary violation."""

    source_node: str
    target_node: str
    violation_type: str
    severity: str
    description: str


def get_repository_structure(
    nodes: Sequence[str | dict[str, Any]],
) -> dict[str, Any]:
    """
    Reconstruct directory and module hierarchy from graph nodes.
    """
    tree: dict[str, Any] = {}

    for node in nodes:
        node_id = node if isinstance(node, str) else node.get("id", "")
        if not node_id:
            continue

        parts = node_id.replace("\\", "/").strip("/").split("/")
        current = tree
        for part in parts[:-1]:
            if part not in current or not isinstance(current[part], dict):
                current[part] = {}
            current = current[part]

        leaf = parts[-1]
        current[leaf] = "__file__"

    return tree


def format_structure_tree(tree: dict[str, Any], indent: int = 0) -> str:
    """
    Format a tree dictionary into a clean ASCII directory representation.
    """
    lines = []
    prefix = "  " * indent
    for key, value in sorted(tree.items()):
        if value == "__file__":
            lines.append(f"{prefix}├── {key}")
        else:
            lines.append(f"{prefix}📁 {key}/")
            lines.append(format_structure_tree(value, indent + 1))
    return "\n".join(lines)


def calculate_coupling_metrics(
    nodes: Sequence[str | dict[str, Any]],
    edges: Sequence[dict[str, Any] | tuple[str, str]],
    target_node: str | None = None,
) -> dict[str, CouplingMetricResult]:
    """
    Calculate Afferent Coupling (Ca), Efferent Coupling (Ce), and Instability (I).
    """
    node_ids: set[str] = set()
    for n in nodes:
        nid = n if isinstance(n, str) else n.get("id", "")
        if nid:
            node_ids.add(nid)

    incoming: dict[str, set[str]] = defaultdict(set)
    outgoing: dict[str, set[str]] = defaultdict(set)

    for edge in edges:
        if isinstance(edge, tuple):
            s, t = edge[0], edge[1]
        else:
            s, t = edge.get("source", ""), edge.get("target", "")

        if s and t and s != t:
            node_ids.add(s)
            node_ids.add(t)
            outgoing[s].add(t)
            incoming[t].add(s)

    results: dict[str, CouplingMetricResult] = {}
    target_set = {target_node} if target_node else node_ids

    for node_id in sorted(target_set):
        if not node_id:
            continue
        ca = len(incoming[node_id])
        ce = len(outgoing[node_id])
        total = ca + ce
        instability = round(ce / total, 3) if total > 0 else 0.0
        is_hub = ca >= 3 or ce >= 4 or total >= 5

        results[node_id] = CouplingMetricResult(
            node_id=node_id,
            afferent_coupling=ca,
            efferent_coupling=ce,
            instability=instability,
            is_hub=is_hub,
            dependents=sorted(incoming[node_id]),
            dependencies=sorted(outgoing[node_id]),
        )

    return results


def rank_module_importance(
    nodes: Sequence[str | dict[str, Any]],
    edges: Sequence[dict[str, Any] | tuple[str, str]],
    top_n: int = 10,
) -> list[ModuleImportanceResult]:
    """
    Rank modules by architectural importance based on graph centrality, fan-in, and dependency reach.
    """
    coupling_map = calculate_coupling_metrics(nodes, edges)
    if not coupling_map:
        return []

    # Calculate importance score:
    # Degree centrality (Ca + Ce) weighted by fan-in (high Ca = high blast radius)
    def calculate_score(m: CouplingMetricResult) -> tuple[int, int, int]:
        degree = m.afferent_coupling + m.efferent_coupling
        # Prioritize degree, then high fan-in, then fan-out
        return (degree, m.afferent_coupling, m.efferent_coupling)

    sorted_metrics = sorted(coupling_map.values(), key=calculate_score, reverse=True)

    results: list[ModuleImportanceResult] = []
    for rank, m in enumerate(sorted_metrics[:top_n], start=1):
        name_lower = m.node_id.lower()
        ca = m.afferent_coupling
        ce = m.efferent_coupling
        degree = ca + ce

        # Determine architectural role
        if ca == 0 and ce == 0:
            role = "Isolated Module"
            reason = "Zero observed callers and dependencies in current snapshot; standalone script or isolated utility."
        elif ca >= 2 and ce >= 2:
            role = "Application Coordinator"
            reason = f"Central orchestration hub with {ca} incoming callers and {ce} outgoing dependencies; changes propagate across both upstream consumers and downstream adapters."
        elif ca >= 2 and ce <= 1:
            role = "Core Domain / Shared Dependency"
            reason = f"High afferent coupling (fan-in $C_a={ca}$); critical shared dependency where regressions impact {ca} upstream modules."
        elif ca <= 1 and ce >= 2:
            role = "Ingress Controller / API Gateway"
            reason = f"System entrypoint with {ce} outgoing service calls; handles presentation flow and delegates into application layers."
        elif "service" in name_lower or "manager" in name_lower or "engine" in name_lower:
            role = "Application Service"
            reason = f"Business logic coordinator managing domain operations with {degree} total dependency edges."
        elif "router" in name_lower or "api" in name_lower or "controller" in name_lower:
            role = "Presentation Controller"
            reason = f"API routing boundary exposing HTTP endpoints and dispatching requests."
        elif "repo" in name_lower or "adapter" in name_lower or "db" in name_lower or "client" in name_lower:
            role = "Persistence Adapter"
            reason = f"Infrastructure boundary abstracting database sessions or external API communication."
        else:
            role = "Domain Module"
            reason = f"Structural component participating in {degree} dependency relationships."

        results.append(
            ModuleImportanceResult(
                node_id=m.node_id,
                rank=rank,
                degree_centrality=degree,
                afferent_coupling=ca,
                efferent_coupling=ce,
                instability=m.instability,
                architectural_role=role,
                importance_reason=reason,
                callers=m.dependents,
                dependencies=m.dependencies,
            )
        )

    return results


def resolve_highest_coupling_coordinator(
    nodes: Sequence[str | dict[str, Any]],
    edges: Sequence[dict[str, Any] | tuple[str, str]],
) -> tuple[str | None, list[str]]:
    """
    Resolve the highest-coupling coordinator using Coodara's existing coupling metrics.
    A coordinator manages interactions between callers and dependencies (Ca + Ce).

    Returns:
        (selected_target, candidates_list)
        If there is a tie or close ambiguity among top hubs, candidates_list contains all candidates
        and selected_target is None (or flagged for user disambiguation).
    """
    coupling_map = calculate_coupling_metrics(nodes, edges)
    if not coupling_map:
        return None, []

    candidates_with_score: list[tuple[CouplingMetricResult, int]] = []
    for m in coupling_map.values():
        degree = m.afferent_coupling + m.efferent_coupling
        if degree == 0:
            continue
        # Coordinator bonus if it has both incoming and outgoing dependencies
        is_coordinator = 1 if (m.afferent_coupling >= 1 and m.efferent_coupling >= 1) else 0
        score = degree * 2 + is_coordinator
        candidates_with_score.append((m, score))

    if not candidates_with_score:
        return None, []

    # Sort by score descending
    candidates_with_score.sort(key=lambda x: x[1], reverse=True)
    top_score = candidates_with_score[0][1]

    # Find all tied at top score
    tied = [c.node_id for c, score in candidates_with_score if score == top_score]

    if len(tied) > 1:
        # Tie detected: surface all tied candidates for user disambiguation
        return None, tied

    return tied[0], tied


def detect_dependency_cycles(
    nodes: Sequence[str | dict[str, Any]],
    edges: Sequence[dict[str, Any] | tuple[str, str]],
) -> CycleDetectionResult:
    """
    Detect dependency cycles using Tarjan's Strongly Connected Components (SCC) algorithm.
    """
    adj: dict[str, list[str]] = defaultdict(list)
    all_nodes: set[str] = set()

    for n in nodes:
        nid = n if isinstance(n, str) else n.get("id", "")
        if nid:
            all_nodes.add(nid)

    for edge in edges:
        if isinstance(edge, tuple):
            s, t = edge[0], edge[1]
        else:
            s, t = edge.get("source", ""), edge.get("target", "")
        if s and t:
            all_nodes.add(s)
            all_nodes.add(t)
            adj[s].append(t)

    index = 0
    indices: dict[str, int] = {}
    lowlinks: dict[str, int] = {}
    on_stack: dict[str, bool] = {}
    stack: list[str] = []
    sccs: list[list[str]] = []

    def strongconnect(v: str) -> None:
        nonlocal index
        indices[v] = index
        lowlinks[v] = index
        index += 1
        stack.append(v)
        on_stack[v] = True

        for w in adj.get(v, []):
            if w not in indices:
                strongconnect(w)
                lowlinks[v] = min(lowlinks[v], lowlinks[w])
            elif on_stack.get(w, False):
                lowlinks[v] = min(lowlinks[v], indices[w])

        if lowlinks[v] == indices[v]:
            scc = []
            while True:
                w = stack.pop()
                on_stack[w] = False
                scc.append(w)
                if w == v:
                    break
            if len(scc) > 1:  # Only multi-node SCCs represent true cycles
                sccs.append(scc)

    for node in sorted(all_nodes):
        if node not in indices:
            strongconnect(node)

    cycle_chains: list[list[str]] = []
    participating: set[str] = set()

    for scc in sccs:
        for n in scc:
            participating.add(n)
        chain = sorted(scc)
        if chain:
            cycle_chains.append(chain + [chain[0]])

    return CycleDetectionResult(
        has_cycles=len(cycle_chains) > 0,
        total_cycles=len(cycle_chains),
        cycle_chains=cycle_chains,
        participating_nodes=sorted(participating),
    )


def trace_dependency_path(
    source: str,
    target: str,
    edges: Sequence[dict[str, Any] | tuple[str, str]],
) -> PathTraceResult:
    """
    Find shortest dependency path between source and target using BFS.
    """
    adj: dict[str, list[str]] = defaultdict(list)
    for edge in edges:
        if isinstance(edge, tuple):
            s, t = edge[0], edge[1]
        else:
            s, t = edge.get("source", ""), edge.get("target", "")
        if s and t:
            adj[s].append(t)

    queue: deque[list[str]] = deque([[source]])
    visited = {source}

    while queue:
        path = queue.popleft()
        node = path[-1]

        if node == target:
            return PathTraceResult(
                source=source,
                target=target,
                connected=True,
                path=path,
                hops=len(path) - 1,
            )

        for neighbor in adj.get(node, []):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(path + [neighbor])

    return PathTraceResult(
        source=source,
        target=target,
        connected=False,
        path=[],
        hops=-1,
    )


def simulate_component_removal(
    component: str,
    nodes: Sequence[str | dict[str, Any]],
    edges: Sequence[dict[str, Any] | tuple[str, str]],
) -> RemovalSimulationResult:
    """
    Simulate what happens if a component is removed or refactored.
    Calculates direct and transitive dependents affected.
    """
    node_count = max(len(nodes), 1)
    incoming: dict[str, set[str]] = defaultdict(set)

    broken_edges = 0
    for edge in edges:
        if isinstance(edge, tuple):
            s, t = edge[0], edge[1]
        else:
            s, t = edge.get("source", ""), edge.get("target", "")

        if s and t:
            incoming[t].add(s)
            if s == component or t == component:
                broken_edges += 1

    direct_dependents = sorted(incoming.get(component, set()))

    # Transitive dependents via reverse BFS
    visited: set[str] = set()
    queue: deque[str] = deque(direct_dependents)

    while queue:
        curr = queue.popleft()
        if curr not in visited and curr != component:
            visited.add(curr)
            for upstream in incoming.get(curr, set()):
                if upstream not in visited and upstream != component:
                    queue.append(upstream)

    transitive = sorted(visited)
    total_affected = len(transitive)
    blast_pct = round((total_affected / node_count) * 100.0, 1)

    if total_affected == 0:
        risk = "LOW"
    elif total_affected <= 2:
        risk = "MEDIUM"
    elif total_affected <= 5:
        risk = "HIGH"
    else:
        risk = "CRITICAL"

    return RemovalSimulationResult(
        target_component=component,
        direct_dependents=direct_dependents,
        transitive_dependents=transitive,
        broken_edges_count=broken_edges,
        blast_radius_percentage=blast_pct,
        risk_level=risk,
    )


def find_high_coupling_modules(
    nodes: Sequence[str | dict[str, Any]],
    edges: Sequence[dict[str, Any] | tuple[str, str]],
    top_n: int = 5,
) -> list[CouplingMetricResult]:
    """
    Identify the highest-coupling modules and unstable coordinators.
    """
    metrics = calculate_coupling_metrics(nodes, edges)
    sorted_items = sorted(
        metrics.values(),
        key=lambda m: (m.afferent_coupling + m.efferent_coupling, m.efferent_coupling),
        reverse=True,
    )
    return sorted_items[:top_n]


def generate_refactoring_action_plan(
    *,
    problem: str,
    component: str,
    metrics: CouplingMetricResult | None = None,
    affected_nodes: list[str] | None = None,
) -> list[RefactoringStep]:
    """
    Generate concrete 7-step engineering action plan.
    """
    dependents_text = f" ({len(affected_nodes)} downstream dependents)" if affected_nodes else ""

    return [
        RefactoringStep(
            phase=1,
            title="Define Domain Interface Contract",
            action=f"Create an explicit abstraction interface for `{component}` inside domain core with pure type annotations.",
            target_pattern="Dependency Inversion Principle (DIP)",
            risk_level="LOW",
        ),
        RefactoringStep(
            phase=2,
            title="Implement Infrastructure Adapter",
            action=f"Move direct implementation details (e.g. DB sessions, external APIs) from `{component}` into dedicated adapter classes.",
            target_pattern="Hexagonal / Ports & Adapters",
            risk_level="LOW",
        ),
        RefactoringStep(
            phase=3,
            title="Inject Interface Dependencies",
            action=f"Refactor callers{dependents_text} to accept the interface via constructor dependency injection rather than direct imports.",
            target_pattern="Inversion of Control (IoC)",
            risk_level="MEDIUM",
        ),
        RefactoringStep(
            phase=4,
            title="Break Dependency Cycles",
            action="Eliminate bidirectional imports by extracting shared value objects into an isolated domain primitives module.",
            target_pattern="Acyclic Dependencies Principle (ADP)",
            risk_level="MEDIUM",
        ),
        RefactoringStep(
            phase=5,
            title="Update Unit & Component Tests",
            action=f"Mock the interface in downstream tests for {', '.join((affected_nodes or [component])[:3])} to verify isolated execution.",
            target_pattern="Mock / Fake Test Doubles",
            risk_level="LOW",
        ),
        RefactoringStep(
            phase=6,
            title="Remove Deprecated Direct Imports",
            action=f"Prune obsolete direct cross-layer references into `{component}` and verify zero compiler warnings.",
            target_pattern="Dead Code Elimination",
            risk_level="LOW",
        ),
        RefactoringStep(
            phase=7,
            title="Re-run Coodara Telemetry & Validate CI",
            action="Trigger an asynchronous Coodara AST analysis run to confirm maintainability score increase and cycle resolution.",
            target_pattern="Continuous Architecture Validation",
            risk_level="LOW",
        ),
    ]
