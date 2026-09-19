"""
Architecture analysis and graph reasoning tools for Coodara AI (Silicon Valley 95%+ Standard).
"""

from app.ai.tools.concept_search import (
    ConceptMatch,
    ConceptSearchResult,
    search_architecture_concepts,
)
from app.ai.tools.dataflow_engine import (
    RequestPipeline,
    RequestPipelineStage,
    discover_request_pipelines,
    format_request_pipeline_diagram,
    trace_request_flow,
)
from app.ai.tools.fitness_engine import (
    ArchitectureFitnessReport,
    ArchitectureRule,
    RuleSeverity,
    RuleViolation,
    evaluate_architecture_fitness,
)
from app.ai.tools.graph_tools import (
    CouplingMetricResult,
    CycleDetectionResult,
    LayerViolationResult,
    ModuleImportanceResult,
    PathTraceResult,
    RefactoringStep,
    RemovalSimulationResult,
    calculate_coupling_metrics,
    detect_dependency_cycles,
    find_high_coupling_modules,
    generate_refactoring_action_plan,
    get_repository_structure,
    rank_module_importance,
    simulate_component_removal,
    trace_dependency_path,
)
from app.ai.tools.patch_engine import (
    ArchitecturePatchResult,
    generate_architecture_patch,
)
from app.ai.tools.symbol_engine import (
    SymbolCallSite,
    SymbolDefinition,
    SymbolHierarchyResult,
    SymbolKind,
    build_symbol_call_graph,
    extract_symbols_from_source,
    trace_symbol_hierarchy,
)

__all__ = [
    # Graph Topology
    "CouplingMetricResult",
    "CycleDetectionResult",
    "LayerViolationResult",
    "ModuleImportanceResult",
    "PathTraceResult",
    "RefactoringStep",
    "RemovalSimulationResult",
    "calculate_coupling_metrics",
    "detect_dependency_cycles",
    "find_high_coupling_modules",
    "generate_refactoring_action_plan",
    "get_repository_structure",
    "rank_module_importance",
    "simulate_component_removal",
    "trace_dependency_path",
    # Symbol Call Graphs
    "SymbolKind",
    "SymbolDefinition",
    "SymbolCallSite",
    "SymbolHierarchyResult",
    "extract_symbols_from_source",
    "build_symbol_call_graph",
    "trace_symbol_hierarchy",
    # Data Flow Pipelines
    "RequestPipelineStage",
    "RequestPipeline",
    "discover_request_pipelines",
    "trace_request_flow",
    "format_request_pipeline_diagram",
    # Fitness Rules & ArchUnit
    "RuleSeverity",
    "ArchitectureRule",
    "RuleViolation",
    "ArchitectureFitnessReport",
    "evaluate_architecture_fitness",
    # Concept Search
    "ConceptMatch",
    "ConceptSearchResult",
    "search_architecture_concepts",
    # Patch Generator
    "ArchitecturePatchResult",
    "generate_architecture_patch",
]
