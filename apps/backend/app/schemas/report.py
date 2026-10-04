"""
API schemas for the Full Architecture Intelligence Report.

Defines the structured, durable representation of an architecture audit
for a single repository, compiled entirely from canonical Coodara
analysis data.
"""

from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ReportMeta(BaseModel):
    """Metadata regarding repository analysis provenance and execution scope."""

    repository_id: int
    repository_name: str
    organization_id: int
    primary_language: str | None = None
    commit_sha: str | None = None
    branch: str | None = None
    analyzed_at: datetime | None = None
    analysis_job_id: int
    analyzer_version: str = "2.0.0"
    total_loc: int = 0
    total_files: int = 0
    total_classes: int = 0
    total_functions: int = 0


class ReportExecutiveSummary(BaseModel):
    """High-level architectural evaluation and style alignment."""

    detected_pattern: str
    pattern_category: str
    alignment_score: float = Field(ge=0.0, le=100.0)
    health_score: float = Field(ge=0.0, le=100.0)
    health_label: str  # "Healthy", "Warning", "Critical"
    maintainability: float = Field(ge=0.0, le=100.0)
    modularity: float = Field(ge=0.0, le=100.0)
    coupling: float = Field(ge=0.0, le=100.0)
    complexity: float = Field(ge=0.0, le=100.0)
    summary_text: str
    key_architecture_rules: list[str] = Field(default_factory=list)
    anti_patterns_detected: list[str] = Field(default_factory=list)


class ReportTechnologyItem(BaseModel):
    """Detected technology, framework, database, or library."""

    name: str
    category: str | None = None
    version: str | None = None
    confidence_score: float = Field(ge=0.0, le=1.0)


class ReportComponentItem(BaseModel):
    """Software component, module, or subsystem in the architecture graph."""

    id: str
    name: str
    type: str  # service, controller, module, database, external
    subsystem: str | None = None
    file_path: str | None = None
    description: str | None = None
    responsibilities: list[str] = Field(default_factory=list)
    efferent_coupling: int = 0  # Fan-out (Ce)
    afferent_coupling: int = 0  # Fan-in (Ca)
    instability_index: float = 0.0  # I = Ce / (Ca + Ce)
    is_increasingly_coupled: bool = False
    issue_count: int = 0


class ReportDiagram(BaseModel):
    """Mermaid diagram specification generated from graph nodes and edges."""

    mermaid_code: str
    node_count: int
    edge_count: int
    subsystems: list[str] = Field(default_factory=list)


class ReportDependencyHotspot(BaseModel):
    """High-coupling or high-instability relationship."""

    source: str
    target: str
    kind: str
    is_intentional: bool = True
    boundary_status: str = "intentional"
    rationale: str | None = None


class ReportEvidenceItem(BaseModel):
    """Concrete proof citing lines of code or commit artifacts."""

    source_type: str
    file_path: str | None = None
    line_start: int | None = None
    line_end: int | None = None
    commit_sha: str | None = None
    description: str
    confidence: str = "high"


class ReportFindingItem(BaseModel):
    """Structural defect, boundary violation, or architectural risk."""

    id: str
    title: str
    category: str
    severity: str  # critical, warning, info
    description: str
    status: str = "open"
    affected_components: list[str] = Field(default_factory=list)
    evidence: list[ReportEvidenceItem] = Field(default_factory=list)


class ReportRecommendationItem(BaseModel):
    """Actionable architectural guidance and remediation blueprint."""

    id: int | None = None
    title: str
    priority: str  # high, medium, low
    status: str = "open"
    summary: str
    action_plan: str | None = None
    prescribed_pattern: str | None = None
    before_code: str | None = None
    after_code: str | None = None


class ReportADRItem(BaseModel):
    """Architectural Decision Record found in the codebase."""

    id: str
    title: str
    status: str
    path: str


class ReportMethodology(BaseModel):
    """Explicit scope, extraction methodology, and analysis boundaries."""

    static_analysis_scope: str
    limitations: list[str] = Field(default_factory=list)
    confidence_rationale: str
    generated_at: datetime


class ArchitectureReportResponse(BaseModel):
    """
    Complete consolidated software architecture intelligence report
    for a single repository.
    """

    model_config = ConfigDict(from_attributes=True)

    meta: ReportMeta
    executive_summary: ReportExecutiveSummary
    technology_stack: list[ReportTechnologyItem] = Field(default_factory=list)
    components: list[ReportComponentItem] = Field(default_factory=list)
    diagram: ReportDiagram
    dependencies: list[ReportDependencyHotspot] = Field(default_factory=list)
    dependency_hotspots: list[ReportDependencyHotspot] = Field(default_factory=list)
    findings: list[ReportFindingItem] = Field(default_factory=list)
    recommendations: list[ReportRecommendationItem] = Field(default_factory=list)
    decision_records: list[ReportADRItem] = Field(default_factory=list)
    adrs: list[ReportADRItem] = Field(default_factory=list)
    methodology: ReportMethodology
    markdown_content: str = ""
