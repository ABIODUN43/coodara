"""
Analysis Coverage Gate & Architectural Telemetry Verification for Coodara AI.

Enforces the core architectural invariant:
"Coodara must never confuse absence of evidence with evidence of absence."

Before any reasoning request is dispatched to an LLM, this gate verifies
whether the repository analysis contains sufficient evidence for the specific question.
If coverage is insufficient, it emits a first-class UNKNOWN/INSUFFICIENT EVIDENCE response
detailing exact telemetry metrics rather than allowing the engine to hallucinate.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any


class CoverageStatus(StrEnum):
    """Analysis coverage classification."""

    COMPLETE = "COMPLETE"
    PARTIAL = "PARTIAL"
    INSUFFICIENT = "INSUFFICIENT"
    FAILED = "FAILED"


@dataclass(frozen=True)
class AnalysisCoverageReport:
    """Telemetry report describing the completeness of repository analysis."""

    repository_id: int
    repository_name: str
    organization_id: int = 1
    analysis_id: int | None = None
    commit_sha: str | None = None
    files_discovered: int = 0
    files_indexed: int = 0
    files_failed: int = 0
    languages_detected: list[str] = field(default_factory=list)
    symbols_indexed: int = 0
    dependency_edges: int = 0
    call_edges: int = 0
    graph_nodes: int = 0
    coverage_percentage: float = 0.0
    coverage_status: CoverageStatus = CoverageStatus.INSUFFICIENT


@dataclass(frozen=True)
class CoverageGateDecision:
    """Decision produced by the Analysis Coverage Gate for a specific question intent."""

    is_sufficient: bool
    status: CoverageStatus
    diagnostic_message: str
    missing_requirements: list[str] = field(default_factory=list)
    recommended_action: str = ""


class AnalysisCoverageGate:
    """
    Evaluates whether repository analysis meets the minimum evidence thresholds
    required to answer specific architectural questions reliably.
    """

    # Minimum thresholds per architectural intent category
    INTENT_REQUIREMENTS: dict[str, dict[str, int]] = {
        "ARCHITECTURE_RECONSTRUCTION": {
            "min_nodes": 2,
            "min_edges": 1,
            "min_files": 2,
        },
        "CENTRALITY_ANALYSIS": {
            "min_nodes": 3,
            "min_edges": 2,
            "min_files": 2,
        },
        "BLAST_RADIUS": {
            "min_nodes": 2,
            "min_edges": 1,
            "min_files": 2,
        },
        "REQUEST_FLOW": {
            "min_nodes": 2,
            "min_files": 2,
        },
        "DATA_FLOW": {
            "min_nodes": 2,
            "min_files": 2,
        },
        "MESSAGE_FLOW": {
            "min_nodes": 2,
            "min_files": 2,
        },
        "CIRCULAR_DEPENDENCY": {
            "min_nodes": 2,
            "min_edges": 1,
        },
        "FAILURE_ANALYSIS": {
            "min_nodes": 2,
            "min_edges": 1,
        },
        "DRIFT_DETECTION": {
            "min_nodes": 1,
        },
    }

    def compute_report(
        self,
        *,
        repository_id: int,
        repository_name: str,
        organization_id: int = 1,
        analysis_id: int | None = None,
        files_count: int = 0,
        nodes_count: int = 0,
        edges_count: int = 0,
        symbols_count: int = 0,
        call_sites_count: int = 0,
        detected_technologies: list[str] | None = None,
    ) -> AnalysisCoverageReport:
        """
        Build an AnalysisCoverageReport from raw repository telemetry.
        """
        techs = detected_technologies or []
        files_indexed = max(files_count, nodes_count)
        
        # Calculate coverage score
        if files_indexed == 0:
            pct = 0.0
            status = CoverageStatus.INSUFFICIENT
        elif files_indexed > 0 and edges_count == 0 and files_indexed > 5:
            # Files exist but zero dependency relationships parsed
            pct = 25.0
            status = CoverageStatus.PARTIAL
        elif files_indexed >= 2 and (edges_count >= 1 or symbols_count >= 2):
            pct = min(100.0, 50.0 + (min(edges_count, 100) / 100.0) * 30.0 + (min(symbols_count, 100) / 100.0) * 20.0)
            status = CoverageStatus.COMPLETE if pct >= 70.0 else CoverageStatus.PARTIAL
        else:
            pct = 40.0
            status = CoverageStatus.PARTIAL

        return AnalysisCoverageReport(
            repository_id=repository_id,
            repository_name=repository_name,
            organization_id=organization_id,
            analysis_id=analysis_id,
            files_discovered=files_indexed,
            files_indexed=files_indexed,
            languages_detected=techs,
            symbols_indexed=symbols_count,
            dependency_edges=edges_count,
            call_edges=call_sites_count,
            graph_nodes=nodes_count,
            coverage_percentage=round(pct, 1),
            coverage_status=status,
        )

    def evaluate(
        self,
        *,
        report: AnalysisCoverageReport,
        intent: str,
        target_entity: str | None = None,
    ) -> CoverageGateDecision:
        """
        Verify if the analysis report provides sufficient evidence to answer the specified intent.
        """
        # If repository is empty or 0 files indexed
        if report.files_indexed == 0 and report.graph_nodes == 0:
            return CoverageGateDecision(
                is_sufficient=False,
                status=CoverageStatus.INSUFFICIENT,
                diagnostic_message=(
                    f"### ⚠️ UNKNOWN / INSUFFICIENT EVIDENCE for `{report.repository_name}`\n\n"
                    f"Coodara cannot reliably answer this `{intent}` query because repository telemetry is currently empty.\n\n"
                    f"- **Files Indexed**: `0`\n"
                    f"- **Graph Nodes**: `0`\n"
                    f"- **Dependency Edges**: `0`\n\n"
                    f"Please run a repository analysis before querying architectural properties."
                ),
                missing_requirements=["source_files", "dependency_graph", "symbols"],
                recommended_action="Trigger repository analysis via the Coodara Dashboard or CLI.",
            )

        # Check intent-specific requirements
        reqs = self.INTENT_REQUIREMENTS.get(intent, {"min_nodes": 1, "min_files": 1})
        min_nodes = reqs.get("min_nodes", 1)
        min_edges = reqs.get("min_edges", 0)

        missing: list[str] = []
        if report.graph_nodes < min_nodes and report.files_indexed < min_nodes:
            missing.append(f"Requires at least {min_nodes} indexed nodes/files (currently {report.graph_nodes} nodes / {report.files_indexed} files).")

        if min_edges > 0 and report.dependency_edges < min_edges:
            # If asking for centrality or cycles but have 0 edges
            if intent in {"CENTRALITY_ANALYSIS", "CIRCULAR_DEPENDENCY", "BLAST_RADIUS"}:
                missing.append(
                    f"Requires active dependency edge telemetry (currently {report.dependency_edges} edges across {report.graph_nodes} nodes)."
                )

        if missing:
            return CoverageGateDecision(
                is_sufficient=False,
                status=CoverageStatus.INSUFFICIENT,
                diagnostic_message=(
                    f"### ⚠️ UNKNOWN / INSUFFICIENT EVIDENCE: `{intent}` for `{report.repository_name}`\n\n"
                    f"Coodara cannot reliably compute conclusions for this question because the current analysis telemetry does not meet the minimum evidence threshold.\n\n"
                    f"**Current Telemetry Status:**\n"
                    f"- **Indexed Files**: `{report.files_indexed}`\n"
                    f"- **Graph Nodes**: `{report.graph_nodes}`\n"
                    f"- **Dependency Edges**: `{report.dependency_edges}`\n"
                    f"- **Indexed Symbols**: `{report.symbols_indexed}`\n"
                    f"- **Analysis Coverage**: `{report.coverage_percentage}%` ({report.coverage_status.value})\n\n"
                    f"**Missing Architectural Evidence:**\n"
                    + "\n".join(f"- {m}" for m in missing)
                    + f"\n\n*Invariant Enforced: Coodara refuses to generate generic architecture templates or false negative conclusions when evidence is incomplete.*"
                ),
                missing_requirements=missing,
                recommended_action="Re-run deep multi-language AST indexing on this repository.",
            )

        return CoverageGateDecision(
            is_sufficient=True,
            status=report.coverage_status,
            diagnostic_message="",
        )
