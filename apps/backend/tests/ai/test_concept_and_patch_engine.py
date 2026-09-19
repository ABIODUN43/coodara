"""
Unit tests for Concept Search and Patch Generator Engines.
"""

from app.ai.tools.concept_search import search_architecture_concepts
from app.ai.tools.patch_engine import generate_architecture_patch
from app.ai.tools.symbol_engine import SymbolDefinition, SymbolKind


def test_search_architecture_concepts():
    symbols = [
        SymbolDefinition(
            name="AuthManager",
            qualified_name="AuthManager.verify_jwt_token",
            kind=SymbolKind.METHOD,
            file_path="app/core/security/auth.py",
            line_number=15,
            end_line=30,
            docstring="Validates bearer JWT tokens and RBAC permissions.",
        ),
        SymbolDefinition(
            name="CeleryWorker",
            qualified_name="CeleryWorker.dispatch_task",
            kind=SymbolKind.METHOD,
            file_path="app/workers/celery_app.py",
            line_number=10,
            end_line=25,
            docstring="Dispatches async background task queues.",
        ),
    ]

    res = search_architecture_concepts("Where is authentication and JWT token validation implemented?", symbols)
    assert res.matches_count >= 1
    assert res.identified_concept == "Authentication & Security"
    assert res.matches[0].symbol_name == "AuthManager.verify_jwt_token"


def test_generate_architecture_patch():
    patch = generate_architecture_patch("app/services/order_coordinator.py", affected_files=["app/api/orders.py"])
    assert "class IOrderCoordinator(ABC):" in patch.unified_diff
    assert "app/domain/interfaces/order_coordinator_interface.py" in patch.affected_files[0]
    assert len(patch.validation_steps) == 4
