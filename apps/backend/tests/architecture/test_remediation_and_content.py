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

