import json

import pytest
from app.architecture.extractor import (
    ArchitectureExtractionError,
    ArchitectureExtractor,
)


def test_extracts_dependency_graph() -> None:
    graph = {
        "version": 1,
        "nodes": [
            {
                "id": "app/services/foo.py",
                "type": "module",
            },
            {
                "id": "app/repositories/foo.py",
                "type": "module",
            },
        ],
        "edges": [
            {
                "source": "app/services/foo.py",
                "target": "app/repositories/foo.py",
                "kind": "import",
            },
        ],
    }

    result = ArchitectureExtractor().extract(
        json.dumps(graph),
    )

    assert result.version == 1

    assert len(result.nodes) == 2
    assert len(result.edges) == 1

    assert result.edges[0].source == (
        "app/services/foo.py"
    )

    assert result.edges[0].target == (
        "app/repositories/foo.py"
    )


def test_extract_removes_duplicate_edges() -> None:
    graph = {
        "version": 1,
        "nodes": [],
        "edges": [
            {
                "source": "a.py",
                "target": "b.py",
                "kind": "import",
            },
            {
                "source": "a.py",
                "target": "b.py",
                "kind": "import",
            },
        ],
    }

    result = ArchitectureExtractor().extract(
        json.dumps(graph),
    )

    assert len(result.edges) == 1


def test_extract_sorts_nodes_deterministically() -> None:
    graph = {
        "version": 1,
        "nodes": [
            {"id": "z.py", "type": "module"},
            {"id": "a.py", "type": "module"},
        ],
        "edges": [],
    }

    result = ArchitectureExtractor().extract(
        json.dumps(graph),
    )

    assert [
        node.id
        for node in result.nodes
    ] == [
        "a.py",
        "z.py",
    ]


def test_extract_rejects_invalid_json() -> None:
    with pytest.raises(ArchitectureExtractionError):
        ArchitectureExtractor().extract(
            "not-json",
        )


def test_extract_rejects_non_object_json() -> None:
    with pytest.raises(ArchitectureExtractionError):
        ArchitectureExtractor().extract(
            json.dumps([]),
        )


def test_extract_rejects_invalid_nodes() -> None:
    graph = {
        "version": 1,
        "nodes": "invalid",
        "edges": [],
    }

    with pytest.raises(ArchitectureExtractionError):
        ArchitectureExtractor().extract(
            json.dumps(graph),
        )


def test_extract_rejects_invalid_edges() -> None:
    graph = {
        "version": 1,
        "nodes": [],
        "edges": "invalid",
    }

    with pytest.raises(ArchitectureExtractionError):
        ArchitectureExtractor().extract(
            json.dumps(graph),
        )