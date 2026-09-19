"""
API schemas for Architecture Intelligence.

These schemas define the HTTP representation of architecture
snapshots and their derived intelligence.

They intentionally do not expose SQLAlchemy persistence models.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


class ArchitectureGraphNodeResponse(BaseModel):
    """One node in the architecture dependency graph."""

    id: str
    type: str
    name: str | None = None
    subsystem: str | None = None
    file_path: str | None = None
    dependency_count: int = 0
    dependent_count: int = 0
    issue_count: int = 0
    technology: str | None = None
    description: str | None = None
    coupling_velocity: float = 0.0
    is_increasingly_coupled: bool = False
    efferent_coupling: int = 0
    afferent_coupling: int = 0
    instability_index: float = 0.0
    coupling_explanation: str | None = None


class ArchitectureGraphEdgeResponse(BaseModel):
    """One dependency relationship in the architecture graph."""

    source: str
    target: str
    kind: str
    id: str | None = None
    label: str | None = None
    is_intentional: bool = True
    boundary_status: str = "intentional"  # "intentional", "violates_boundary", "untracked"
    rationale: str | None = None
    source_subsystem: str | None = None
    target_subsystem: str | None = None


class ArchitectureGraphResponse(BaseModel):
    """Normalized architecture dependency graph."""

    version: int
    nodes: list[ArchitectureGraphNodeResponse]
    edges: list[ArchitectureGraphEdgeResponse]


class ArchitectureScoreResponse(BaseModel):
    """Architecture health score."""

    score: float = Field(ge=0.0, le=100.0)
    maintainability: float = Field(ge=0.0, le=100.0)
    coupling: float = Field(ge=0.0, le=100.0)
    cohesion: float = Field(ge=0.0, le=100.0)
    complexity: float = Field(ge=0.0, le=100.0)


class ArchitectureIssueResponse(BaseModel):
    """Architectural issue detected during analysis."""

    model_config = ConfigDict(from_attributes=True)

    id: int | None = None
    severity: str
    category: str
    description: str
    status: str = "open"
    dismissed_reason: str | None = None
    resolved_at: datetime | None = None


class ArchitectureIssueUpdateStatusRequest(BaseModel):
    """Request payload to update an issue's lifecycle status."""

    status: Literal["open", "in_progress", "resolved", "dismissed"]
    dismissed_reason: str | None = None


class ArchitectureRecommendationResponse(BaseModel):
    """Architecture improvement recommendation."""

    model_config = ConfigDict(from_attributes=True)

    id: int | None = None
    recommendation: str
    priority: str
    status: str = "open"
    action_plan: str | None = None
    resolved_at: datetime | None = None


class ArchitectureRecommendationUpdateStatusRequest(BaseModel):
    """Request payload to update a recommendation's lifecycle status."""

    status: Literal["open", "in_progress", "resolved", "dismissed"]
    action_plan: str | None = None


class ArchitectureSnapshotResponse(BaseModel):
    """
    Complete architecture intelligence response.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    repository_id: int
    analysis_result_id: int
    snapshot_version: int
    graph: ArchitectureGraphResponse
    score: ArchitectureScoreResponse
    issues: list[ArchitectureIssueResponse]
    recommendations: list[ArchitectureRecommendationResponse]


class ArchitectureRelatedComponentResponse(BaseModel):
    """Related component reference."""

    id: str
    name: str
    type: str


class ArchitectureComponentDetailResponse(BaseModel):
    """Component inspection details."""

    id: str
    name: str
    type: str
    description: str | None = None
    technology: str | None = None
    file_path: str | None = None
    health_score: float | None = None
    responsibilities: list[str] = Field(default_factory=list)
    dependencies: list[ArchitectureRelatedComponentResponse] = Field(
        default_factory=list
    )
    dependents: list[ArchitectureRelatedComponentResponse] = Field(
        default_factory=list
    )
    issues: list[ArchitectureIssueResponse] = Field(default_factory=list)


class ArchitectureInsightItemResponse(BaseModel):
    """Architecture insight / issue item."""

    id: str
    title: str
    description: str
    severity: str
    type: str
    component_ids: list[str] = Field(default_factory=list)
    evidence_ids: list[str] = Field(default_factory=list)


class ArchitectureInsightsListResponse(BaseModel):
    """Architecture insights response wrapper."""

    items: list[ArchitectureInsightItemResponse]


class ArchitectureEvidenceResponse(BaseModel):
    """Architecture evidence response."""

    id: str
    source_type: str
    file_path: str | None = None
    line_start: int | None = None
    line_end: int | None = None
    commit_sha: str | None = None
    commit_message: str | None = None
    description: str
    confidence: str | None = "high"


class ArchitectureHistoryEventResponse(BaseModel):
    """Architecture history event."""

    id: str
    timestamp: str
    type: str
    title: str
    description: str
    commit_sha: str | None = None
    evidence_ids: list[str] = Field(default_factory=list)


class ArchitectureHistoryListResponse(BaseModel):
    """Architecture history response wrapper."""

    items: list[ArchitectureHistoryEventResponse] = Field(default_factory=list)
    events: list[ArchitectureHistoryEventResponse] = Field(default_factory=list)
    total_events: int = 0


class ArchitectureStyleResponse(BaseModel):
    """Detected architectural pattern / style information."""

    pattern_name: str
    category: str
    alignment_score: float
    description: str
    layers: list[str] = Field(default_factory=list)
    key_rules: list[str] = Field(default_factory=list)
    violations_count: int = 0
    anti_patterns: list[str] = Field(default_factory=list)


class ArchitectureFileViolation(BaseModel):
    """Specific bad architecture decision detected in a file."""

    id: str
    severity: str  # critical, warning, info
    category: str  # layer_violation, circular_dependency, god_object, direct_db_access, tight_coupling
    title: str
    description: str
    line_number: int | None = None
    suggested_fix: str | None = None


class ArchitectureFileNode(BaseModel):
    """A node in the repository file tree with architectural annotations."""

    id: str
    name: str
    path: str
    type: str  # "file" or "directory"
    language: str | None = None
    size: int | None = None
    content: str | None = None
    has_bad_architecture: bool = False
    violation_count: int = 0
    violations: list[ArchitectureFileViolation] = Field(default_factory=list)
    children: list[ArchitectureFileNode] | None = None


class ArchitectureFileTreeResponse(BaseModel):
    """Repository file tree response with bad architecture highlights."""

    root: ArchitectureFileNode
    total_files: int
    total_violations: int
    bad_files_count: int
    detected_architecture: str


class AffectedComponentImpact(BaseModel):
    """Component impacted by a code change."""

    id: str
    name: str
    type: str
    subsystem: str | None = "Core Subsystem"
    team: str | None = "Platform Team"
    impact_level: str  # "high", "medium", "low"
    impact_depth: int = 1
    reason: str
    relationship: str  # "direct", "transitive", "database", "external"


class BoundaryCrossedItem(BaseModel):
    """Architectural layer or subsystem boundary crossed by the modification."""

    boundary_id: str
    boundary_name: str
    from_layer: str
    to_layer: str
    rule_violated: str
    severity: str = "warning"  # "critical", "warning", "info"
    impact_explanation: str


class TeamImpactItem(BaseModel):
    """Engineering team or domain owner affected by the change."""

    team_name: str
    subsystems_owned: list[str] = Field(default_factory=list)
    components_affected_count: int = 1
    lead_contact: str = "Engineering Guild"
    review_required: bool = True
    impact_summary: str


class CouplingShiftTelemetry(BaseModel):
    """Coupling telemetry shift resulting from the proposed change."""

    status: str = "increases_coupling"  # "increases_coupling", "maintains_coupling", "decreases_coupling"
    is_increasing_coupling: bool = True
    delta_efferent: int = 4
    current_instability: float = 0.42
    projected_instability: float = 0.78
    delta_instability: float = 0.36
    fan_out_before: int = 3
    fan_out_after: int = 7
    explanation: str = "Direct outward invocation increases efferent fan-out, elevating component instability index."


class ADRViolationDetail(BaseModel):
    """Architectural Decision Record violated by the proposed modification."""

    adr_id: str  # e.g. "ADR-12" or "ADR-002"
    adr_title: str
    violation_reason: str
    severity: str = "critical"  # "critical", "warning"
    prescribed_pattern: str


class RecommendedAlternativeOption(BaseModel):
    """An alternative architectural design option."""

    id: str
    name: str
    tag: str = "Alternative"  # "Recommended", "Simple Alternative", "High-Throughput / Distributed"
    summary: str
    fit_score: int = 90
    complexity: str = "Low"  # "Low", "Medium", "High"
    boundary_violations_resolved: int = 3
    coupling_impact: str = "Instability I = 0.38 (Stable)"
    code_snippet: str


class RecommendedDesign(BaseModel):
    """Architectural recommendation and alternative design pattern."""

    pattern_name: str
    pattern_category: str = "Decoupling & Boundary Protection"
    summary: str
    why_this_resolves_all_issues: list[str] = Field(default_factory=list)
    architectural_blueprint: str
    before_code: str | None = None
    after_code: str | None = None
    code_example: str | None = None
    step_by_step_guidance: list[str] = Field(default_factory=list)
    tradeoffs: list[str] = Field(default_factory=list)
    alternative_patterns: list[RecommendedAlternativeOption] = Field(default_factory=list)
    agent_spec_prompt: str = ""


class ConsequenceAnalysisBullet(BaseModel):
    """High-impact single consequence bullet point."""

    category: str  # "affected_components", "boundaries_crossed", "teams_impacted", "coupling", "adr_violation"
    text: str  # e.g. "→ 17 components may be affected"
    highlight_color: str  # "rose", "amber", "purple", "blue", "emerald"
    count: int | None = None


class ArchitecturalImpactAnalysisRequest(BaseModel):
    """Request payload to simulate architectural impact of modifying a component."""

    component_id: str
    proposed_change: str | None = "Modify internal processing to query storage layer directly"
    change_type: str | None = "feature_extension"


class SimulationConfidenceResponse(BaseModel):
    """Separated confidence dimensions for architectural simulation."""

    structural_confidence: str = "HIGH"
    evidence_confidence: str = "HIGH"
    runtime_confidence: str = "UNKNOWN"
    overall: str = "HIGH"
    rationale: str = ""


class SimulationEvidenceResponse(BaseModel):
    """Concrete repository artifact citation supporting a simulation claim."""

    source_type: str  # "code", "graph", "test", "ADR", "issue", "docs", "history"
    repository_path: str
    entity_id: str
    commit_sha: str | None = None
    excerpt_or_reference: str = ""
    relation_to_claim: str = ""
    evidence_strength: str = "deterministic"


class PropagationPathResponse(BaseModel):
    """Unweighted shortest dependency propagation path from target entity to an affected node."""

    target_id: str
    target_name: str
    hops: int
    path_nodes: list[str] = Field(default_factory=list)
    edge_types: list[str] = Field(default_factory=list)
    relationship: str = "transitive"


class ArchitecturalImpactAnalysisResponse(BaseModel):
    """Comprehensive multi-dimensional architectural impact response."""

    component_id: str
    component_name: str
    subsystem: str
    headline: str  # "If we modify Component X:"
    consequence_bullets: list[str] = Field(default_factory=list)

    # Simulation metadata
    simulation_id: str | None = None
    normalized_intervention: str = "Refactor"
    confidence: SimulationConfidenceResponse | None = None

    # Detailed telemetry items
    affected_components_count: int = 0
    affected_components: list[AffectedComponentImpact] = Field(default_factory=list)

    direct_impact_count: int = 0
    indirect_impact_count: int = 0
    propagation_paths_count: int = 0
    propagation_paths: list[PropagationPathResponse] = Field(default_factory=list)

    boundaries_crossed_count: int = 0
    boundaries_crossed: list[BoundaryCrossedItem] = Field(default_factory=list)

    teams_impacted_count: int = 0
    teams_impacted: list[TeamImpactItem] = Field(default_factory=list)

    coupling_shift: CouplingShiftTelemetry

    adr_violations_count: int = 0
    adr_violations: list[ADRViolationDetail] = Field(default_factory=list)

    constraints_affected_count: int = 0
    constraints_affected: list[str] = Field(default_factory=list)

    evidence: list[SimulationEvidenceResponse] = Field(default_factory=list)

    recommended_design: RecommendedDesign


class ArchitectureImpactSimulationRequest(BaseModel):
    """Request payload to simulate architectural impact of a change."""

    file_path: str
    component_id: str | None = None
    proposed_code: str | None = None
    change_type: str | None = "refactor"


class ArchitectureImpactSimulationResponse(BaseModel):
    """Simulation results of architectural impact."""

    target_component: str
    target_file: str
    impact_level: str  # "HIGH", "MEDIUM", "LOW"
    summary: str
    blast_radius_percentage: float
    directly_affected: list[AffectedComponentImpact] = Field(default_factory=list)
    transitive_impact: list[AffectedComponentImpact] = Field(default_factory=list)
    databases_affected: list[AffectedComponentImpact] = Field(default_factory=list)
    external_dependencies: list[AffectedComponentImpact] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    architecture_style: str


# ==========================================
# Pillar 3: Architectural Decision Records (ADRs) & Decision Memory
# ==========================================

class ArchitectureDecisionItem(BaseModel):
    """An Architectural Decision Record (ADR)."""

    id: str
    title: str
    status: str  # "accepted", "proposed", "deprecated", "superseded"
    decision_date: str
    author: str
    context: str
    decision: str
    consequences: list[str] = Field(default_factory=list)
    affected_components: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    superseded_by: str | None = None


class ArchitectureDecisionCreateRequest(BaseModel):
    """Payload to record a new architectural decision."""

    adr_number: str | None = None
    title: str
    context: str
    decision: str
    status: str = "accepted"
    author: str = "Lead Architect"
    consequences: list[str] = Field(default_factory=list)
    affected_components: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)


class ArchitectureDecisionListResponse(BaseModel):
    """List of architectural decision records."""

    items: list[ArchitectureDecisionItem]
    total_count: int


# ==========================================
# Pillar 2: Architectural Boundaries & Layer Rules
# ==========================================

class ArchitectureBoundaryRule(BaseModel):
    """Rule defining allowed and forbidden dependency paths between layers."""

    id: str
    source_layer: str
    target_layer: str
    is_allowed: bool
    rule_type: str  # "strict_layering", "relaxed_layering", "forbidden_cross_cutting", "isolated_persistence"
    description: str
    violation_count: int = 0
    active_breaches: list[str] = Field(default_factory=list)


class ArchitectureBoundaryMatrixResponse(BaseModel):
    """Matrix of all defined architecture layers and inter-layer boundary rules."""

    pattern_name: str
    layers: list[str]
    rules: list[ArchitectureBoundaryRule]
    total_violations: int
    compliance_score: float


# ==========================================
# Pillar 4: Git Architecture Evolution & Diffs
# ==========================================

class ArchitectureEvolutionPoint(BaseModel):
    """Architecture health and topological graph metrics at a specific Git commit."""

    commit_sha: str
    commit_message: str
    timestamp: str
    author: str
    health_score: float
    coupling_index: float
    modularity_index: float
    nodes_count: int
    edges_count: int
    violations_count: int
    nodes_added: list[str] = Field(default_factory=list)
    nodes_removed: list[str] = Field(default_factory=list)
    boundary_shifts: list[str] = Field(default_factory=list)


class ArchitectureEvolutionResponse(BaseModel):
    """Timeline of architecture evolution across Git history."""

    repository_id: str
    points: list[ArchitectureEvolutionPoint]
    total_snapshots: int
    health_trend_delta: float
    coupling_trend_delta: float


# ==========================================
# Pillar 5: Architectural Degradation & Drift
# ==========================================

class ArchitectureDriftMetric(BaseModel):
    """Metric evaluating architecture drift against baseline contracts."""

    name: str
    current_value: float
    baseline_value: float
    drift_delta: float
    status: str  # "healthy", "warning", "critical_drift"
    explanation: str


class ArchitectureDegradationResponse(BaseModel):
    """Evaluation of architectural degradation velocity and technical debt accumulation."""

    drift_level: str  # "LOW", "MODERATE", "SEVERE"
    degradation_velocity_score: float  # -100 to +100 (negative means degrading)
    layer_leakage_rate_percentage: float
    smell_accumulation_rate: float
    drift_metrics: list[ArchitectureDriftMetric]
    urgent_remediations: list[str]
    unintended_architectural_shifts: list[str]


# ==========================================
# Pillar 8: Architecture-Aware Agent Specification Generator
# ==========================================

class ArchitectureAgentSpecRequest(BaseModel):
    """Request to generate an architecture-aware specification for AI coding agents."""

    task_description: str
    target_components: list[str] = Field(default_factory=list)
    target_files: list[str] = Field(default_factory=list)
    max_blast_radius_budget: float = 35.0


class ArchitectureAgentSpecResponse(BaseModel):
    """Structured architectural specification ready to be fed to AI coding agents."""

    spec_id: str
    task_description: str
    architecture_style: str
    target_components: list[str]
    target_files: list[str]
    allowed_imports: list[str]
    forbidden_imports: list[str]
    layer_boundary_constraints: list[str]
    blast_radius_budget_percentage: float
    interface_contracts: list[str]
    required_architectural_invariants: list[str]
    prompt_ready_spec: str


# ==========================================
# Pillar 9: Re-Analysis & Verification Loop
# ==========================================

class ArchitectureDeltaMetrics(BaseModel):
    """Before vs After mathematical metrics delta."""

    before_health: float
    after_health: float
    health_delta: float

    before_coupling: float
    after_coupling: float
    coupling_delta: float

    before_modularity: float
    after_modularity: float
    modularity_delta: float

    before_violations_count: int
    after_violations_count: int
    violations_resolved_count: int
    new_violations_introduced_count: int


class ArchitectureVerificationRequest(BaseModel):
    """Request to re-analyze changes and verify whether architecture actually improved."""

    file_path: str
    modified_code: str
    agent_spec_id: str | None = None


class ArchitectureVerificationResponse(BaseModel):
    """Certified proof and verification report on whether the architecture improved."""

    verdict: str  # "VERIFIED_IMPROVEMENT", "REGRESSION_DETECTED", "NEUTRAL"
    verification_summary: str
    metrics_delta: ArchitectureDeltaMetrics
    resolved_violations: list[str]
    new_risks: list[str]
    certification_stamp: str
    is_safe_to_merge: bool


# ==========================================
# Commit-to-Commit Architectural Diff & Decision Evolution
# ==========================================

class ArchitectureDecisionDiffItem(BaseModel):
    """A changed or updated architectural decision between two commits."""

    decision_id: str
    title: str
    change_type: str  # "superseded", "status_change", "modified", "added", "deprecated"
    before_status: str | None = None
    after_status: str | None = None
    before_summary: str | None = None
    after_summary: str | None = None
    reason: str
    affected_components: list[str] = Field(default_factory=list)


class ArchitectureEdgeDiffItem(BaseModel):
    """Subsystem-to-Subsystem dependency edge changed between two commits."""

    source_subsystem: str
    target_subsystem: str
    change_type: str  # "added_intentional", "added_violation", "removed", "modified"
    is_intentional: bool
    boundary_status: str  # "intentional", "violates_boundary"
    rationale: str


class ArchitectureCoupledComponentDiff(BaseModel):
    """Component that shifted in coupling complexity between two commits."""

    component_name: str
    subsystem: str
    base_coupling: float
    target_coupling: float
    coupling_delta: float
    velocity_status: str  # "accelerating_coupling", "stable", "decoupled"
    explanation: str


class ArchitectureCommitDiffResponse(BaseModel):
    """Complete architectural diff report between Commit X and Commit Y."""

    repository_id: str
    base_commit: str
    target_commit: str
    base_timestamp: str
    target_timestamp: str
    changed_decisions: list[ArchitectureDecisionDiffItem]
    edge_diffs: list[ArchitectureEdgeDiffItem]
    increasingly_coupled_components: list[ArchitectureCoupledComponentDiff]
    boundary_shifts: list[str]
    health_delta: float
    modularity_delta: float
    summary: str


class ArchitectureFileContentResponse(BaseModel):
    """Real file content response for Code Studio."""

    file_path: str
    name: str
    language: str
    size: int
    content: str
    total_lines: int


class ArchitectureRemediationRequest(BaseModel):
    """Request to remediate an architectural violation using LLM or rule engine."""

    file_path: str
    violation_id: str | None = None
    category: str | None = None
    issue_description: str | None = None
    current_code: str
    language: str | None = "python"


class ArchitectureRemediationResponse(BaseModel):
    """Architectural remediation result with refactored code and unified diff."""

    file_path: str
    refactored_code: str
    diff: str
    explanation: str
    applied_rules: list[str] = Field(default_factory=list)


# ==========================================
# Real Git Commits & Revision History Schemas
# ==========================================

class ArchitectureGitCommitResponse(BaseModel):
    """Metadata for a real Git commit in the repository."""

    sha: str
    short_sha: str
    author: str
    timestamp: str = ""
    date: str = ""
    message: str


class ArchitectureGitCommitListResponse(BaseModel):
    """List of real Git commits available for architectural comparison."""

    commits: list[ArchitectureGitCommitResponse]
    total_count: int


# ==========================================
# Custom Boundary Rules & Quality Gate Schemas
# ==========================================

class ArchitectureRuleCreateRequest(BaseModel):
    """Request payload to create a custom boundary policy rule."""

    name: str
    rule_type: str = "disallow_dependency"  # "disallow_dependency", "require_interface"
    source_pattern: str
    target_pattern: str
    severity: str = "critical"  # "critical", "warning", "info"
    rationale: str
    is_active: bool = True


class ArchitectureRuleResponse(BaseModel):
    """A custom boundary policy rule."""

    id: int
    repository_id: int
    name: str
    rule_type: str
    source_pattern: str
    target_pattern: str
    severity: str
    rationale: str
    is_active: bool
    created_at: str


class ArchitectureRuleListResponse(BaseModel):
    """List of custom boundary policy rules."""

    rules: list[ArchitectureRuleResponse]
    total_count: int


class ArchitectureQualityGateViolationResponse(BaseModel):
    """Detailed boundary policy violation reported by Quality Gate."""

    rule_id: int | None = None
    rule_name: str
    source_component: str
    target_component: str
    severity: str
    rationale: str
    suggested_fix: str


class ArchitectureQualityGateResponse(BaseModel):
    """Quality Gate verdict for CI/CD pipelines and architectural compliance."""

    passed: bool
    status: str
    violations: list[ArchitectureQualityGateViolationResponse]
    critical_violations_count: int
    warning_violations_count: int
    circular_dependencies_count: int
    health_score: float
    summary: str
