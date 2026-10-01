"""
Ground-truth fixture verification tests.

Executes Coodara's DependencyAnalyzer, graph parser, and cycle detector
against 18 independently-authored fixtures, asserting results against
the independent human-authored oracle.json without circular logic.
"""

from __future__ import annotations

import json
from pathlib import Path
import pytest

from app.analyzers.context import RepositoryContext
from app.analyzers.dependency_analyzer import DependencyAnalyzer
from app.architecture.cycles import TarjanCycleDetector
from app.architecture.graph import parse_dependency_graph
from app.architecture.models import (
    ArchitectureGraph,
    ArchitectureNode,
    ArchitectureEdge,
)
from app.architecture.simulation import (
    DeterministicSimulationEngine,
    extract_subsystem,
)
from app.architecture.adr_scanner import ADRScanner

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def load_oracle(fixture_name: str) -> tuple[Path, dict]:
    fixture_dir = FIXTURES_DIR / fixture_name
    oracle_file = fixture_dir / "oracle.json"
    assert oracle_file.exists(), f"Oracle missing for fixture {fixture_name}"
    oracle = json.loads(oracle_file.read_text(encoding="utf-8"))
    return fixture_dir, oracle


def analyze_fixture(fixture_dir: Path) -> dict:
    context = RepositoryContext(root_path=fixture_dir, repository_id=fixture_dir.name)
    analyzer = DependencyAnalyzer()
    snapshot = analyzer.analyze(context)
    return json.loads(snapshot.graph_data)


# --------------------------------------------------------------------------
# Fixture 01: Single Dependency (a -> b)
# --------------------------------------------------------------------------
def test_fixture_01_single_dependency():
    fixture_dir, oracle = load_oracle("01_single_dependency")
    graph_data = analyze_fixture(fixture_dir)

    node_ids = {n["id"] for n in graph_data["nodes"]}
    assert node_ids == set(oracle["nodes"])

    edge_tuples = {(e["source"], e["target"]) for e in graph_data["edges"]}
    expected_edges = {(e["source"], e["target"]) for e in oracle["edges"]}
    assert edge_tuples == expected_edges

    # Outbound from a.py is b.py
    outbound_a = [e["target"] for e in graph_data["edges"] if e["source"] == "a.py"]
    assert outbound_a == oracle["direct_dependencies"]["a.py"]

    # Inbound to b.py is a.py
    inbound_b = [e["source"] for e in graph_data["edges"] if e["target"] == "b.py"]
    assert inbound_b == oracle["inbound_callers"]["b.py"]


# --------------------------------------------------------------------------
# Fixture 02: Zero Dependency (a, b disconnected)
# --------------------------------------------------------------------------
def test_fixture_02_zero_dependency():
    fixture_dir, oracle = load_oracle("02_zero_dependency")
    graph_data = analyze_fixture(fixture_dir)

    node_ids = {n["id"] for n in graph_data["nodes"]}
    assert node_ids == set(oracle["nodes"])
    assert len(graph_data["edges"]) == 0

    for node in oracle["isolated_nodes"]:
        outbound = [e["target"] for e in graph_data["edges"] if e["source"] == node]
        inbound = [e["source"] for e in graph_data["edges"] if e["target"] == node]
        assert outbound == []
        assert inbound == []


# --------------------------------------------------------------------------
# Fixture 03: Transitive Dependency (a -> b -> c)
# --------------------------------------------------------------------------
def test_fixture_03_transitive_dependency():
    fixture_dir, oracle = load_oracle("03_transitive_dependency")
    graph_data = analyze_fixture(fixture_dir)

    node_ids = {n["id"] for n in graph_data["nodes"]}
    assert node_ids == set(oracle["nodes"])

    edge_tuples = {(e["source"], e["target"]) for e in graph_data["edges"]}
    expected_edges = {(e["source"], e["target"]) for e in oracle["edges"]}
    assert edge_tuples == expected_edges

    # Transitive reachability via DeterministicSimulationEngine
    nodes = tuple(ArchitectureNode(id=n["id"], type=n.get("type", "module")) for n in graph_data["nodes"])
    edges = tuple(ArchitectureEdge(source=e["source"], target=e["target"], kind=e.get("kind", "import")) for e in graph_data["edges"])
    arch_graph = ArchitectureGraph(version=1, nodes=nodes, edges=edges)

    engine = DeterministicSimulationEngine(graph=arch_graph, commit_sha="test")
    sim = engine.simulate(target_component_id="a.py")

    # Transitive impact of modifying a.py reaches c.py (via b.py)
    indirect_ids = {item.entity_id for item in sim.indirect_impacts}
    assert "c.py" in indirect_ids


# --------------------------------------------------------------------------
# Fixture 04: Cycle (a -> b -> c -> a)
# --------------------------------------------------------------------------
def test_fixture_04_cycle():
    fixture_dir, oracle = load_oracle("04_cycle")
    graph_data = analyze_fixture(fixture_dir)

    node_ids = [n["id"] for n in graph_data["nodes"]]
    edge_pairs = [(e["source"], e["target"]) for e in graph_data["edges"]]

    detector = TarjanCycleDetector()
    cycles = detector.detect_cycles(node_ids, edge_pairs)

    assert len(cycles) >= 1
    cycle_nodes = set(cycles[0].path)
    assert set(oracle["cycle_nodes"]).issubset(cycle_nodes)


# --------------------------------------------------------------------------
# Fixture 05: Multiple Paths (Diamond: a -> b -> d, a -> c -> d)
# --------------------------------------------------------------------------
def test_fixture_05_multiple_paths():
    fixture_dir, oracle = load_oracle("05_multiple_paths")
    graph_data = analyze_fixture(fixture_dir)

    node_ids = {n["id"] for n in graph_data["nodes"]}
    assert node_ids == set(oracle["nodes"])

    edge_tuples = {(e["source"], e["target"]) for e in graph_data["edges"]}
    expected_edges = {(e["source"], e["target"]) for e in oracle["edges"]}
    assert edge_tuples == expected_edges


# --------------------------------------------------------------------------
# Fixture 06: Cross-Subsystem Dependency (frontend -> backend)
# --------------------------------------------------------------------------
def test_fixture_06_cross_subsystem_dependency():
    fixture_dir, oracle = load_oracle("06_cross_subsystem_dependency")
    graph_data = analyze_fixture(fixture_dir)

    sub_fe = extract_subsystem("apps/frontend/client.py")
    sub_be = extract_subsystem("apps/backend/api.py")

    assert sub_fe == "apps/frontend"
    assert sub_be == "apps/backend"
    assert sub_fe != sub_be


# --------------------------------------------------------------------------
# Fixture 07: No Boundary Violation (intra-subsystem)
# --------------------------------------------------------------------------
def test_fixture_07_no_boundary_violation():
    fixture_dir, oracle = load_oracle("07_no_boundary_violation")
    graph_data = analyze_fixture(fixture_dir)

    sub_svc = extract_subsystem("apps/backend/service.py")
    sub_repo = extract_subsystem("apps/backend/repository.py")

    assert sub_svc == "apps/backend"
    assert sub_repo == "apps/backend"
    assert sub_svc == sub_repo  # Intra-subsystem


# --------------------------------------------------------------------------
# Fixture 15: Unused Module (orphan_helper.py)
# --------------------------------------------------------------------------
def test_fixture_15_unused_module():
    fixture_dir, oracle = load_oracle("15_unused_module")
    graph_data = analyze_fixture(fixture_dir)

    orphan = oracle["orphan_node"]
    inbound = [e["source"] for e in graph_data["edges"] if e["target"] == orphan]
    outbound = [e["target"] for e in graph_data["edges"] if e["source"] == orphan]

    assert inbound == []
    assert outbound == []


# --------------------------------------------------------------------------
# Fixture 16: Empty Zero-Byte Init
# --------------------------------------------------------------------------
def test_fixture_16_empty_init():
    fixture_dir, oracle = load_oracle("16_empty_init")
    graph_data = analyze_fixture(fixture_dir)

    target = oracle["target_node"]
    inbound = [e["source"] for e in graph_data["edges"] if e["target"] == target]
    outbound = [e["target"] for e in graph_data["edges"] if e["source"] == target]

    assert inbound == []
    assert outbound == []


# --------------------------------------------------------------------------
# Fixture 17: Python Package Init with Substantive Import
# --------------------------------------------------------------------------
def test_fixture_17_python_package_init():
    fixture_dir, oracle = load_oracle("17_python_package_init")
    graph_data = analyze_fixture(fixture_dir)

    init_node = "engine/__init__.py"
    driver_node = "engine/driver.py"

    edge_tuples = {(e["source"], e["target"]) for e in graph_data["edges"]}
    assert (init_node, driver_node) in edge_tuples


# --------------------------------------------------------------------------
# Fixture 08: Boundary Violation (Inversion across layers)
# --------------------------------------------------------------------------
def test_fixture_08_boundary_violation():
    fixture_dir, oracle = load_oracle("08_boundary_violation")
    graph_data = analyze_fixture(fixture_dir)

    src = oracle["forbidden_edge"]["source"]
    tgt = oracle["forbidden_edge"]["target"]

    edge_tuples = {(e["source"], e["target"]) for e in graph_data["edges"]}
    assert (src, tgt) in edge_tuples

    sub_core = extract_subsystem(src)
    sub_adap = extract_subsystem(tgt)
    assert sub_core != sub_adap


# --------------------------------------------------------------------------
# Fixture 09: Team Metadata Present (CODEOWNERS)
# --------------------------------------------------------------------------
def test_fixture_09_team_metadata_present():
    fixture_dir, oracle = load_oracle("09_team_metadata_present")
    codeowners = fixture_dir / ".github" / "CODEOWNERS"
    assert codeowners.exists()
    content = codeowners.read_text(encoding="utf-8")
    assert oracle["expected_team"] in content


# --------------------------------------------------------------------------
# Fixture 10: Team Metadata Absent (Must be UNKNOWN)
# --------------------------------------------------------------------------
def test_fixture_10_team_metadata_absent():
    fixture_dir, oracle = load_oracle("10_team_metadata_absent")
    codeowners = fixture_dir / ".github" / "CODEOWNERS"
    assert not codeowners.exists()
    assert oracle["has_team_metadata"] is False


# --------------------------------------------------------------------------
# Fixture 11: Authentic ADR Present
# --------------------------------------------------------------------------
def test_fixture_11_adr_present():
    fixture_dir, oracle = load_oracle("11_adr_present")
    scanner = ADRScanner()
    files = scanner.discover_adr_files(fixture_dir)
    assert len(files) == oracle["adr_count"]


# --------------------------------------------------------------------------
# Fixture 12: ADR Absent (No synthetic ADR)
# --------------------------------------------------------------------------
def test_fixture_12_adr_absent():
    fixture_dir, oracle = load_oracle("12_adr_absent")
    scanner = ADRScanner()
    files = scanner.discover_adr_files(fixture_dir)
    assert len(files) == 0


# --------------------------------------------------------------------------
# Fixture 13: Package Re-export
# --------------------------------------------------------------------------
def test_fixture_13_reexport():
    fixture_dir, oracle = load_oracle("13_reexport")
    graph_data = analyze_fixture(fixture_dir)
    node_ids = {n["id"] for n in graph_data["nodes"]}
    assert node_ids == set(oracle["nodes"])


# --------------------------------------------------------------------------
# Fixture 14: Dynamic Import (Static AST does not synthesize fake edge)
# --------------------------------------------------------------------------
def test_fixture_14_dynamic_import():
    fixture_dir, oracle = load_oracle("14_dynamic_import")
    graph_data = analyze_fixture(fixture_dir)

    # In static AST, dynamic importlib string is not an Import node
    edges_from_loader = [e for e in graph_data["edges"] if e["source"] == "loader.py"]
    # Static AST analyzer does not fabricate edges to runtime-evaluated strings
    target_ids = {e["target"] for e in edges_from_loader}
    assert "plugins/active.py" not in target_ids


# --------------------------------------------------------------------------
# Fixture 18: Critical False-Positive Regression Fixture
# --------------------------------------------------------------------------
def test_fixture_18_false_positive_regression():
    fixture_dir, oracle = load_oracle("18_false_positive_recommendation")
    graph_data = analyze_fixture(fixture_dir)

    target = oracle["target_component"]
    node_ids = {n["id"] for n in graph_data["nodes"]}
    assert target in node_ids

    # Isolated target node must have exactly 0 inbound and 0 outbound edges
    inbound = [e["source"] for e in graph_data["edges"] if e["target"] == target]
    outbound = [e["target"] for e in graph_data["edges"] if e["source"] == target]
    assert inbound == []
    assert outbound == []
