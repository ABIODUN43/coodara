"""
Architecture graph extraction.

Transforms the dependency graph produced by repository analysis
into an architecture graph.

This component is deterministic and contains no database,
FastAPI, GitHub, or AI dependencies.
"""

from __future__ import annotations

import json

from app.architecture.models import (
    ArchitectureEdge,
    ArchitectureGraph,
    ArchitectureNode,
)


class ArchitectureExtractionError(Exception):
    """Architecture extraction failed."""


class ArchitectureExtractor:
    """
    Extract architecture structure from an analysis dependency graph.
    """

    VERSION = 1

    def extract(
        self,
        graph_data: str,
    ) -> ArchitectureGraph:
        """
        Convert serialized dependency graph data into an
        architecture graph.
        """

        try:
            payload = json.loads(graph_data)
        except json.JSONDecodeError as exc:
            raise ArchitectureExtractionError(
                "Invalid dependency graph data.",
            ) from exc

        if not isinstance(payload, dict):
            raise ArchitectureExtractionError(
                "Dependency graph must be a JSON object.",
            )

        nodes = self._extract_nodes(payload)
        edges = self._extract_edges(payload)

        return ArchitectureGraph(
            version=self.VERSION,
            nodes=tuple(nodes),
            edges=tuple(edges),
        )

    def _extract_nodes(
        self,
        payload: dict[str, object],
    ) -> list[ArchitectureNode]:
        raw_nodes = payload.get("nodes", [])

        if not isinstance(raw_nodes, list):
            raise ArchitectureExtractionError(
                "Dependency graph nodes must be a list.",
            )

        nodes: list[ArchitectureNode] = []

        for raw_node in raw_nodes:
            if not isinstance(raw_node, dict):
                continue

            node_id = raw_node.get("id")

            if not isinstance(node_id, str) or not node_id:
                continue

            node_type = raw_node.get(
                "type",
                "module",
            )

            if not isinstance(node_type, str):
                node_type = "module"

            nodes.append(
                ArchitectureNode(
                    id=node_id,
                    type=node_type,
                ),
            )

        return sorted(
            nodes,
            key=lambda node: node.id,
        )

    def _extract_edges(
        self,
        payload: dict[str, object],
    ) -> list[ArchitectureEdge]:
        raw_edges = payload.get("edges", [])

        if not isinstance(raw_edges, list):
            raise ArchitectureExtractionError(
                "Dependency graph edges must be a list.",
            )

        edges: set[tuple[str, str, str]] = set()

        for raw_edge in raw_edges:
            if not isinstance(raw_edge, dict):
                continue

            source = raw_edge.get("source")
            target = raw_edge.get("target")
            kind = raw_edge.get("kind", "import")

            if not isinstance(source, str):
                continue

            if not isinstance(target, str):
                continue

            if not source or not target:
                continue

            if not isinstance(kind, str):
                kind = "import"

            edges.add(
                (
                    source,
                    target,
                    kind,
                ),
            )

        return [
            ArchitectureEdge(
                source=source,
                target=target,
                kind=kind,
            )
            for source, target, kind in sorted(edges)
        ]