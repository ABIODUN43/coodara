"""
Adversarial Fixture Generator for Coodara Truth, Evidence & Reliability Validation (Phase 6).

Generates 14 adversarial micro-repositories (A to N) in tests/reliability/fixtures/adversarial/
with independent, human-authored oracles to rigorously test:
- High fan-in components
- Deep propagation
- Same-subsystem coupling
- Boundary violations with tiny impact
- Large blast radius without boundary violations
- Multiple paths (no double-counting)
- Cycles
- Empty package __init__.py
- Package re-exports
- Dynamic imports
- Dead / unused modules
- Existing interfaces / protocols
- Existing clean architecture
- Genuine architectural violations
"""

from __future__ import annotations

import json
from pathlib import Path

ADVERSARIAL_DIR = Path(__file__).parent / "fixtures" / "adversarial"

ADVERSARIAL_SPEC = {
    # --------------------------------------------------------------------------
    # A. High fan-in component
    # --------------------------------------------------------------------------
    "adv_01_high_fan_in": {
        "files": {
            "core/shared_service.py": "# Central high-fan-in service\nclass SharedService:\n    pass\n",
            **{
                f"clients/client_{i:02d}.py": f"from core.shared_service import SharedService\ns = SharedService()\n"
                for i in range(1, 13)
            },
        },
        "oracle": {
            "fixture_id": "adv_01_high_fan_in",
            "description": "High fan-in component: 12 independent clients depend on core/shared_service.py",
            "target_component": "core/shared_service.py",
            "expected_inbound_count": 12,
            "expected_outbound_count": 0,
            "expected_direct_impact_count": 12,
            "expected_indirect_impact_count": 0,
            "expected_boundaries_crossed_count": 0,
            "requires_boundary_violation_for_impact": False,
            "has_meaningful_impact": True,
        },
    },

    # --------------------------------------------------------------------------
    # B. Deep propagation (A -> B -> C -> D -> E -> F)
    # --------------------------------------------------------------------------
    "adv_02_deep_propagation": {
        "files": {
            "chain/f.py": "# Leaf node at depth 0\nclass F:\n    pass\n",
            "chain/e.py": "from chain.f import F\nclass E:\n    pass\n",
            "chain/d.py": "from chain.e import E\nclass D:\n    pass\n",
            "chain/c.py": "from chain.d import D\nclass C:\n    pass\n",
            "chain/b.py": "from chain.c import C\nclass B:\n    pass\n",
            "chain/a.py": "from chain.b import B\nclass A:\n    pass\n",
        },
        "oracle": {
            "fixture_id": "adv_02_deep_propagation",
            "description": "Deep linear propagation: a -> b -> c -> d -> e -> f",
            "target_component": "chain/f.py",
            "expected_direct_impacts": ["chain/e.py"],
            "expected_indirect_impacts": ["chain/d.py", "chain/c.py", "chain/b.py", "chain/a.py"],
            "expected_direct_impact_count": 1,
            "expected_indirect_impact_count": 4,
            "expected_max_depth": 5,
            "path": ["chain/a.py", "chain/b.py", "chain/c.py", "chain/d.py", "chain/e.py", "chain/f.py"],
        },
    },

    # --------------------------------------------------------------------------
    # C. High fan-in + no boundary violation
    # --------------------------------------------------------------------------
    "adv_03_high_fan_in_same_subsystem": {
        "files": {
            "subsystem_a/core_service.py": "class CoreService:\n    pass\n",
            **{
                f"subsystem_a/client_{i:02d}.py": f"from subsystem_a.core_service import CoreService\n"
                for i in range(1, 9)
            },
        },
        "oracle": {
            "fixture_id": "adv_03_high_fan_in_same_subsystem",
            "description": "High fan-in within same subsystem: 8 callers depend on core_service with zero boundary violations",
            "target_component": "subsystem_a/core_service.py",
            "expected_direct_impact_count": 8,
            "expected_boundaries_crossed_count": 0,
            "coupling_risk_detected": True,
        },
    },

    # --------------------------------------------------------------------------
    # D. Boundary violation with tiny impact
    # --------------------------------------------------------------------------
    "adv_04_boundary_violation_tiny_impact": {
        "files": {
            "frontend/page.py": "from backend.internal import InternalSecret\ns = InternalSecret()\n",
            "backend/internal.py": "class InternalSecret:\n    pass\n",
        },
        "oracle": {
            "fixture_id": "adv_04_boundary_violation_tiny_impact",
            "description": "Cross-subsystem boundary violation with minimal impact (1 caller only)",
            "target_component": "backend/internal.py",
            "expected_direct_impact_count": 1,
            "expected_indirect_impact_count": 0,
            "expected_boundaries_crossed_count": 1,
            "exaggerated_blast_radius_forbidden": True,
        },
    },

    # --------------------------------------------------------------------------
    # E. Large blast radius with no boundary violation
    # --------------------------------------------------------------------------
    "adv_05_large_blast_radius_no_violation": {
        "files": {
            "analytics/metric_hub.py": "class MetricHub:\n    pass\n",
            **{
                f"analytics/worker_{i:02d}.py": f"from analytics.metric_hub import MetricHub\n"
                for i in range(1, 16)
            },
        },
        "oracle": {
            "fixture_id": "adv_05_large_blast_radius_no_violation",
            "description": "Large blast radius (15 callers) with 0 boundary crossings",
            "target_component": "analytics/metric_hub.py",
            "expected_direct_impact_count": 15,
            "expected_boundaries_crossed_count": 0,
            "large_consequence": True,
        },
    },

    # --------------------------------------------------------------------------
    # F. Multiple paths (Diamond dependency: a -> b -> d, a -> c -> d)
    # --------------------------------------------------------------------------
    "adv_06_multiple_paths": {
        "files": {
            "diamond/d.py": "# Target leaf d\nclass D:\n    pass\n",
            "diamond/b.py": "from diamond.d import D\nclass B:\n    pass\n",
            "diamond/c.py": "from diamond.d import D\nclass C:\n    pass\n",
            "diamond/a.py": "from diamond.b import B\nfrom diamond.c import C\nclass A:\n    pass\n",
        },
        "oracle": {
            "fixture_id": "adv_06_multiple_paths",
            "description": "Diamond dependency: a -> b -> d and a -> c -> d",
            "target_component": "diamond/d.py",
            "expected_direct_impacts": ["diamond/b.py", "diamond/c.py"],
            "expected_indirect_impacts": ["diamond/a.py"],
            "expected_direct_impact_count": 2,
            "expected_indirect_impact_count": 1,
            "expected_total_affected_count": 3,
            "no_double_counting_of_a": True,
            "expected_paths_count": 2,
        },
    },

    # --------------------------------------------------------------------------
    # G. Cycle (a -> b -> c -> a)
    # --------------------------------------------------------------------------
    "adv_07_cycle": {
        "files": {
            "cycle/a.py": "import cycle.b\n",
            "cycle/b.py": "import cycle.c\n",
            "cycle/c.py": "import cycle.a\n",
        },
        "oracle": {
            "fixture_id": "adv_07_cycle",
            "description": "Circular dependency: a -> b -> c -> a",
            "has_cycles": True,
            "cycle_nodes": ["cycle/a.py", "cycle/b.py", "cycle/c.py"],
            "cycle_count": 1,
        },
    },

    # --------------------------------------------------------------------------
    # H. Empty package __init__.py
    # --------------------------------------------------------------------------
    "adv_08_empty_init": {
        "files": {
            "pkg/__init__.py": "",
            "pkg/worker.py": "class Worker:\n    pass\n",
        },
        "oracle": {
            "fixture_id": "adv_08_empty_init",
            "description": "Empty package __init__.py with 0 inbound and 0 outbound edges",
            "target_component": "pkg/__init__.py",
            "expected_direct_impact_count": 0,
            "expected_indirect_impact_count": 0,
            "expected_boundaries_crossed_count": 0,
            "expected_outcome": "NO_INTERVENTION_REQUIRED",
        },
    },

    # --------------------------------------------------------------------------
    # I. Re-export package
    # --------------------------------------------------------------------------
    "adv_09_reexport": {
        "files": {
            "library/internal.py": "class CoreWidget:\n    pass\n",
            "library/__init__.py": "from library.internal import CoreWidget\n",
            "consumer.py": "from library import CoreWidget\nw = CoreWidget()\n",
        },
        "oracle": {
            "fixture_id": "adv_09_reexport",
            "description": "Re-export through package __init__.py: consumer imports CoreWidget from library",
            "nodes": ["library/internal.py", "library/__init__.py", "consumer.py"],
            "expected_reexport_resolution": True,
        },
    },

    # --------------------------------------------------------------------------
    # J. Dynamic import
    # --------------------------------------------------------------------------
    "adv_10_dynamic_import": {
        "files": {
            "core/plugin_loader.py": (
                "import importlib\n"
                "def load_plugin(name: str):\n"
                "    return importlib.import_module(f'plugins.{name}')\n"
            ),
            "plugins/custom_driver.py": "class CustomDriver:\n    pass\n",
        },
        "oracle": {
            "fixture_id": "adv_10_dynamic_import",
            "description": "Dynamic import via importlib.import_module",
            "static_edge_exists": False,
            "dynamic_uncertainty_preserved": True,
            "cannot_assert_zero_certainty": True,
        },
    },

    # --------------------------------------------------------------------------
    # K. Dead / unused module
    # --------------------------------------------------------------------------
    "adv_11_dead_unused_module": {
        "files": {
            "legacy/dead_util.py": "# Completely unreferenced legacy file\ndef old_function():\n    pass\n",
            "app/active_service.py": "# Main active service\nclass ActiveService:\n    pass\n",
        },
        "oracle": {
            "fixture_id": "adv_11_dead_unused_module",
            "description": "Dead unused module with 0 inbound callers across repository",
            "target_component": "legacy/dead_util.py",
            "expected_direct_impact_count": 0,
            "expected_indirect_impact_count": 0,
            "expected_outcome": "NO_INTERVENTION_REQUIRED",
        },
    },

    # --------------------------------------------------------------------------
    # L. Existing interface / Protocol
    # --------------------------------------------------------------------------
    "adv_12_existing_interface": {
        "files": {
            "billing/gateway.py": (
                "from typing import Protocol\n\n"
                "class PaymentGateway(Protocol):\n"
                "    def process_payment(self, amount: int) -> bool:\n"
                "        ...\n"
            ),
            "billing/stripe.py": (
                "from billing.gateway import PaymentGateway\n\n"
                "class StripeGateway(PaymentGateway):\n"
                "    def process_payment(self, amount: int) -> bool:\n"
                "        return True\n"
            ),
            "billing/checkout.py": (
                "from billing.gateway import PaymentGateway\n\n"
                "class CheckoutService:\n"
                "    def __init__(self, gw: PaymentGateway):\n"
                "        self.gw = gw\n"
            ),
        },
        "oracle": {
            "fixture_id": "adv_12_existing_interface",
            "description": "Repository already uses Protocol / Dependency Inversion",
            "target_component": "billing/gateway.py",
            "already_has_interface": True,
            "do_not_recommend_duplicate_interface": True,
        },
    },

    # --------------------------------------------------------------------------
    # M. Existing good architecture
    # --------------------------------------------------------------------------
    "adv_13_good_architecture": {
        "files": {
            "domain/model.py": "class Order:\n    pass\n",
            "domain/ports.py": (
                "from typing import Protocol\n"
                "from domain.model import Order\n\n"
                "class OrderRepositoryPort(Protocol):\n"
                "    def save(self, order: Order) -> None:\n"
                "        ...\n"
            ),
            "domain/service.py": (
                "from domain.ports import OrderRepositoryPort\n"
                "from domain.model import Order\n\n"
                "class OrderService:\n"
                "    def __init__(self, repo: OrderRepositoryPort):\n"
                "        self.repo = repo\n"
            ),
            "infrastructure/sql_repo.py": (
                "from domain.ports import OrderRepositoryPort\n"
                "from domain.model import Order\n\n"
                "class SqlOrderRepository(OrderRepositoryPort):\n"
                "    def save(self, order: Order) -> None:\n"
                "        pass\n"
            ),
            "api/controller.py": (
                "from domain.service import OrderService\n\n"
                "class OrderController:\n"
                "    def __init__(self, svc: OrderService):\n"
                "        self.svc = svc\n"
            ),
        },
        "oracle": {
            "fixture_id": "adv_13_good_architecture",
            "description": "Clean Ports & Adapters architecture with strict inward dependency flow",
            "target_component": "domain/service.py",
            "boundary_violations_count": 0,
            "is_clean_architecture": True,
            "expected_outcome": "NO_INTERVENTION_REQUIRED",
        },
    },

    # --------------------------------------------------------------------------
    # N. Actual architectural violation
    # --------------------------------------------------------------------------
    "adv_14_actual_violation": {
        "files": {
            "database/connection.py": "class DatabaseConnection:\n    pass\n",
            "domain/order_entity.py": (
                "# VIOLATION: Domain entity directly imports database connection layer!\n"
                "from database.connection import DatabaseConnection\n\n"
                "class OrderEntity:\n"
                "    def __init__(self):\n"
                "        self.db = DatabaseConnection()\n"
            ),
            "api/order_routes.py": (
                "from domain.order_entity import OrderEntity\n"
                "class OrderRoutes:\n"
                "    pass\n"
            ),
            "workers/billing_worker.py": (
                "from domain.order_entity import OrderEntity\n"
                "class BillingWorker:\n"
                "    pass\n"
            ),
        },
        "oracle": {
            "fixture_id": "adv_14_actual_violation",
            "description": "Genuine architectural violation: domain entity directly couples to database layer with 2 downstream consumers",
            "target_component": "domain/order_entity.py",
            "has_actual_problem": True,
            "expected_direct_impact_count": 2,
            "expected_boundaries_crossed_count": 1,
            "expected_intervention_required": True,
            "expected_pattern": "Port / Adapter & Dependency Inversion Pattern",
        },
    },
}


def generate_all_adversarial() -> None:
    ADVERSARIAL_DIR.mkdir(parents=True, exist_ok=True)
    for fix_id, spec in ADVERSARIAL_SPEC.items():
        fix_dir = ADVERSARIAL_DIR / fix_id
        fix_dir.mkdir(parents=True, exist_ok=True)

        for rel_file, content in spec["files"].items():
            file_path = fix_dir / rel_file
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_text(content, encoding="utf-8")

        oracle_path = fix_dir / "oracle.json"
        oracle_path.write_text(json.dumps(spec["oracle"], indent=2), encoding="utf-8")

    print(f"Successfully generated all {len(ADVERSARIAL_SPEC)} adversarial fixtures at {ADVERSARIAL_DIR}")


if __name__ == "__main__":
    generate_all_adversarial()
