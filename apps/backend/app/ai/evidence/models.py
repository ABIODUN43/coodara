"""
Normalized Architecture Evidence Model for Coodara AI.

Represents fine-grained, verifiable code and graph evidence with exact provenance,
file locations, line numbers, relationships, and confidence calibrations.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any


class EvidenceType(StrEnum):
    """Classification of the physical evidence source."""

    STATIC_IMPORT = "STATIC_IMPORT"
    CALL_SITE = "CALL_SITE"
    INHERITANCE = "INHERITANCE"
    IMPLEMENTATION = "IMPLEMENTATION"
    FRAMEWORK_ANNOTATION = "FRAMEWORK_ANNOTATION"
    ADR_CONSTRAINT = "ADR_CONSTRAINT"
    CONFIG_REGISTRATION = "CONFIG_REGISTRATION"
    DATA_FLOW = "DATA_FLOW"
    MESSAGE_LIFECYCLE = "MESSAGE_LIFECYCLE"


class RelationshipType(StrEnum):
    """Type of architectural relationship between entities."""

    IMPORTS = "IMPORTS"
    CALLS = "CALLS"
    EXTENDS = "EXTENDS"
    IMPLEMENTS = "IMPLEMENTS"
    COORDINATES = "COORDINATES"
    PRODUCES = "PRODUCES"
    CONSUMES = "CONSUMES"
    PERSISTS_TO = "PERSISTS_TO"
    CONFIGURES = "CONFIGURES"
    DISPATCHES = "DISPATCHES"


@dataclass(frozen=True)
class ArchitectureEvidence:
    """A normalized piece of empirical architectural evidence."""

    evidence_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    repository_id: int = 1
    organization_id: int = 1
    analysis_id: int | None = None
    commit_sha: str | None = None
    file_path: str = ""
    module_name: str = ""
    symbol_name: str = ""
    symbol_type: str = "module"  # module, class, interface, method, function, package
    relationship_type: RelationshipType = RelationshipType.IMPORTS
    source_entity: str = ""
    target_entity: str = ""
    direction: str = "OUTBOUND"  # OUTBOUND, INBOUND, BIDIRECTIONAL
    evidence_type: EvidenceType = EvidenceType.STATIC_IMPORT
    provenance_line: int | None = None
    confidence: float = 1.0

    def to_citation(self) -> str:
        """Format a human-readable and clickable citation link."""
        loc = f"{self.file_path}:{self.provenance_line}" if self.provenance_line else self.file_path
        if self.source_entity and self.target_entity:
            return f"`{self.source_entity}` --({self.relationship_type.value})--> `{self.target_entity}` [{loc}]"
        return f"`{self.symbol_name or self.file_path}` [{loc}]"


@dataclass
class EvidenceSet:
    """Collection of architectural evidence records with query and traversal methods."""

    items: list[ArchitectureEvidence] = field(default_factory=list)

    def add(self, evidence: ArchitectureEvidence) -> None:
        self.items.append(evidence)

    def filter_by_entity(self, entity_name: str) -> list[ArchitectureEvidence]:
        """Find all evidence mentioning a symbol, class, or module name."""
        entity_lower = entity_name.lower()
        return [
            e for e in self.items
            if entity_lower in e.source_entity.lower()
            or entity_lower in e.target_entity.lower()
            or entity_lower in e.symbol_name.lower()
            or entity_lower in e.file_path.lower()
        ]

    def get_direct_dependents(self, target_name: str) -> list[str]:
        """Find all entities that directly depend on or call target_name."""
        target_lower = target_name.lower()
        dependents: set[str] = set()
        for e in self.items:
            if target_lower in e.target_entity.lower() and e.source_entity:
                dependents.add(e.source_entity)
        return sorted(dependents)

    def get_direct_dependencies(self, source_name: str) -> list[str]:
        """Find all entities that source_name directly imports or calls."""
        source_lower = source_name.lower()
        dependencies: set[str] = set()
        for e in self.items:
            if source_lower in e.source_entity.lower() and e.target_entity:
                dependencies.add(e.target_entity)
        return sorted(dependencies)

    def compute_evidence_coverage(self, expected_concepts: list[str]) -> float:
        """Compute the fraction of expected architectural concepts grounded in evidence."""
        if not expected_concepts:
            return 1.0
        matched = 0
        for concept in expected_concepts:
            if self.filter_by_entity(concept):
                matched += 1
        return round(matched / len(expected_concepts), 2)
