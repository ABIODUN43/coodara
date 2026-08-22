"""
Tests for architecture graph parsing.
"""

from __future__ import annotations

import json

import pytest
from app.analyzers.exceptions import AnalyzerExecutionError
from app.analyzers.models import DependencyGraphSnapshot
from app.architecture.graph import (
    ArchitectureGraph,
    parse_dependency_graph,
)


def _snapshot(
    payload: dict,
) -> DependencyGraphSnapshot:
    return DependencyGraphSnapshot(
        graph_data=json.dumps(
            payload,
            sort_keys=True,
        ),
    )


def test_parse_dependency_graph_parses_valid_graph() -> None:
    snapshot = _snapshot(
        {
            "version": 1,
            "nodes": [
                {
                    "id": "app/main.py",
                    "type": "module",
                },
                {
                    "id": "app/service.py",
                    "type": "module",
                },
            ],
            "edges": [
                {
                    "source": "app/main.py",
                    "target": "app/service.py",
                    "kind": "import",
                },
            ],
        }
    )

    graph = parse_dependency_graph(snapshot)

    assert isinstance(graph, ArchitectureGraph)
    assert graph.node_count == 2
    assert graph.edge_count == 1

    assert graph.nodes[0].id == "app/main.py"
    assert graph.nodes[0].type == "module"

    assert graph.edges[0].source == "app/main.py"
    assert graph.edges[0].target == "app/service.py"


def test_parse_dependency_graph_rejects_malformed_json() -> None:
    snapshot = DependencyGraphSnapshot(
        graph_data="{invalid-json",
    )

    with pytest.raises(AnalyzerExecutionError):
        parse_dependency_graph(snapshot)


def test_parse_dependency_graph_rejects_invalid_nodes() -> None:
    snapshot = _snapshot(
        {
            "version": 1,
            "nodes": "invalid",
            "edges": [],
        }
    )

    with pytest.raises(AnalyzerExecutionError):
        parse_dependency_graph(snapshot)


def test_parse_dependency_graph_rejects_invalid_edges() -> None:
    snapshot = _snapshot(
        {
            "version": 1,
            "nodes": [],
            "edges": "invalid",
        }
    )

    with pytest.raises(AnalyzerExecutionError):
        parse_dependency_graph(snapshot)


def test_parse_dependency_graph_is_deterministic() -> None:
    snapshot = _snapshot(
        {
            "version": 1,
            "nodes": [
                {
                    "id": "b.py",
                    "type": "module",
                },
                {
                    "id": "a.py",
                    "type": "module",
                },
                {
                    "id": "a.py",
                    "type": "module",
                },
            ],
            "edges": [
                {
                    "source": "b.py",
                    "target": "a.py",
                    "kind": "import",
                },
                {
                    "source": "b.py",
                    "target": "a.py",
                    "kind": "import",
                },
            ],
        }
    )

    first = parse_dependency_graph(snapshot)
    second = parse_dependency_graph(snapshot)

    assert first == second
    assert first.nodes == tuple(
        sorted(
            first.nodes,
            key=lambda node: node.id,
        )
    )
    assert len(first.edges) == 1


def test_graph_counts_incoming_and_outgoing_dependencies() -> None:
    snapshot = _snapshot(
        {
            "version": 1,
            "nodes": [
                {"id": "a.py"},
                {"id": "b.py"},
                {"id": "c.py"},
            ],
            "edges": [
                {
                    "source": "a.py",
                    "target": "b.py",
                },
                {
                    "source": "c.py",
                    "target": "b.py",
                },
            ],
        }
    )

    graph = parse_dependency_graph(snapshot)

    assert graph.outgoing_count("a.py") == 1
    assert graph.outgoing_count("b.py") == 0
    assert graph.incoming_count("b.py") == 2