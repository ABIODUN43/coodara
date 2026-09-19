"""
Unit tests for the Deterministic What-If Architecture Simulation Engine.
"""

import pytest

from app.architecture.models import (
    ArchitectureEdge,
    ArchitectureGraph,
    ArchitectureNode,
)
from app.architecture.simulation import (
    ConfidenceLevel,
    DeterministicSimulationEngine,
    InterventionType,
    normalize_intervention,
)


@pytest.fixture
def sample_graph() -> ArchitectureGraph:
    """
    Construct a deterministic test architecture graph:

    apps/api/routes -> apps/core/services -> apps/db/models
                                          -> apps/payments/client
    apps/web/views  -> apps/core/services
    """
    nodes = (
        ArchitectureNode(id="apps/api/routes", type="module"),
        ArchitectureNode(id="apps/core/services", type="module"),
        ArchitectureNode(id="apps/db/models", type="module"),
        ArchitectureNode(id="apps/payments/client", type="module"),
        ArchitectureNode(id="apps/web/views", type="module"),
    )
    edges = (
        ArchitectureEdge(source="apps/api/routes", target="apps/core/services", kind="imports"),
        ArchitectureEdge(source="apps/web/views", target="apps/core/services", kind="imports"),
        ArchitectureEdge(source="apps/core/services", target="apps/db/models", kind="imports"),
        ArchitectureEdge(source="apps/core/services", target="apps/payments/client", kind="calls"),
    )
    return ArchitectureGraph(version=1, nodes=nodes, edges=edges)


def test_normalize_intervention():
    assert normalize_intervention("Remove the deprecated payment client") == InterventionType.REMOVE
    assert normalize_intervention("Extract storage logic into interface") == InterventionType.EXTRACT
    assert normalize_intervention("Decouple services using port adapter") == InterventionType.DECOUPLE
    assert normalize_intervention("Split monolithic controller") == InterventionType.SPLIT
    assert normalize_intervention("General refactoring of module") == InterventionType.REFACTOR
    assert normalize_intervention("") == InterventionType.REFACTOR


def test_deterministic_simulation_direct_and_indirect_impact(sample_graph):
    engine = DeterministicSimulationEngine(graph=sample_graph, commit_sha="abc1234")

    # Simulate modifying apps/core/services
    res = engine.simulate(
        target_component_id="apps/core/services",
        user_description="Refactor core service handlers",
    )

    assert res.target_component_id == "apps/core/services"
    assert res.intervention_type == InterventionType.REFACTOR

    # Direct impacts: target itself + 2 callers (api/routes, web/views) + 2 dependencies (db/models, payments/client)
    direct_ids = {item.entity_id for item in res.direct_impacts}
    assert "apps/core/services" in direct_ids
    assert "apps/api/routes" in direct_ids
    assert "apps/web/views" in direct_ids
    assert "apps/db/models" in direct_ids
    assert "apps/payments/client" in direct_ids
    assert res.direct_impact_count == 5


def test_deterministic_simulation_remove_intervention(sample_graph):
    engine = DeterministicSimulationEngine(graph=sample_graph, commit_sha="abc1234")

    # Simulate removing apps/db/models
    res = engine.simulate(
        target_component_id="apps/db/models",
        user_description="Remove database models module",
    )

    assert res.intervention_type == InterventionType.REMOVE
    assert "apps/db/models" in res.removed_nodes
    # Direct impact includes upstream caller apps/core/services
    direct_ids = {item.entity_id for item in res.direct_impacts}
    assert "apps/core/services" in direct_ids

    # Indirect impact through unweighted BFS: apps/api/routes and apps/web/views call apps/core/services
    indirect_ids = {item.entity_id for item in res.indirect_impacts}
    assert "apps/api/routes" in indirect_ids
    assert "apps/web/views" in indirect_ids

    # Propagation paths
    api_path = next(p for p in res.propagation_paths if p.target_id == "apps/api/routes")
    assert api_path.hops == 2
    assert api_path.path_nodes == ("apps/db/models", "apps/core/services", "apps/api/routes")


def test_boundary_crossings_detected(sample_graph):
    engine = DeterministicSimulationEngine(graph=sample_graph, commit_sha="abc1234")

    res = engine.simulate(
        target_component_id="apps/db/models",
        user_description="Remove database models module",
    )

    # Subsystems: apps/db, apps/core, apps/api
    assert res.boundaries_crossed_count > 0
    boundary_subsystems = {(b.from_boundary, b.to_boundary) for b in res.boundaries_crossed}
    assert ("apps/db", "apps/core") in boundary_subsystems or ("apps/core", "apps/api") in boundary_subsystems


def test_confidence_dimensions_separated(sample_graph):
    engine = DeterministicSimulationEngine(graph=sample_graph, commit_sha="abc1234")

    res = engine.simulate(target_component_id="apps/core/services")

    assert res.confidence.structural_confidence == ConfidenceLevel.HIGH
    assert res.confidence.evidence_confidence == ConfidenceLevel.HIGH
    # Runtime confidence MUST be UNKNOWN because no runtime profiling is attached
    assert res.confidence.runtime_confidence == ConfidenceLevel.UNKNOWN
    assert res.confidence.overall == ConfidenceLevel.HIGH
    assert len(res.evidence) > 0
    assert any(e.source_type == "graph" for e in res.evidence)
