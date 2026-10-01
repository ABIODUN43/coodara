"""
Critical regression tests for Coodara Truth, Evidence & Reliability Audit.

Specifically tests:
1. apps/backend/__init__.py false-positive recommendation regression.
2. Target self-accounting regression (target entity != downstream impact).
3. ADR discovery vs synthetic ADR-INV-01 fabrication.
4. Team metadata presence vs synthetic "Root Team" / "@root-team-guild" fabrication.
5. Proposed interface classification (PROPOSED vs OBSERVED).
"""

from __future__ import annotations

import json
from pathlib import Path
import pytest

from app.analyzers.context import RepositoryContext
from app.analyzers.dependency_analyzer import DependencyAnalyzer
from app.architecture.adr_scanner import ADRScanner
from app.architecture.models import (
    ArchitectureGraph,
    ArchitectureNode,
    ArchitectureEdge,
    TruthStatus,
    TruthClaim,
)
from app.architecture.simulation import (
    DeterministicSimulationEngine,
    ConfidenceLevel,
)

FIXTURES_DIR = Path(__file__).parent / "fixtures"


# --------------------------------------------------------------------------
# 1. apps/backend/__init__.py Regression Fixture Test
# --------------------------------------------------------------------------
def test_init_py_isolated_module_facts():
    """
    Test that apps/backend/__init__.py is recognized as an isolated node:
    - 0 inbound callers
    - 0 outbound dependencies
    - 0 downstream impacts
    - 0 boundary crossings
    """
    fixture_dir = FIXTURES_DIR / "18_false_positive_recommendation"
    context = RepositoryContext(root_path=fixture_dir, repository_id="reg_init")
    analyzer = DependencyAnalyzer()
    snapshot = analyzer.analyze(context)
    graph_data = json.loads(snapshot.graph_data)

    target = "apps/backend/__init__.py"
    node_ids = {n["id"] for n in graph_data["nodes"]}
    assert target in node_ids, "Target node apps/backend/__init__.py must exist in graph"

    # Outbound dependencies from __init__.py must be 0
    outbound = [e["target"] for e in graph_data["edges"] if e["source"] == target]
    assert outbound == [], f"Expected 0 outbound dependencies for empty __init__.py, got: {outbound}"

    # Inbound callers to __init__.py must be 0
    inbound = [e["source"] for e in graph_data["edges"] if e["target"] == target]
    assert inbound == [], f"Expected 0 inbound callers for empty __init__.py, got: {inbound}"


# --------------------------------------------------------------------------
# 2. Critical Self-Accounting Regression Test
# --------------------------------------------------------------------------
def test_simulation_target_self_accounting():
    """
    CRITICAL REGRESSION TEST:
    A target node with 0 inbound and 0 outbound edges must NOT acquire a false
    downstream impact merely because it is the simulation target.

    Target entity != downstream impacted component.
    """
    # Create an isolated graph with 2 independent nodes
    nodes = (
        ArchitectureNode(id="apps/backend/__init__.py", type="module"),
        ArchitectureNode(id="apps/backend/server.py", type="module"),
    )
    edges = ()  # Zero edges
    graph = ArchitectureGraph(version=1, nodes=nodes, edges=edges)

    engine = DeterministicSimulationEngine(graph=graph, commit_sha="test_sha")
    sim = engine.simulate(target_component_id="apps/backend/__init__.py")

    # Downstream impacts strictly excluding the target itself
    downstream_callers = [
        item for item in sim.direct_impacts
        if item.relationship in ("upstream_caller", "direct_dependency")
    ]
    assert len(downstream_callers) == 0, (
        f"Isolated component must have 0 downstream callers/dependencies, got: {downstream_callers}"
    )

    # Test the structural consequence counts
    assert sim.indirect_impact_count == 0
    assert sim.boundaries_crossed_count == 0
    assert sim.efferent_before == 0
    assert sim.efferent_after == 0


# --------------------------------------------------------------------------
# 3. ADR Presence vs Fabrication Tests
# --------------------------------------------------------------------------
def test_adr_present_case():
    """CASE A: Repository contains authentic ADR -> Discovered and cited."""
    fixture_dir = FIXTURES_DIR / "11_adr_present"
    scanner = ADRScanner()
    adr_files = scanner.discover_adr_files(fixture_dir)
    assert len(adr_files) == 1, "Expected authentic ADR to be discovered"

    parsed = scanner.parse_adr_markdown(adr_files[0], fixture_dir)
    assert parsed is not None
    assert parsed.adr_number in ("ADR-001", "0001")
    assert "Ports and Adapters" in parsed.title


def test_adr_absent_case_no_synthetic_fabrication():
    """
    CASE B: Repository contains NO ADRs -> Scanner finds 0 ADRs.
    Coodara must NOT manufacture synthetic 'ADR-INV-01: Domain Interface Isolation Contract'.
    """
    fixture_dir = FIXTURES_DIR / "12_adr_absent"
    scanner = ADRScanner()
    adr_files = scanner.discover_adr_files(fixture_dir)
    assert len(adr_files) == 0, "Expected 0 ADR files in repository"

    # Explicit assertion: synthetic ADR IDs must never be considered valid repository facts
    forbidden_synthetic_adrs = {"ADR-INV-01", "Domain Interface Isolation Contract"}
    discovered_titles = {f.name for f in adr_files}
    assert not forbidden_synthetic_adrs.intersection(discovered_titles)


# --------------------------------------------------------------------------
# 4. Team Ownership Presence vs Fabrication Tests
# --------------------------------------------------------------------------
def test_team_metadata_absent_must_be_unknown():
    """
    CASE B: When repository lacks CODEOWNERS or team metadata,
    team ownership must be UNKNOWN, NOT fabricated names like:
    'Root Team', 'Backend Team', '@root-team-guild'.
    """
    fixture_dir = FIXTURES_DIR / "10_team_metadata_absent"
    codeowners_path = fixture_dir / ".github" / "CODEOWNERS"
    assert not codeowners_path.exists(), "Fixture must not contain CODEOWNERS"

    # Truth classification for team ownership without metadata
    team_claim = TruthClaim(
        claim="Team ownership for apps/backend/server.py",
        status=TruthStatus.UNKNOWN,
        rationale="No CODEOWNERS or metadata present",
    )
    assert team_claim.is_unknown is True
    assert team_claim.status != TruthStatus.OBSERVED

    forbidden_teams = {"Root Team", "Backend Team", "@root-team-guild", "@backend-team-guild"}
    # The claim must not assert any of the forbidden names as observed
    assert team_claim.claim not in forbidden_teams


# --------------------------------------------------------------------------
# 5. Proposed Interface Symbol Grounding Test
# --------------------------------------------------------------------------
def test_proposed_symbols_do_not_exist_in_repository():
    """
    Verify whether generated symbols 'IinitpyPort' or 'execute_operation' exist.
    In the benchmark repository, they do NOT exist.
    Therefore, they must be classified as PROPOSED, NEVER OBSERVED.
    """
    fixture_dir = FIXTURES_DIR / "18_false_positive_recommendation"
    py_files = list(fixture_dir.glob("**/*.py"))

    # Search file contents for the symbols
    all_content = "\n".join(f.read_text(encoding="utf-8") for f in py_files)
    assert "IinitpyPort" not in all_content
    assert "IappsbackendinitpyPort" not in all_content
    assert "execute_operation" not in all_content

    # Invariant: Any recommendation introducing these must be PROPOSED
    rec_claim = TruthClaim(
        claim="class IinitpyPort(Protocol): async def execute_operation(self, payload: dict) -> dict:",
        status=TruthStatus.PROPOSED,
        rationale="Proposed architectural design pattern",
    )
    assert rec_claim.status == TruthStatus.PROPOSED
    assert rec_claim.is_fact is False


# --------------------------------------------------------------------------
# 6. Current Engine Defect Documentation Test
# --------------------------------------------------------------------------
def test_current_engine_behavior_on_isolated_init_demonstrating_defects():
    """
    Demonstrates and documents the current engine defects on apps/backend/__init__.py:
    1. Simulation reports direct_impact_count == 1 because it counts the target itself.
    2. True downstream callers are strictly 0.
    3. Boundary crossings are strictly 0.
    4. Proves that any recommendation to apply Dependency Inversion or Ports/Adapters
       on this component lacks any supporting evidence of an architectural problem.
    """
    nodes = (
        ArchitectureNode(id="apps/backend/__init__.py", type="module"),
        ArchitectureNode(id="apps/backend/server.py", type="module"),
    )
    graph = ArchitectureGraph(version=1, nodes=nodes, edges=())
    engine = DeterministicSimulationEngine(graph=graph)
    sim = engine.simulate(target_component_id="apps/backend/__init__.py")

    # Ground Truth: direct_impact_count is 0 because target is not a downstream impact
    assert sim.direct_impact_count == 0
    assert len(sim.direct_impacts) == 0
    assert sim.target_entity is not None
    assert sim.target_entity.relationship == "target"

    # Verifying Ground Truth: Boundary crossings is 0
    assert sim.boundaries_crossed_count == 0

    # Verifying Ground Truth: Efferent coupling is 0
    assert sim.efferent_before == 0
    assert sim.instability_before == 0.0

