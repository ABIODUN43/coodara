"""
Tests for Architecture Graph Analysis & Mathematical Reasoning Tools.
"""

from app.ai.tools.graph_tools import (
    calculate_coupling_metrics,
    detect_dependency_cycles,
    find_high_coupling_modules,
    generate_refactoring_action_plan,
    get_repository_structure,
    rank_module_importance,
    simulate_component_removal,
    trace_dependency_path,
)


def test_get_repository_structure():
    nodes = [
        "app/api/v1/users.py",
        "app/services/user_service.py",
        "app/models/user.py",
        "app/core/config.py",
    ]
    tree = get_repository_structure(nodes)

    assert "app" in tree
    assert "api" in tree["app"]
    assert "v1" in tree["app"]["api"]
    assert "users.py" in tree["app"]["api"]["v1"]
    assert "services" in tree["app"]
    assert "user_service.py" in tree["app"]["services"]


def test_calculate_coupling_metrics():
    nodes = ["Router", "Service", "Repository", "Database"]
    edges = [
        ("Router", "Service"),
        ("Service", "Repository"),
        ("Repository", "Database"),
        ("ExtraCaller", "Service"),
    ]

    metrics = calculate_coupling_metrics(nodes, edges)

    # Service has 2 incoming (Router, ExtraCaller) -> Ca=2
    # Service has 1 outgoing (Repository) -> Ce=1
    # Instability I = Ce / (Ca + Ce) = 1 / (2 + 1) = 0.333
    service_metric = metrics["Service"]
    assert service_metric.afferent_coupling == 2
    assert service_metric.efferent_coupling == 1
    assert service_metric.instability == 0.333
    assert "Router" in service_metric.dependents
    assert "Repository" in service_metric.dependencies


def test_rank_module_importance():
    nodes = ["Router", "UserService", "UserRepository", "Database", "IsolatedUtil"]
    edges = [
        ("Router", "UserService"),
        ("AdminRouter", "UserService"),
        ("CronWorker", "UserService"),
        ("UserService", "UserRepository"),
        ("UserRepository", "Database"),
    ]

    ranked = rank_module_importance(nodes, edges, top_n=5)
    assert len(ranked) >= 4

    # Top module should be UserService (highest degree centrality: 3 incoming + 1 outgoing = 4)
    top = ranked[0]
    assert top.node_id == "UserService"
    assert top.degree_centrality == 4
    assert top.afferent_coupling == 3
    assert top.efferent_coupling == 1
    assert "Core Domain" in top.architectural_role or "Shared Dependency" in top.architectural_role or "Application" in top.architectural_role
    assert len(top.callers) == 3

    # IsolatedUtil has 0 callers, 0 dependencies
    isolated = [r for r in ranked if r.node_id == "IsolatedUtil"]
    if isolated:
        assert isolated[0].afferent_coupling == 0
        assert isolated[0].efferent_coupling == 0
        assert isolated[0].architectural_role == "Isolated Module"


def test_detect_dependency_cycles():
    # Acyclic graph
    acyclic_nodes = ["A", "B", "C"]
    acyclic_edges = [("A", "B"), ("B", "C")]
    res_clean = detect_dependency_cycles(acyclic_nodes, acyclic_edges)
    assert not res_clean.has_cycles
    assert res_clean.total_cycles == 0

    # Cyclic graph: A -> B -> C -> A
    cyclic_nodes = ["A", "B", "C", "D"]
    cyclic_edges = [("A", "B"), ("B", "C"), ("C", "A"), ("C", "D")]
    res_cyclic = detect_dependency_cycles(cyclic_nodes, cyclic_edges)
    assert res_cyclic.has_cycles
    assert res_cyclic.total_cycles >= 1
    assert "A" in res_cyclic.participating_nodes
    assert "B" in res_cyclic.participating_nodes
    assert "C" in res_cyclic.participating_nodes
    assert "D" not in res_cyclic.participating_nodes


def test_trace_dependency_path():
    edges = [
        ("API", "UserService"),
        ("UserService", "UserRepository"),
        ("UserRepository", "PostgreSQL"),
        ("API", "AuthService"),
    ]

    # Trace API -> PostgreSQL
    trace = trace_dependency_path("API", "PostgreSQL", edges)
    assert trace.connected
    assert trace.hops == 3
    assert trace.path == ["API", "UserService", "UserRepository", "PostgreSQL"]

    # Trace AuthService -> PostgreSQL (not connected)
    disconnected = trace_dependency_path("AuthService", "PostgreSQL", edges)
    assert not disconnected.connected


def test_simulate_component_removal():
    nodes = ["Router", "Service", "Repository", "Database", "Unrelated"]
    edges = [
        ("Router", "Service"),
        ("Service", "Repository"),
        ("Repository", "Database"),
    ]

    sim = simulate_component_removal("Repository", nodes, edges)
    # Service directly calls Repository
    assert "Service" in sim.direct_dependents
    # Router transitively calls Repository via Service
    assert "Router" in sim.transitive_dependents
    assert "Service" in sim.transitive_dependents
    assert "Unrelated" not in sim.transitive_dependents
    assert sim.broken_edges_count >= 1


def test_find_high_coupling_modules():
    nodes = ["Hub", "Leaf1", "Leaf2", "Leaf3", "Leaf4"]
    edges = [
        ("Leaf1", "Hub"),
        ("Leaf2", "Hub"),
        ("Leaf3", "Hub"),
        ("Leaf4", "Hub"),
        ("Hub", "Database"),
    ]

    hotspots = find_high_coupling_modules(nodes, edges, top_n=1)
    assert len(hotspots) == 1
    assert hotspots[0].node_id == "Hub"
    assert hotspots[0].afferent_coupling == 4


def test_generate_refactoring_action_plan():
    steps = generate_refactoring_action_plan(
        problem="High Coupling",
        component="architecture-service",
        affected_nodes=["api-router", "worker-job"],
    )
    assert len(steps) == 7
    assert steps[0].phase == 1
    assert "Domain Interface" in steps[0].title
    assert "architecture-service" in steps[0].action
    assert steps[6].phase == 7
