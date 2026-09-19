"""
Multi-Layer Architecture Graph & Subsystem Inference Layer for Coodara AI.

Extracts and organizes codebase topology across 4 discrete graph layers:
1. Package / Module Graph (Coarse structural boundaries)
2. Symbol / Class Graph (Exact classes, interfaces, inheritance)
3. Call Graph (Method invocations and execution paths)
4. Inferred Subsystem Graph (Domain-specific clusters: Ingress, Storage, Replication, Coordination, Core)
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from app.ai.evidence.models import (
    ArchitectureEvidence,
    EvidenceSet,
    EvidenceType,
    RelationshipType,
)


@dataclass
class SubsystemCluster:
    """Discovered architectural subsystem cluster."""

    name: str
    role: str
    components: list[str] = field(default_factory=list)
    responsibilities: list[str] = field(default_factory=list)
    inbound_dependencies: list[str] = field(default_factory=list)
    outbound_dependencies: list[str] = field(default_factory=list)


class MultiLayerGraphEngine:
    """
    Constructs multi-layer graph topology and infers architectural subsystems from evidence.
    """

    # Domain keyword heuristics for subsystem discovery
    SUBSYSTEM_PATTERNS: dict[str, tuple[str, list[str], list[str]]] = {
        "Ingress & Protocol": (
            "Handles network connections, TCP/HTTP protocols, and request decoding.",
            ["socket", "network", "server", "acceptor", "processor", "router", "endpoint", "controller", "api", "handler", "transport", "grpc"],
            ["Request deserialization", "Connection multiplexing", "Authentication / Security"],
        ),
        "Replication & Consensus": (
            "Manages quorum consensus, leader-follower replication, and state synchronization.",
            ["replica", "partition", "raft", "kraft", "consensus", "cluster", "quorum", "isr", "fetcher", "election"],
            ["HighWatermark management", "In-Sync Replica tracking", "Leader election"],
        ),
        "Storage & Persistence": (
            "Provides disk persistence, indexing, segmentation, and zero-copy I/O.",
            ["log", "segment", "index", "storage", "repository", "dao", "entity", "database", "disk", "file", "record", "store"],
            ["Immutable log append", "Zero-Copy sendfile DMA", "Index binary search"],
        ),
        "Coordination & State": (
            "Coordinates consumer groups, distributed transactions, and cluster metadata.",
            ["coordinator", "group", "transaction", "session", "metadata", "state", "lock", "registry"],
            ["Consumer group rebalancing", "2-Phase transaction commits", "Cluster metadata dissemination"],
        ),
        "Core Domain Primitives": (
            "Defines core business entities, payload models, and foundational utilities.",
            ["model", "entity", "schema", "record", "payload", "util", "common", "config", "types"],
            ["Immutable data structures", "Type contracts", "Configuration parsing"],
        ),
    }

    def extract_evidence_set(
        self,
        *,
        repository_id: int = 1,
        organization_id: int = 1,
        analysis_id: int | None = None,
        commit_sha: str | None = None,
        nodes: list[str],
        edges: list[dict[str, Any]],
        symbols: list[Any] | None = None,
        call_sites: list[Any] | None = None,
    ) -> EvidenceSet:
        """
        Convert raw nodes, edges, symbols, and call sites into a unified, traceable EvidenceSet.
        """
        evidence_set = EvidenceSet()

        # 1. Process Nodes (Modules & Source Files)
        for node in nodes:
            evidence_set.add(
                ArchitectureEvidence(
                    repository_id=repository_id,
                    organization_id=organization_id,
                    analysis_id=analysis_id,
                    commit_sha=commit_sha,
                    file_path=node,
                    module_name=node.split("/")[-1].replace(".py", "").replace(".java", "").replace(".scala", "").replace(".ts", ""),
                    symbol_name=node.split("/")[-1],
                    symbol_type="module",
                    relationship_type=RelationshipType.IMPORTS,
                    source_entity=node,
                    target_entity="",
                    direction="OUTBOUND",
                    evidence_type=EvidenceType.STATIC_IMPORT,
                    confidence=1.0,
                )
            )

        # 2. Process Edges (Imports, Extends, Implements, Calls)
        for edge in edges:
            src = edge.get("source", "")
            tgt = edge.get("target", "")
            kind = edge.get("kind", "import").lower()

            rel_type = RelationshipType.IMPORTS
            ev_type = EvidenceType.STATIC_IMPORT

            if kind == "extends":
                rel_type = RelationshipType.EXTENDS
                ev_type = EvidenceType.INHERITANCE
            elif kind == "implements":
                rel_type = RelationshipType.IMPLEMENTS
                ev_type = EvidenceType.IMPLEMENTATION
            elif kind == "call" or kind == "calls":
                rel_type = RelationshipType.CALLS
                ev_type = EvidenceType.CALL_SITE

            if src and tgt:
                evidence_set.add(
                    ArchitectureEvidence(
                        repository_id=repository_id,
                        organization_id=organization_id,
                        analysis_id=analysis_id,
                        commit_sha=commit_sha,
                        file_path=src,
                        module_name=src.split("/")[-1],
                        symbol_name=src.split("/")[-1],
                        symbol_type="module",
                        relationship_type=rel_type,
                        source_entity=src,
                        target_entity=tgt,
                        direction="OUTBOUND",
                        evidence_type=ev_type,
                        confidence=1.0,
                    )
                )

        # 3. Process Symbols
        if symbols:
            for sym in symbols:
                name = getattr(sym, "name", "") or (sym.get("name", "") if isinstance(sym, dict) else "")
                file_path = getattr(sym, "file_path", "") or (sym.get("file_path", "") if isinstance(sym, dict) else "")
                kind = getattr(sym, "kind", "") or (sym.get("kind", "") if isinstance(sym, dict) else "symbol")
                line = getattr(sym, "line_number", None) or (sym.get("line_number", None) if isinstance(sym, dict) else None)

                if name and file_path:
                    evidence_set.add(
                        ArchitectureEvidence(
                            repository_id=repository_id,
                            organization_id=organization_id,
                            analysis_id=analysis_id,
                            commit_sha=commit_sha,
                            file_path=file_path,
                            module_name=file_path.split("/")[-1],
                            symbol_name=name,
                            symbol_type=str(kind),
                            relationship_type=RelationshipType.IMPORTS,
                            source_entity=name,
                            target_entity="",
                            direction="OUTBOUND",
                            evidence_type=EvidenceType.CALL_SITE,
                            provenance_line=line,
                            confidence=1.0,
                        )
                    )

        # 4. Process Call Sites
        if call_sites:
            for cs in call_sites:
                caller = getattr(cs, "caller_symbol", "") or (cs.get("caller_symbol", "") if isinstance(cs, dict) else "")
                callee = getattr(cs, "callee_symbol", "") or (cs.get("callee_symbol", "") if isinstance(cs, dict) else "")
                file_path = getattr(cs, "file_path", "") or (cs.get("file_path", "") if isinstance(cs, dict) else "")
                line = getattr(cs, "line_number", None) or (cs.get("line_number", None) if isinstance(cs, dict) else None)

                if caller and callee:
                    evidence_set.add(
                        ArchitectureEvidence(
                            repository_id=repository_id,
                            organization_id=organization_id,
                            analysis_id=analysis_id,
                            commit_sha=commit_sha,
                            file_path=file_path,
                            module_name=file_path.split("/")[-1] if file_path else "",
                            symbol_name=caller,
                            symbol_type="method",
                            relationship_type=RelationshipType.CALLS,
                            source_entity=caller,
                            target_entity=callee,
                            direction="OUTBOUND",
                            evidence_type=EvidenceType.CALL_SITE,
                            provenance_line=line,
                            confidence=1.0,
                        )
                    )

        return evidence_set

    def infer_subsystems(self, evidence_set: EvidenceSet) -> list[SubsystemCluster]:
        """
        Group observed modules and symbols into coherent architectural subsystem clusters.
        """
        clusters: dict[str, SubsystemCluster] = {}

        # Collect unique entities
        entities: set[str] = set()
        for e in evidence_set.items:
            if e.symbol_name:
                entities.add(e.symbol_name)
            if e.source_entity:
                entities.add(e.source_entity)
            if e.file_path:
                entities.add(e.file_path)

        for entity in sorted(entities):
            entity_lower = entity.lower()
            matched_subsystem = None

            for sub_name, (role, keywords, responsibilities) in self.SUBSYSTEM_PATTERNS.items():
                if any(kw in entity_lower for kw in keywords):
                    matched_subsystem = (sub_name, role, responsibilities)
                    break

            if matched_subsystem:
                sub_name, role, resps = matched_subsystem
                if sub_name not in clusters:
                    clusters[sub_name] = SubsystemCluster(
                        name=sub_name,
                        role=role,
                        responsibilities=resps,
                    )
                if entity not in clusters[sub_name].components:
                    clusters[sub_name].components.append(entity)

        return list(clusters.values())
