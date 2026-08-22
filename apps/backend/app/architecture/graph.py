"""
Architecture graph parsing and representation.

Converts the serialized dependency graph produced by repository
analysis into the canonical immutable architecture domain model.

The parser validates the serialized graph at the architecture
boundary and guarantees deterministic node and edge ordering.

This module intentionally does not depend on SQLAlchemy, FastAPI,
or database infrastructure.
"""

from __future__ import annotations

import json
from typing import Any

from app.analyzers.exceptions import AnalyzerExecutionError
from app.analyzers.models import DependencyGraphSnapshot
from app.architecture.models import (
    ArchitectureEdge,
    ArchitectureGraph,
    ArchitectureNode,
)


def parse_dependency_graph(
    snapshot: DependencyGraphSnapshot,
) -> ArchitectureGraph:
    """
    Parse a serialized dependency graph into an ArchitectureGraph.

    The dependency graph is produced by the repository analysis
    dependency analyzer.

    Validation guarantees:

    - graph data must contain valid JSON;
    - the root value must be an object;
    - nodes must be a list;
    - edges must be a list;
    - every node must contain a non-empty string ``id``;
    - every edge must contain non-empty string ``source`` and
      ``target`` fields;
    - edge ``kind`` defaults to ``import`` when omitted;
    - duplicate nodes and edges are removed;
    - nodes and edges are returned in deterministic order.

    Invalid architecture input is rejected rather than silently
    producing incomplete architecture information.
    """

    payload = _parse_payload(
        snapshot.graph_data,
    )

    raw_nodes = payload.get("nodes")
    raw_edges = payload.get("edges")

    if not isinstance(raw_nodes, list):
        raise AnalyzerExecutionError(
            "Architecture dependency graph nodes are invalid.",
        )

    if not isinstance(raw_edges, list):
        raise AnalyzerExecutionError(
            "Architecture dependency graph edges are invalid.",
        )

    nodes = _parse_nodes(raw_nodes)
    edges = _parse_edges(raw_edges)

    version = _parse_version(
        payload.get("version", 1),
    )

    return ArchitectureGraph(
        version=version,
        nodes=tuple(
            ArchitectureNode(
                id=identifier,
            )
            for identifier in sorted(nodes)
        ),
        edges=tuple(
            ArchitectureEdge(
                source=source,
                target=target,
                kind=kind,
            )
            for source, target, kind in sorted(edges)
        ),
    )


def _parse_payload(
    graph_data: str,
) -> dict[str, Any]:
    """
    Deserialize and validate the graph root object.
    """

    try:
        payload = json.loads(graph_data)
    except json.JSONDecodeError as exc:
        raise AnalyzerExecutionError(
            "Architecture dependency graph is invalid JSON.",
        ) from exc

    if not isinstance(payload, dict):
        raise AnalyzerExecutionError(
            "Architecture dependency graph must be an object.",
        )

    return payload


def _parse_nodes(
    raw_nodes: list[Any],
) -> set[str]:
    """
    Validate and normalize architecture graph nodes.
    """

    nodes: set[str] = set()

    for index, raw_node in enumerate(raw_nodes):
        if not isinstance(raw_node, dict):
            raise AnalyzerExecutionError(
                "Architecture dependency graph contains "
                f"an invalid node at index {index}.",
            )

        identifier = raw_node.get("id")

        if not isinstance(identifier, str) or not identifier:
            raise AnalyzerExecutionError(
                "Architecture dependency graph contains "
                f"a node with an invalid id at index {index}.",
            )

        nodes.add(identifier)

    return nodes


def _parse_edges(
    raw_edges: list[Any],
) -> set[tuple[str, str, str]]:
    """
    Validate and normalize architecture graph edges.
    """

    edges: set[tuple[str, str, str]] = set()

    for index, raw_edge in enumerate(raw_edges):
        if not isinstance(raw_edge, dict):
            raise AnalyzerExecutionError(
                "Architecture dependency graph contains "
                f"an invalid edge at index {index}.",
            )

        source = raw_edge.get("source")
        target = raw_edge.get("target")
        kind = raw_edge.get("kind", "import")

        if not isinstance(source, str) or not source:
            raise AnalyzerExecutionError(
                "Architecture dependency graph contains "
                f"an edge with an invalid source at index {index}.",
            )

        if not isinstance(target, str) or not target:
            raise AnalyzerExecutionError(
                "Architecture dependency graph contains "
                f"an edge with an invalid target at index {index}.",
            )

        if not isinstance(kind, str) or not kind:
            raise AnalyzerExecutionError(
                "Architecture dependency graph contains "
                f"an edge with an invalid kind at index {index}.",
            )

        edges.add(
            (
                source,
                target,
                kind,
            )
        )

    return edges


def _parse_version(
    value: Any,
) -> int:
    """
    Validate the dependency graph schema version.
    """

    if isinstance(value, bool) or not isinstance(value, int):
        raise AnalyzerExecutionError(
            "Architecture dependency graph version is invalid.",
        )

    if value < 1:
        raise AnalyzerExecutionError(
            "Architecture dependency graph version must be positive.",
        )

    return value