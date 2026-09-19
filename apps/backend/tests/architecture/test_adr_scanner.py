"""
Tests for ADRScanner discovery and Markdown parsing.
"""

from __future__ import annotations

from pathlib import Path
import pytest
from app.architecture.adr_scanner import ADRScanner


def test_adr_scanner_discovery_and_parsing(tmp_path: Path) -> None:
    repo_dir = tmp_path / "repo_1"
    adr_dir = repo_dir / "docs" / "adr"
    adr_dir.mkdir(parents=True, exist_ok=True)

    # Create MADR file
    adr_file = adr_dir / "0001-use-kraft-consensus.md"
    adr_file.write_text(
        """# 1. Use KRaft Consensus Subsystem

## Status
Accepted

## Context
ZooKeeper quorum introduces operational overhead and metadata synchronization bottlenecks.

## Decision
Adopt KRaft (Kafka Raft Metadata Mode) for sub-second controller failover.

## Consequences
- Eliminates external ZooKeeper dependency
- Significantly faster partition rebalancing
""",
        encoding="utf-8",
    )

    scanner = ADRScanner(base_storage_path=tmp_path)
    discovered = scanner.discover_adr_files(repo_dir)
    assert len(discovered) == 1
    assert discovered[0].name == "0001-use-kraft-consensus.md"

    parsed = scanner.parse_adr_markdown(discovered[0], repo_dir)
    assert parsed is not None
    assert parsed.adr_number == "ADR-001"
    assert parsed.title == "Use KRaft Consensus Subsystem"
    assert parsed.status == "accepted"
    assert "ZooKeeper" in parsed.context
    assert "KRaft" in parsed.decision
    assert len(parsed.consequences) == 2
    assert "kraft" in parsed.tags
