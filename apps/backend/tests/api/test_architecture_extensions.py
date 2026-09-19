from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch
from pathlib import Path

import pytest
from app.api.v1.architecture import (
    create_architecture_decision,
    create_architecture_rule,
    delete_architecture_rule,
    evaluate_architecture_quality_gate,
    get_architecture_commits,
    get_architecture_decisions,
    get_architecture_evolution,
    get_architecture_file_tree,
    get_architecture_rules,
    get_architecture_commit_diff,
    analyze_architectural_impact,
    list_architecture_simulations,
)
from app.models.architecture import ArchitectureDecision, ArchitectureRule, ArchitectureSimulation
from app.schemas.architecture import (
    ArchitecturalImpactAnalysisRequest,
    ArchitectureDecisionCreateRequest,
    ArchitectureRuleCreateRequest,
)
from app.core.git_service import GitCommitInfo, GitCommitDiffSummary


@pytest.fixture
def mock_db() -> MagicMock:
    db = MagicMock()
    db.commit = AsyncMock()
    db.rollback = AsyncMock()
    db.refresh = AsyncMock()
    db.add = MagicMock()
    db.delete = AsyncMock()
    db.execute = AsyncMock()
    return db


@pytest.mark.asyncio
async def test_get_architecture_commits_empty_when_not_git(mock_db: MagicMock) -> None:
    with patch("app.api.v1.architecture.GitRepositoryService") as mock_git_cls:
        mock_git = mock_git_cls.return_value
        mock_git.is_git_repository.return_value = False

        res = await get_architecture_commits(
            organization_id=1,
            repository_id=2,
            db=mock_db,
        )

        assert res.total_count == 0
        assert res.commits == []


@pytest.mark.asyncio
async def test_get_architecture_commits_returns_real_commits(mock_db: MagicMock) -> None:
    fake_commit = GitCommitInfo(
        sha="abcdef1234567890abcdef1234567890abcdef12",
        author="Architect <arch@example.com>",
        timestamp="2026-09-17T07:00:00Z",
        message="feat: Decouple domain services",
    )

    with patch("app.api.v1.architecture.GitRepositoryService") as mock_git_cls:
        mock_git = mock_git_cls.return_value
        mock_git.is_git_repository.return_value = True
        mock_git.list_commits.return_value = [fake_commit]

        res = await get_architecture_commits(
            organization_id=1,
            repository_id=2,
            db=mock_db,
        )

        assert res.total_count == 1
        assert res.commits[0].sha == fake_commit.sha
        assert res.commits[0].short_sha == "abcdef1"
        assert res.commits[0].message == "feat: Decouple domain services"


@pytest.mark.asyncio
async def test_create_and_get_architecture_decisions(mock_db: MagicMock) -> None:
    decision = ArchitectureDecision(
        id=1,
        repository_id=2,
        adr_number="ADR-001",
        title="Event-Driven Core",
        status="accepted",
        decision_date="2026-09-17",
        author="Lead Architect",
        context="High coupling in payment domain.",
        decision="Adopt Kafka event bus.",
        consequences=json.dumps(["Decoupled domains"]),
        affected_components=json.dumps(["orders", "billing"]),
        tags=json.dumps(["architecture", "events"]),
        source_file=None,
    )

    mock_db.execute.return_value.scalar.return_value = 0
    mock_db.refresh.side_effect = lambda obj: setattr(obj, "id", 1)

    req = ArchitectureDecisionCreateRequest(
        title="Event-Driven Core",
        context="High coupling in payment domain.",
        decision="Adopt Kafka event bus.",
        consequences=["Decoupled domains"],
        affected_components=["orders", "billing"],
        tags=["architecture", "events"],
    )

    created = await create_architecture_decision(
        organization_id=1,
        repository_id=2,
        payload=req,
        member=MagicMock(),
        db=mock_db,
    )

    assert created.id == "ADR-001"
    assert created.title == "Event-Driven Core"
    assert "Decoupled domains" in created.consequences
    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()

    # Test GET decisions syncing from ADRScanner
    with patch("app.api.v1.architecture.ADRScanner") as mock_scanner_cls:
        mock_scanner = mock_scanner_cls.return_value
        mock_scanner.sync_adrs_to_db = AsyncMock(return_value=[decision])

        listing = await get_architecture_decisions(
            organization_id=1,
            repository_id=2,
            member=MagicMock(),
            db=mock_db,
        )
        assert listing.total_count == 1
        assert listing.items[0].id == "ADR-001"


@pytest.mark.asyncio
async def test_custom_rule_crud_and_quality_gate(mock_db: MagicMock) -> None:
    rule = ArchitectureRule(
        id=5,
        repository_id=2,
        name="No UI to DB",
        rule_type="disallow_dependency",
        source_pattern="presentation/**",
        target_pattern="persistence/**",
        severity="critical",
        rationale="Controllers must not query DB directly.",
        is_active=True,
    )

    mock_db.refresh.side_effect = lambda obj: setattr(obj, "id", 5)

    rule_req = ArchitectureRuleCreateRequest(
        name="No UI to DB",
        rule_type="disallow_dependency",
        source_pattern="presentation/**",
        target_pattern="persistence/**",
        severity="critical",
        rationale="Controllers must not query DB directly.",
        is_active=True,
    )

    created_rule = await create_architecture_rule(
        organization_id=1,
        repository_id=2,
        payload=rule_req,
        member=MagicMock(),
        db=mock_db,
    )
    assert created_rule.id == 5
    assert created_rule.name == "No UI to DB"

    # Test listing rules
    mock_db.execute.return_value.scalars.return_value.all.return_value = [rule]
    rules_list = await get_architecture_rules(
        organization_id=1,
        repository_id=2,
        member=MagicMock(),
        db=mock_db,
    )
    assert rules_list.total_count == 1
    assert rules_list.rules[0].name == "No UI to DB"

    # Test quality gate evaluation
    with patch("app.api.v1.architecture._create_architecture_service") as mock_svc_cls:
        mock_svc = mock_svc_cls.return_value
        mock_svc.get_architecture = AsyncMock(return_value=None)

        qg = await evaluate_architecture_quality_gate(
            organization_id=1,
            repository_id=2,
            member=MagicMock(),
            db=mock_db,
        )
        assert qg.passed is True
        assert qg.critical_violations_count == 0

    # Test delete rule
    mock_db.execute.return_value.scalar_one_or_none.return_value = rule
    await delete_architecture_rule(
        organization_id=1,
        repository_id=2,
        rule_id=5,
        member=MagicMock(),
        db=mock_db,
    )
    mock_db.delete.assert_called_once_with(rule)


@pytest.mark.asyncio
async def test_get_architecture_file_tree_zero_synthetic_mocks(mock_db: MagicMock, tmp_path: Path) -> None:
    with (
        patch("app.api.v1.architecture._create_architecture_service") as mock_svc_cls,
        patch("app.api.v1.architecture.get_repository_storage_path", return_value=tmp_path),
    ):
        mock_svc = mock_svc_cls.return_value
        mock_svc.get_architecture = AsyncMock(return_value=None)

        # Empty directory
        tree = await get_architecture_file_tree(
            organization_id=1,
            repository_id=2,
            member=MagicMock(),
            db=mock_db,
        )

        assert tree.total_files == 0
        assert tree.total_violations == 0
        assert tree.root.children == []
        assert "Pending" in tree.detected_architecture


@pytest.mark.asyncio
async def test_analyze_architectural_impact_simulation_vertical_slice(mock_db: MagicMock) -> None:
    # Set up mock snapshot with real AST graph
    fake_graph_json = json.dumps({
        "version": 1,
        "nodes": [
            {"id": "apps/api/routes", "type": "service"},
            {"id": "apps/core/services", "type": "module"},
            {"id": "apps/db/models", "type": "database"},
        ],
        "edges": [
            {"source": "apps/api/routes", "target": "apps/core/services", "kind": "imports"},
            {"source": "apps/core/services", "target": "apps/db/models", "kind": "imports"},
        ]
    })
    mock_snapshot = MagicMock()
    mock_snapshot.graph = fake_graph_json
    mock_snapshot.analysis_result = MagicMock()
    mock_snapshot.analysis_result.commit_sha = "feat123"

    mock_db.execute.return_value.scalars.return_value.all.return_value = []

    with patch("app.api.v1.architecture._create_architecture_service") as mock_svc_cls:
        mock_svc = mock_svc_cls.return_value
        mock_svc.get_architecture = AsyncMock(return_value=mock_snapshot)

        req = ArchitecturalImpactAnalysisRequest(
            component_id="apps/core/services",
            proposed_change="Extract database interface port",
        )

        res = await analyze_architectural_impact(
            organization_id=1,
            repository_id=2,
            payload=req,
            member=MagicMock(),
            db=mock_db,
        )

        # 1. Verify simulation metadata
        assert res.simulation_id is not None
        assert res.simulation_id.startswith("SIM-")
        assert res.normalized_intervention == "Extract"

        # 2. Verify separated confidence metrics
        assert res.confidence is not None
        assert res.confidence.structural_confidence == "HIGH"
        assert res.confidence.evidence_confidence == "HIGH"
        assert res.confidence.runtime_confidence == "UNKNOWN"

        # 3. Verify concrete structural facts (NO arbitrary blast-radius percentage)
        assert res.direct_impact_count == 3  # target + caller (routes) + dep (models)
        assert not any("% blast radius" in b for b in res.consequence_bullets)

        # 4. Verify boundary crossings
        assert res.boundaries_crossed_count > 0

        # 5. Verify concrete evidence
        assert len(res.evidence) > 0
        assert any(e.source_type == "graph" for e in res.evidence)

        # 6. Verify experiment was persisted in DB
        assert mock_db.add.called
        assert mock_db.commit.called

