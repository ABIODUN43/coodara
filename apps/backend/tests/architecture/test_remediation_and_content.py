from __future__ import annotations

import pytest
from app.architecture.remediation import ArchitectureRemediationEngine
from app.schemas.architecture import ArchitectureRemediationRequest


@pytest.mark.asyncio
async def test_remediation_engine_rule_fallback_for_circular_dependency() -> None:
    engine = ArchitectureRemediationEngine()
    request = ArchitectureRemediationRequest(
        file_path="src/services/order_service.py",
        category="circular_dependency",
        issue_description="Circular dependency detected between OrderService and PaymentService",
        current_code=(
            "from src.services.payment_service import PaymentService\n\n"
            "class OrderService:\n"
            "    def __init__(self):\n"
            "        self.payment = PaymentService()\n"
        ),
        language="python",
    )

    response = await engine.remediate(request)
    assert response.file_path == "src/services/order_service.py"
    assert any("Dependency Inversion" in r for r in response.applied_rules)
    assert len(response.refactored_code) > len(request.current_code)
    assert "@@" in response.diff or len(response.diff) > 0
    assert "Decoupled cyclic dependency" in response.explanation


@pytest.mark.asyncio
async def test_remediation_engine_rule_fallback_for_layer_violation() -> None:
    engine = ArchitectureRemediationEngine()
    request = ArchitectureRemediationRequest(
        file_path="src/controllers/order_controller.py",
        category="layer_violation",
        issue_description="Direct DB access in presentation controller",
        current_code=(
            "from app.db import raw_session\n\n"
            "def get_order(id):\n"
            "    return raw_session.execute('SELECT * FROM orders')\n"
        ),
        language="python",
    )

    response = await engine.remediate(request)
    assert any("Layer Boundary" in r for r in response.applied_rules)
    assert "Presentation Layer strictly delegates" in response.refactored_code


@pytest.mark.asyncio
async def test_remediate_endpoint_execution() -> None:
    from app.api.v1.architecture import remediate_architecture_violation
    from unittest.mock import MagicMock

    request = ArchitectureRemediationRequest(
        file_path="src/controllers/order_controller.py",
        category="layer_violation",
        issue_description="Direct DB execution in controller",
        current_code="import db\ndef index(): return db.query()",
        language="python",
    )
    dummy_member = MagicMock()
    dummy_db = MagicMock()

    result = await remediate_architecture_violation(
        organization_id=1,
        repository_id=1,
        payload=request,
        member=dummy_member,
        db=dummy_db,
    )
    assert result.file_path == "src/controllers/order_controller.py"
    assert len(result.refactored_code) > 0
    assert len(result.diff) > 0
    assert len(result.applied_rules) > 0


@pytest.mark.asyncio
async def test_file_content_endpoint_traversal_and_success(tmp_path) -> None:
    from app.api.v1.architecture import get_architecture_file_content
    from fastapi import HTTPException
    from unittest.mock import MagicMock, patch

    # Create dummy repository file in persistent storage
    dummy_repo_dir = tmp_path / "data" / "repositories" / "42"
    dummy_repo_dir.mkdir(parents=True, exist_ok=True)
    sample_file = dummy_repo_dir / "src" / "sample.py"
    sample_file.parent.mkdir(parents=True, exist_ok=True)
    sample_file.write_text("print('hello architecture')", encoding="utf-8")

    dummy_member = MagicMock()
    dummy_db = MagicMock()

    with patch("app.api.v1.architecture.get_repository_storage_path", return_value=dummy_repo_dir):
        # 1. Successful fetch
        res = await get_architecture_file_content(
            organization_id=1,
            repository_id=42,
            path="src/sample.py",
            member=dummy_member,
            db=dummy_db,
        )
        assert res.name == "sample.py"
        assert res.language == "py"
        assert "hello architecture" in res.content
        assert res.total_lines == 1

        # 2. Path traversal rejection
        with pytest.raises(HTTPException) as exc_info:
            await get_architecture_file_content(
                organization_id=1,
                repository_id=42,
                path="../../etc/passwd",
                member=dummy_member,
                db=dummy_db,
            )
        assert exc_info.value.status_code == 400

        # 3. File not found
        with pytest.raises(HTTPException) as exc_info:
            await get_architecture_file_content(
                organization_id=1,
                repository_id=42,
                path="src/non_existent.py",
                member=dummy_member,
                db=dummy_db,
            )
        assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_get_architecture_file_tree_lazy_and_no_path_assertion_error(tmp_path) -> None:
    """Regression test: Ensure file tree does not trigger FastAPI Path collision and does not load file contents into memory."""
    import json
    from app.api.v1.architecture import get_architecture_file_tree
    from unittest.mock import AsyncMock, MagicMock, patch

    dummy_repo_dir = tmp_path / "data" / "repositories" / "42"
    sample_file = dummy_repo_dir / "clients" / "src" / "sample.py"
    sample_file.parent.mkdir(parents=True, exist_ok=True)
    sample_file.write_text("class HeavyComponent:\n    pass\n" * 100, encoding="utf-8")

    dummy_member = MagicMock()
    dummy_db = MagicMock()

    # Mock snapshot with AST graph
    mock_snapshot = MagicMock()
    mock_snapshot.graph = json.dumps({
        "version": 1,
        "nodes": [{"id": "clients/src/sample.py", "type": "module"}],
        "edges": [],
    })
    mock_snapshot.issues = []

    with (
        patch("app.api.v1.architecture.get_repository_storage_path", return_value=dummy_repo_dir),
        patch("app.api.v1.architecture._create_architecture_service") as mock_svc_cls,
    ):
        mock_svc = mock_svc_cls.return_value
        mock_svc.get_architecture = AsyncMock(return_value=mock_snapshot)

        tree = await get_architecture_file_tree(
            organization_id=1,
            repository_id=42,
            member=dummy_member,
            db=dummy_db,
        )

        assert tree.total_files == 1
        assert tree.root.children is not None
        assert len(tree.root.children) == 1
        assert tree.root.children[0].name == "clients"

        # Walk tree to find file node and verify content is None (lazy loading)
        def find_file(node):
            if node.type == "file":
                return node
            if node.children:
                for c in node.children:
                    res = find_file(c)
                    if res:
                        return res
            return None

        file_node = find_file(tree.root)
        assert file_node is not None
        assert file_node.name == "sample.py"
        assert file_node.content is None
        assert file_node.size > 0


@pytest.mark.asyncio
async def test_get_architecture_file_tree_ephemeral_checkout_recovery(tmp_path) -> None:
    """Ensure repository checkout is recovered via ensure_repository_checkout when disk is empty after ephemeral container restart."""
    import json
    from app.api.v1.architecture import get_architecture_file_tree
    from unittest.mock import AsyncMock, MagicMock, patch

    empty_repo_dir = tmp_path / "data" / "repositories" / "99"
    # Directory does not exist on disk initially (ephemeral restart)

    populated_repo_dir = tmp_path / "recovered" / "99"
    sample_file = populated_repo_dir / "src" / "app.py"
    sample_file.parent.mkdir(parents=True, exist_ok=True)
    sample_file.write_text("print('recovered')", encoding="utf-8")

    dummy_member = MagicMock()
    dummy_db = MagicMock()

    mock_repo_model = MagicMock()
    mock_repo_model.clone_url = "https://github.com/org/repo.git"
    mock_repo_model.default_branch = "main"

    mock_snapshot = MagicMock()
    mock_snapshot.graph = json.dumps({
        "version": 1,
        "nodes": [{"id": "src/app.py", "type": "module"}],
        "edges": [],
    })
    mock_snapshot.issues = []

    with (
        patch("app.api.v1.architecture.get_repository_storage_path", return_value=empty_repo_dir),
        patch("app.api.v1.architecture.ensure_repository_checkout", return_value=populated_repo_dir) as mock_ensure,
        patch("app.api.v1.architecture._create_architecture_service") as mock_svc_cls,
    ):
        mock_svc = mock_svc_cls.return_value
        mock_svc.repository_repository.get_by_organization_and_id = AsyncMock(return_value=mock_repo_model)
        mock_svc.get_architecture = AsyncMock(return_value=mock_snapshot)

        tree = await get_architecture_file_tree(
            organization_id=1,
            repository_id=99,
            member=dummy_member,
            db=dummy_db,
        )

        mock_ensure.assert_called_once_with(
            repository_id=99,
            clone_url="https://github.com/org/repo.git",
            branch="main",
        )
        assert tree is not None

