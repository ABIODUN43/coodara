"""
Ground-truth fixture generator for Coodara Truth, Evidence & Reliability Audit.

Generates 18 controlled miniature repositories with independent, human-authored
oracles verifying deterministic facts, graph topology, metrics, boundaries,
ADRs, team ownership, and false-positive regressions.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

FIXTURES_DIR = Path(__file__).parent / "fixtures"


FIXTURES_SPEC = {
    "01_single_dependency": {
        "files": {
            "a.py": "import b\n",
            "b.py": "# leaf node b\n",
        },
        "oracle": {
            "fixture_id": "01_single_dependency",
            "description": "Direct single dependency: a imports b",
            "nodes": ["a.py", "b.py"],
            "edges": [{"source": "a.py", "target": "b.py", "kind": "import"}],
            "direct_dependencies": {"a.py": ["b.py"], "b.py": []},
            "inbound_callers": {"a.py": [], "b.py": ["a.py"]},
            "transitive_dependencies": {"a.py": ["b.py"], "b.py": []},
            "has_cycles": False,
            "isolated_nodes": [],
        },
    },
    "02_zero_dependency": {
        "files": {
            "a.py": "# completely isolated a\n",
            "b.py": "# completely isolated b\n",
        },
        "oracle": {
            "fixture_id": "02_zero_dependency",
            "description": "Two completely disconnected modules",
            "nodes": ["a.py", "b.py"],
            "edges": [],
            "direct_dependencies": {"a.py": [], "b.py": []},
            "inbound_callers": {"a.py": [], "b.py": []},
            "transitive_dependencies": {"a.py": [], "b.py": []},
            "has_cycles": False,
            "isolated_nodes": ["a.py", "b.py"],
        },
    },
    "03_transitive_dependency": {
        "files": {
            "a.py": "import b\n",
            "b.py": "import c\n",
            "c.py": "# leaf c\n",
        },
        "oracle": {
            "fixture_id": "03_transitive_dependency",
            "description": "Linear dependency chain a -> b -> c",
            "nodes": ["a.py", "b.py", "c.py"],
            "edges": [
                {"source": "a.py", "target": "b.py", "kind": "import"},
                {"source": "b.py", "target": "c.py", "kind": "import"},
            ],
            "direct_dependencies": {"a.py": ["b.py"], "b.py": ["c.py"], "c.py": []},
            "inbound_callers": {"a.py": [], "b.py": ["a.py"], "c.py": ["b.py"]},
            "transitive_dependencies": {
                "a.py": ["b.py", "c.py"],
                "b.py": ["c.py"],
                "c.py": [],
            },
            "shortest_paths": {"a.py->c.py": ["a.py", "b.py", "c.py"]},
            "has_cycles": False,
        },
    },
    "04_cycle": {
        "files": {
            "a.py": "import b\n",
            "b.py": "import c\n",
            "c.py": "import a\n",
        },
        "oracle": {
            "fixture_id": "04_cycle",
            "description": "Circular dependency loop a -> b -> c -> a",
            "nodes": ["a.py", "b.py", "c.py"],
            "edges": [
                {"source": "a.py", "target": "b.py", "kind": "import"},
                {"source": "b.py", "target": "c.py", "kind": "import"},
                {"source": "c.py", "target": "a.py", "kind": "import"},
            ],
            "has_cycles": True,
            "cycle_count": 1,
            "cycle_nodes": ["a.py", "b.py", "c.py"],
        },
    },
    "05_multiple_paths": {
        "files": {
            "a.py": "import b\nimport c\n",
            "b.py": "import d\n",
            "c.py": "import d\n",
            "d.py": "# sink d\n",
        },
        "oracle": {
            "fixture_id": "05_multiple_paths",
            "description": "Diamond dependency graph with multiple paths from a to d",
            "nodes": ["a.py", "b.py", "c.py", "d.py"],
            "edges": [
                {"source": "a.py", "target": "b.py", "kind": "import"},
                {"source": "a.py", "target": "c.py", "kind": "import"},
                {"source": "b.py", "target": "d.py", "kind": "import"},
                {"source": "c.py", "target": "d.py", "kind": "import"},
            ],
            "direct_dependencies": {"a.py": ["b.py", "c.py"]},
            "transitive_dependencies": {"a.py": ["b.py", "c.py", "d.py"]},
            "distinct_paths_a_to_d": [
                ["a.py", "b.py", "d.py"],
                ["a.py", "c.py", "d.py"],
            ],
            "has_cycles": False,
        },
    },
    "06_cross_subsystem_dependency": {
        "files": {
            "apps/frontend/client.py": "import apps.backend.api as api\n",
            "apps/backend/api.py": "# backend api endpoint\n",
        },
        "oracle": {
            "fixture_id": "06_cross_subsystem_dependency",
            "description": "Dependency crossing structural boundaries from frontend to backend",
            "nodes": ["apps/frontend/client.py", "apps/backend/api.py"],
            "subsystems": {
                "apps/frontend/client.py": "apps/frontend",
                "apps/backend/api.py": "apps/backend",
            },
            "cross_boundary_edges": [
                {
                    "source": "apps/frontend/client.py",
                    "target": "apps/backend/api.py",
                    "from_subsystem": "apps/frontend",
                    "to_subsystem": "apps/backend",
                }
            ],
            "boundary_crossings_count": 1,
        },
    },
    "07_no_boundary_violation": {
        "files": {
            "apps/backend/service.py": "import apps.backend.repository as repo\n",
            "apps/backend/repository.py": "# db repository\n",
        },
        "oracle": {
            "fixture_id": "07_no_boundary_violation",
            "description": "Intra-subsystem dependency within backend",
            "nodes": ["apps/backend/service.py", "apps/backend/repository.py"],
            "subsystems": {
                "apps/backend/service.py": "apps/backend",
                "apps/backend/repository.py": "apps/backend",
            },
            "cross_boundary_edges": [],
            "boundary_crossings_count": 0,
        },
    },
    "08_boundary_violation": {
        "files": {
            "apps/core/domain.py": "import apps.adapters.database as db\n",
            "apps/adapters/database.py": "# outer database adapter\n",
        },
        "oracle": {
            "fixture_id": "08_boundary_violation",
            "description": "Forbidden inversion violation: core domain imports outer infrastructure adapter",
            "nodes": ["apps/core/domain.py", "apps/adapters/database.py"],
            "forbidden_edge": {
                "source": "apps/core/domain.py",
                "target": "apps/adapters/database.py",
            },
            "is_architectural_violation": True,
        },
    },
    "09_team_metadata_present": {
        "files": {
            ".github/CODEOWNERS": "apps/backend/ @platform-core-team\n",
            "apps/backend/server.py": "# server entrypoint\n",
        },
        "oracle": {
            "fixture_id": "09_team_metadata_present",
            "description": "Authentic team ownership metadata explicitly defined in CODEOWNERS",
            "nodes": ["apps/backend/server.py"],
            "has_team_metadata": True,
            "expected_team": "@platform-core-team",
            "truth_status": "OBSERVED",
        },
    },
    "10_team_metadata_absent": {
        "files": {
            "apps/backend/server.py": "# server without CODEOWNERS or metadata\n",
        },
        "oracle": {
            "fixture_id": "10_team_metadata_absent",
            "description": "Repository with zero team ownership metadata",
            "nodes": ["apps/backend/server.py"],
            "has_team_metadata": False,
            "expected_team_status": "UNKNOWN",
            "forbidden_fabricated_teams": [
                "Root Team",
                "Backend Team",
                "@root-team-guild",
                "@backend-team-guild",
            ],
        },
    },
    "11_adr_present": {
        "files": {
            "docs/adr/0001-use-ports-and-adapters.md": "# 1. Use Ports and Adapters\n\n## Status\nAccepted\n\n## Context\nDecouple core domain.\n\n## Decision\nUse Ports.\n",
            "apps/service.py": "# service implementation\n",
        },
        "oracle": {
            "fixture_id": "11_adr_present",
            "description": "Repository with authentic Markdown Architectural Decision Record",
            "nodes": ["apps/service.py"],
            "has_authentic_adrs": True,
            "adr_count": 1,
            "expected_adrs": [{"number": "0001", "title": "Use Ports and Adapters"}],
            "truth_status": "OBSERVED",
        },
    },
    "12_adr_absent": {
        "files": {
            "apps/service.py": "# service with no docs/adr directory\n",
        },
        "oracle": {
            "fixture_id": "12_adr_absent",
            "description": "Repository with no ADR directory or decision records",
            "nodes": ["apps/service.py"],
            "has_authentic_adrs": False,
            "adr_count": 0,
            "expected_adrs": [],
            "forbidden_synthetic_adrs": [
                "ADR-INV-01",
                "Domain Interface Isolation Contract",
            ],
            "adr_state": "UNKNOWN / NO_ADRS",
        },
    },
    "13_reexport": {
        "files": {
            "pkg/__init__.py": "from .worker import TaskWorker\n",
            "pkg/worker.py": "class TaskWorker:\n    pass\n",
            "consumer.py": "from pkg import TaskWorker\n",
        },
        "oracle": {
            "fixture_id": "13_reexport",
            "description": "Package re-exporting symbols via __init__.py",
            "nodes": ["pkg/__init__.py", "pkg/worker.py", "consumer.py"],
            "consumer_node": "consumer.py",
            "reexport_source": "pkg/worker.py",
        },
    },
    "14_dynamic_import": {
        "files": {
            "loader.py": "import importlib\nmod = importlib.import_module('plugins.active')\n",
            "plugins/active.py": "# dynamically loaded plugin\n",
        },
        "oracle": {
            "fixture_id": "14_dynamic_import",
            "description": "Dynamic import via importlib.import_module",
            "nodes": ["loader.py", "plugins/active.py"],
            "static_ast_explicit_import_found": False,
            "dynamic_edge_status": "UNKNOWN",
        },
    },
    "15_unused_module": {
        "files": {
            "main.py": "import worker\n",
            "worker.py": "# active worker\n",
            "orphan_helper.py": "# never imported by any file\n",
        },
        "oracle": {
            "fixture_id": "15_unused_module",
            "description": "Module exists in repository but has 0 inbound callers",
            "nodes": ["main.py", "worker.py", "orphan_helper.py"],
            "orphan_node": "orphan_helper.py",
            "orphan_inbound_callers": [],
            "orphan_outbound_dependencies": [],
            "orphan_transitive_impact": [],
        },
    },
    "16_empty_init": {
        "files": {
            "lib/__init__.py": "",
            "lib/core.py": "VALUE = 100\n",
        },
        "oracle": {
            "fixture_id": "16_empty_init",
            "description": "Empty zero-byte __init__.py package marker",
            "nodes": ["lib/__init__.py", "lib/core.py"],
            "target_node": "lib/__init__.py",
            "outbound_dependencies": [],
            "inbound_callers": [],
        },
    },
    "17_python_package_init": {
        "files": {
            "engine/__init__.py": "VERSION = '2.0.0'\nfrom .driver import BaseDriver\n",
            "engine/driver.py": "class BaseDriver:\n    pass\n",
        },
        "oracle": {
            "fixture_id": "17_python_package_init",
            "description": "__init__.py with substantive package initialization and intra-package import",
            "nodes": ["engine/__init__.py", "engine/driver.py"],
            "outbound_dependencies": {"engine/__init__.py": ["engine/driver.py"]},
        },
    },
    "18_false_positive_recommendation": {
        "files": {
            "apps/backend/__init__.py": "",
            "apps/backend/server.py": "class Server:\n    pass\n",
        },
        "oracle": {
            "fixture_id": "18_false_positive_recommendation",
            "description": "Exact regression fixture for apps/backend/__init__.py false-positive recommendation",
            "target_component": "apps/backend/__init__.py",
            "nodes": ["apps/backend/__init__.py", "apps/backend/server.py"],
            "target_inbound_callers": [],
            "target_outbound_dependencies": [],
            "target_downstream_impact_count": 0,
            "target_boundary_crossings_count": 0,
            "target_adr_violations_count": 0,
            "expected_outcome": "NO_INTERVENTION_REQUIRED",
            "forbidden_recommendations": [
                "Dependency Inversion via Domain Port",
                "Port / Adapter & Dependency Inversion Pattern",
                "Asynchronous Domain Events",
            ],
            "forbidden_symbols": [
                "IinitpyPort",
                "IappsbackendinitpyPort",
                "execute_operation",
            ],
            "forbidden_synthetic_adrs": [
                "ADR-INV-01",
                "Domain Interface Isolation Contract",
            ],
            "forbidden_synthetic_teams": [
                "Root Team",
                "@root-team-guild",
            ],
        },
    },
}


def generate_all() -> None:
    FIXTURES_DIR.mkdir(parents=True, exist_ok=True)
    for fix_id, spec in FIXTURES_SPEC.items():
        fix_dir = FIXTURES_DIR / fix_id
        fix_dir.mkdir(parents=True, exist_ok=True)

        for rel_file, content in spec["files"].items():
            file_path = fix_dir / rel_file
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_text(content, encoding="utf-8")

        oracle_path = fix_dir / "oracle.json"
        oracle_path.write_text(json.dumps(spec["oracle"], indent=2), encoding="utf-8")

    print(f"Generated all {len(FIXTURES_SPEC)} ground-truth fixtures at {FIXTURES_DIR}")


if __name__ == "__main__":
    generate_all()
