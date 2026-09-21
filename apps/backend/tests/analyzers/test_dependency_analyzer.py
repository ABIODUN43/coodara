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


def test_resolve_target_java_and_scala(tmp_path: Path) -> None:
    analyzer = DependencyAnalyzer()

    # Create Java files
    java_file = tmp_path / "clients" / "src" / "main" / "java" / "org" / "apache" / "kafka" / "clients" / "producer" / "Producer.java"
    java_file.parent.mkdir(parents=True)
    java_file.write_text(
        "package org.apache.kafka.clients.producer;\npublic class Producer {}\n",
        encoding="utf-8",
    )

    # Create Scala file
    scala_file = tmp_path / "core" / "src" / "main" / "scala" / "kafka" / "server" / "KafkaServer.scala"
    scala_file.parent.mkdir(parents=True)
    scala_file.write_text(
        "package kafka.server\nclass KafkaServer extends AnyRef\n",
        encoding="utf-8",
    )

    files = [java_file, scala_file]
    index = analyzer._build_symbol_index(files, tmp_path)

    # 1. Java FQCN resolution
    res = analyzer._resolve_target(
        target="org.apache.kafka.clients.producer.Producer",
        source_rel="clients/src/test/java/Test.java",
        symbol_index=index,
    )
    assert res == "clients/src/main/java/org/apache/kafka/clients/producer/Producer.java"

    # 2. Java wildcard package resolution
    res_wildcard = analyzer._resolve_target(
        target="org.apache.kafka.clients.producer.*",
        source_rel="clients/src/test/java/Test.java",
        symbol_index=index,
    )
    assert res_wildcard == "clients/src/main/java/org/apache/kafka/clients/producer/Producer.java"

    # 3. Scala FQCN resolution
    res_scala = analyzer._resolve_target(
        target="kafka.server.KafkaServer",
        source_rel="core/src/test/scala/Test.scala",
        symbol_index=index,
    )
    assert res_scala == "core/src/main/scala/kafka/server/KafkaServer.scala"

    # 4. Unresolved external dependencies return original target string
    for external in (
        "java.util.concurrent.ConcurrentHashMap",
        "java.util.List",
        "org.slf4j.Logger",
        "org.junit.jupiter.api.Test",
        "scala.collection.immutable.Map",
    ):
        res_ext = analyzer._resolve_target(
            target=external,
            source_rel="core/src/main/scala/kafka/server/KafkaServer.scala",
            symbol_index=index,
        )
        assert res_ext == external


def test_resolve_target_python(tmp_path: Path) -> None:
    analyzer = DependencyAnalyzer()

    svc_file = tmp_path / "apps" / "backend" / "app" / "services" / "order_service.py"
    svc_file.parent.mkdir(parents=True)
    svc_file.write_text("class OrderService: pass\n", encoding="utf-8")

    init_file = tmp_path / "apps" / "backend" / "app" / "services" / "__init__.py"
    init_file.write_text("", encoding="utf-8")

    util_file = tmp_path / "apps" / "backend" / "app" / "utils.py"
    util_file.write_text("def helper(): pass\n", encoding="utf-8")

    files = [init_file, svc_file, util_file]
    index = analyzer._build_symbol_index(files, tmp_path)

    # 1. Module path resolution
    res = analyzer._resolve_target(
        target="app.services.order_service",
        source_rel="apps/backend/app/main.py",
        symbol_index=index,
    )
    assert res == "apps/backend/app/services/order_service.py"

    # 2. Relative import resolution
    res_rel = analyzer._resolve_target(
        target=".utils",
        source_rel="apps/backend/app/main.py",
        symbol_index=index,
    )
    assert res_rel == "apps/backend/app/utils.py"

    # 3. Unresolved external dependency
    res_ext = analyzer._resolve_target(
        target="pydantic.BaseModel",
        source_rel="apps/backend/app/main.py",
        symbol_index=index,
    )
    assert res_ext == "pydantic.BaseModel"


def test_resolve_target_deterministic_ambiguity(tmp_path: Path) -> None:
    analyzer = DependencyAnalyzer()

    file_a = tmp_path / "module_a" / "src" / "main" / "java" / "Config.java"
    file_a.parent.mkdir(parents=True)
    file_a.write_text("public class Config {}\n", encoding="utf-8")

    file_b = tmp_path / "module_b" / "src" / "main" / "java" / "Config.java"
    file_b.parent.mkdir(parents=True)
    file_b.write_text("public class Config {}\n", encoding="utf-8")

    # Pass in sorted order: module_a comes before module_b
    files = sorted([file_b, file_a])
    index = analyzer._build_symbol_index(files, tmp_path)

    # Resolving suffix should deterministically pick the first alphabetically
    res = analyzer._resolve_target(
        target="Config",
        source_rel="test.java",
        symbol_index=index,
    )
    assert res == "module_a/src/main/java/Config.java"


def test_resolve_target_parity_with_reference(tmp_path: Path) -> None:
    analyzer = DependencyAnalyzer()

    # Create a small multi-language fixture
    (tmp_path / "src" / "main" / "java" / "pkg").mkdir(parents=True)
    j1 = tmp_path / "src" / "main" / "java" / "pkg" / "Alpha.java"
    j1.write_text("package pkg;\npublic class Alpha {}\n", encoding="utf-8")

    (tmp_path / "src" / "main" / "scala" / "pkg").mkdir(parents=True)
    s1 = tmp_path / "src" / "main" / "scala" / "pkg" / "Beta.scala"
    s1.write_text("package pkg\nclass Beta {}\n", encoding="utf-8")

    (tmp_path / "app").mkdir(parents=True)
    p1 = tmp_path / "app" / "gamma.py"
    p1.write_text("class Gamma: pass\n", encoding="utf-8")

    files = sorted([j1, s1, p1])
    index = analyzer._build_symbol_index(files, tmp_path)

    targets = [
        ("pkg.Alpha", "src/main/java/pkg/Other.java"),
        ("pkg.Beta", "src/main/scala/pkg/Other.scala"),
        ("app.gamma", "app/main.py"),
        ("nonexistent.package.Class", "src/main/java/pkg/Other.java"),
        ("java.util.List", "src/main/java/pkg/Other.java"),
        ("os", "app/main.py"),
    ]

    for target, src in targets:
        resolved = analyzer._resolve_target(
            target=target,
            source_rel=src,
            symbol_index=index,
        )
        if target == "pkg.Alpha":
            assert resolved == "src/main/java/pkg/Alpha.java"
        elif target == "pkg.Beta":
            assert resolved == "src/main/scala/pkg/Beta.scala"
        elif target == "app.gamma":
            assert resolved == "app/gamma.py"
        else:
            assert resolved == target