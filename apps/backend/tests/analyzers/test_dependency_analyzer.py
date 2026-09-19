from __future__ import annotations

import json
from pathlib import Path

from app.analyzers.context import RepositoryContext
from app.analyzers.dependency_analyzer import DependencyAnalyzer


def _context(path: Path) -> RepositoryContext:
    return RepositoryContext(
        root_path=path,
        repository_id="test-repository",
    )


def _graph(result) -> dict:
    return json.loads(result.graph_data)


def test_dependency_analyzer_detects_python_imports(
    tmp_path: Path,
) -> None:
    (tmp_path / "app.py").write_text(
        "from services.user import UserService\n"
        "import os\n",
        encoding="utf-8",
    )

    result = DependencyAnalyzer().analyze(
        _context(tmp_path),
    )

    graph = _graph(result)

    assert {
        "id": "app.py",
        "type": "module",
    } in graph["nodes"]

    assert {
        "source": "app.py",
        "target": "services.user",
        "kind": "import",
    } in graph["edges"]

    assert {
        "source": "app.py",
        "target": "os",
        "kind": "import",
    } in graph["edges"]


def test_dependency_analyzer_detects_relative_python_imports(
    tmp_path: Path,
) -> None:
    package = tmp_path / "app"
    package.mkdir()

    (package / "__init__.py").write_text(
        "",
        encoding="utf-8",
    )

    (package / "service.py").write_text(
        "from .repository import Repository\n"
        "from ..shared import config\n",
        encoding="utf-8",
    )

    result = DependencyAnalyzer().analyze(
        _context(tmp_path),
    )

    graph = _graph(result)

    assert {
        "source": "app/service.py",
        "target": ".repository",
        "kind": "import",
    } in graph["edges"]

    assert {
        "source": "app/service.py",
        "target": "..shared",
        "kind": "import",
    } in graph["edges"]


def test_dependency_analyzer_detects_javascript_and_typescript_imports(
    tmp_path: Path,
) -> None:
    (tmp_path / "app.ts").write_text(
        'import React from "react";\n'
        'import { api } from "./api";\n'
        'const utils = require("./utils");\n'
        'const lazy = import("./lazy");\n',
        encoding="utf-8",
    )

    result = DependencyAnalyzer().analyze(
        _context(tmp_path),
    )

    graph = _graph(result)

    targets = {
        edge["target"]
        for edge in graph["edges"]
        if edge["source"] == "app.ts"
    }

    assert targets == {
        "react",
        "./api",
        "./utils",
        "./lazy",
    }


def test_dependency_analyzer_detects_export_from(
    tmp_path: Path,
) -> None:
    (tmp_path / "index.ts").write_text(
        'export { User } from "./user";\n',
        encoding="utf-8",
    )

    result = DependencyAnalyzer().analyze(
        _context(tmp_path),
    )

    graph = _graph(result)

    assert {
        "source": "index.ts",
        "target": "./user",
        "kind": "import",
    } in graph["edges"]


def test_dependency_analyzer_ignores_generated_directories(
    tmp_path: Path,
) -> None:
    generated = tmp_path / "node_modules"
    generated.mkdir()

    (generated / "generated.ts").write_text(
        'import "ignored-package";\n',
        encoding="utf-8",
    )

    (tmp_path / "app.ts").write_text(
        'import "./service";\n',
        encoding="utf-8",
    )

    result = DependencyAnalyzer().analyze(
        _context(tmp_path),
    )

    graph = _graph(result)

    node_ids = {
        node["id"]
        for node in graph["nodes"]
    }

    assert "app.ts" in node_ids
    assert "node_modules/generated.ts" not in node_ids

    assert all(
        edge["source"] != "node_modules/generated.ts"
        for edge in graph["edges"]
    )


def test_dependency_analyzer_handles_syntax_errors(
    tmp_path: Path,
) -> None:
    (tmp_path / "broken.py").write_text(
        "def broken(:\n",
        encoding="utf-8",
    )

    (tmp_path / "valid.py").write_text(
        "import os\n",
        encoding="utf-8",
    )

    result = DependencyAnalyzer().analyze(
        _context(tmp_path),
    )

    graph = _graph(result)

    assert {
        "id": "broken.py",
        "type": "module",
    } in graph["nodes"]

    assert {
        "id": "valid.py",
        "type": "module",
    } in graph["nodes"]

    assert {
        "source": "valid.py",
        "target": "os",
        "kind": "import",
    } in graph["edges"]


def test_dependency_analyzer_removes_duplicate_dependencies(
    tmp_path: Path,
) -> None:
    (tmp_path / "app.py").write_text(
        "import os\n"
        "import os\n",
        encoding="utf-8",
    )

    result = DependencyAnalyzer().analyze(
        _context(tmp_path),
    )

    graph = _graph(result)

    edges = [
        edge
        for edge in graph["edges"]
        if edge["source"] == "app.py"
        and edge["target"] == "os"
    ]

    assert len(edges) == 1


def test_dependency_analyzer_is_deterministic(
    tmp_path: Path,
) -> None:
    (tmp_path / "b.py").write_text(
        "import z\n"
        "import a\n",
        encoding="utf-8",
    )

    (tmp_path / "a.py").write_text(
        "import b\n",
        encoding="utf-8",
    )

    analyzer = DependencyAnalyzer()

    first = analyzer.analyze(
        _context(tmp_path),
    )

    second = analyzer.analyze(
        _context(tmp_path),
    )

    assert first == second
    assert first.graph_data == second.graph_data


def test_dependency_analyzer_resolves_internal_symbols(
    tmp_path: Path,
) -> None:
    # 1. Python resolution
    app_dir = tmp_path / "app"
    app_dir.mkdir()
    services_dir = app_dir / "services"
    services_dir.mkdir()

    (services_dir / "order.py").write_text("class Order: pass\n", encoding="utf-8")
    (app_dir / "controller.py").write_text(
        "from app.services.order import Order\n"
        "import external_pkg\n",
        encoding="utf-8",
    )

    # 2. Java FQCN resolution
    java_dir = tmp_path / "src" / "main" / "java" / "com" / "example"
    java_dir.mkdir(parents=True)
    (java_dir / "User.java").write_text(
        "package com.example;\npublic class User {}\n",
        encoding="utf-8",
    )
    (java_dir / "UserService.java").write_text(
        "package com.example;\nimport com.example.User;\nimport org.slf4j.Logger;\npublic class UserService {}\n",
        encoding="utf-8",
    )

    result = DependencyAnalyzer().analyze(_context(tmp_path))
    graph = _graph(result)

    edge_map = {(e["source"], e["target"]) for e in graph["edges"]}

    # Verify internal Python import resolved to internal relative file path
    assert ("app/controller.py", "app/services/order.py") in edge_map
    assert ("app/controller.py", "external_pkg") in edge_map

    # Verify internal Java import resolved to internal relative file path
    assert (
        "src/main/java/com/example/UserService.java",
        "src/main/java/com/example/User.java",
    ) in edge_map
    assert (
        "src/main/java/com/example/UserService.java",
        "org.slf4j.Logger",
    ) in edge_map