# Coodara Truth, Evidence & Reliability Audit

**Document Status:** Internal Engineering Audit (Phase 1 — Discovery & Pipeline Mapping)  
**Date:** September 2026  
**Auditor:** Antigravity AI Engine Pair  
**Repository Under Audit:** `coodara` (`ABIODUN43/coodara`)

---

## 1. Executive Summary & Objective

The objective of this audit is to verify that **every architectural claim made by the Coodara Architecture Intelligence Engine is backed by repository evidence, computed correctly, complete, internally consistent, reproducible, safe to act on, and non-hallucinatory**.

This audit establishes a strict truth classification model and maps every analytical stage of Coodara from initial checkout through AST extraction, graph generation, boundary calculation, consequence simulation, and recommendation synthesis to API and UI presentation.

---

## 2. End-to-End Analysis Pipeline

The Coodara analysis pipeline is partitioned into two distinct stages:

```
[Repository Ingestion]
         ↓
  [File Discovery]
         ↓
   [Parsing / AST]
         ↓
 [Symbol Extraction]
         ↓
[Dependency Extraction]
         ↓
 [Analysis Snapshot] (Persisted in PostgreSQL: analysis_results, dependency_graphs, repository_metrics)
         ↓
[Architecture Graph] (ArchitectureService -> ArchitectureAnalyzer)
         ↓
[Subsystem & Boundary Detection]
         ↓
[Issue Detection (Tarjan Cycles, Hotspots, Hubs, Martin Metrics)]
         ↓
[Recommendation Generation]
         ↓
[Architecture Memory Reconciliation] (ArchitectureMemoryService -> Reconciler)
         ↓
[Pillar 6 / What-If Consequence Simulation] (DeterministicSimulationEngine)
         ↓
[Design Blueprint & Agent Specification]
         ↓
[REST APIs & WebSocket Surfaces]
         ↓
[Frontend Presentation (Code Studio, Architecture Graph, Risks, History)]
```

### Stage-by-Stage Implementation Map

| Stage | Implementation Module | Source File | Responsibilities |
|---|---|---|---|
| **Repository Ingestion** | `RepositoryService`, `RepositoryWorkspace` | `apps/backend/app/services/repository_service.py`<br>`apps/backend/app/analysis/workspace.py` | Validates GitHub metadata, checks out repo into `data/repositories/{repo_id}`, isolates workspaces. |
| **Worker Orchestration** | Celery Tasks, `AnalysisExecutionService` | `apps/backend/app/workers/analysis_tasks.py`<br>`apps/backend/app/analysis/execution.py` | Asynchronously coordinates the analysis pipeline and job lifecycle (`PENDING` → `RUNNING` → `COMPLETED`/`FAILED`). |
| **File Discovery** | `DependencyAnalyzer._collect_source_files` | `apps/backend/app/analyzers/dependency_analyzer.py` | Scans repository tree; ignores caches/build dirs (`_IGNORED_DIRECTORIES`); filters polyglot source extensions. |
| **Parsing & AST** | `DependencyAnalyzer`, `MetricsAnalyzer` | `apps/backend/app/analyzers/dependency_analyzer.py`<br>`apps/backend/app/analyzers/metrics_analyzer.py` | Python AST parser (`ast.parse`); language-specific regex parsers for JS/TS, Java, Scala, Go, Rust, C/C++, C#. |
| **Symbol Extraction** | `DependencyAnalyzer._build_symbol_index` | `apps/backend/app/analyzers/dependency_analyzer.py` | Pre-computes O(1) symbol lookups (`nodes_set`, `stems_to_paths`, `fqcn_to_path`, `python_modules_to_path`, `path_suffixes_to_node`). |
| **Dependency Extraction** | `DependencyAnalyzer._resolve_target` | `apps/backend/app/analyzers/dependency_analyzer.py` | Maps import declarations and package paths into internal node IDs or external dependencies. |
| **Architecture Graph** | `ArchitectureGraph`, `parse_dependency_graph` | `apps/backend/app/architecture/graph.py` | Deserializes canonical snapshot JSON into typed domain graph (`ArchitectureNode`, `ArchitectureEdge`). |
| **Subsystem Detection** | `extract_subsystem`, `_infer_subsystem_info` | `apps/backend/app/architecture/simulation.py`<br>`apps/backend/app/api/v1/architecture.py` | Decomposes directory prefixes and structural layers (e.g., `apps/backend`, `apps/frontend`, `core/domain`). |
| **Boundary Analysis** | `get_architecture_boundaries`, `BoundaryCrossing` | `apps/backend/app/api/v1/architecture.py`<br>`apps/backend/app/architecture/simulation.py` | Identifies cross-subsystem edges, coupling matrices, and layer boundary transitions. |
| **ADR & Invariant Analysis** | `ADRScanner`, `ArchitectureDecision` | `apps/backend/app/architecture/adr_scanner.py`<br>`apps/backend/app/models/architecture.py` | Discovers and parses Markdown ADR files (`docs/adr/`, `rfcs/`, etc.) into structured decision records. |
| **Consequence / Blast Radius** | `DeterministicSimulationEngine` | `apps/backend/app/architecture/simulation.py` | Performs unweighted BFS inward and outward from target node; calculates hop depth, propagation paths, efferent coupling shift, and instability. |
| **Confidence Calculation** | `SimulationConfidence`, `ArchitectureScorer` | `apps/backend/app/architecture/simulation.py`<br>`apps/backend/app/architecture/scoring.py` | Categorizes structural and evidence confidence; computes aggregate modularity/coupling health score (0–100). |
| **Issue Detection** | `ArchitectureIssueDetector` | `apps/backend/app/architecture/issues.py` | Identifies circular dependencies (Tarjan's algorithm), dependency hotspots, hub modules, and SDP violations. |
| **Recommendation Generation** | `ArchitectureRecommendationEngine`, `analyze_architectural_impact` | `apps/backend/app/architecture/recommendations.py`<br>`apps/backend/app/api/v1/architecture.py` | Generates remediation guidance for detected issues and What-If interventions. |
| **Design Blueprint & Agent Spec** | `generate_agent_architecture_spec` | `apps/backend/app/api/v1/architecture.py` | Generates prompt-ready agent execution blueprints and Port/Adapter patterns. |
| **API Persistence** | PostgreSQL Repositories | `apps/backend/app/repositories/` | Persists snapshots, metrics, issues, recommendations, memory events, and rules into PostgreSQL. |
| **Frontend Presentation** | React / TypeScript Components | `apps/frontend/src/pages/`<br>`apps/frontend/src/components/architecture/` | Visualizes architecture graph, file tree, What-If simulation telemetry, issues, and historical drift. |

---

## 3. Output Inventory & Lineage

The following table catalogs every major output Coodara delivers to users, its computation source, persistence model, and verification status:

| Output | Source / Computation | Persistence Model | API Surface | Frontend Surface | LLM Involved? | Determinism |
|---|---|---|---|---|---|---|
| **File Tree** | `_build_annotated_disk_file_tree` or `_build_file_tree_from_graph` | On-disk checkout / `architecture_snapshots.graph` | `GET /architecture/file-tree` | `ArchitectureCodeStudio.tsx` | No | Deterministic |
| **File Content** | Direct disk read of repository checkout | Ephemeral disk | `GET /architecture/file-content` | `ArchitectureCodeStudio.tsx` | No | Deterministic |
| **Metrics (LOC, Classes, Complexity)** | `MetricsAnalyzer.analyze` | `repository_metrics` table | `GET /architecture` | `ArchitecturePage.tsx`, `DashboardHome.tsx` | No | Deterministic |
| **Detected Technologies** | `TechnologyAnalyzer.analyze` | `detected_technologies` table | `GET /architecture` | `ArchitecturePage.tsx` | No | Deterministic |
| **Dependency Graph** | `DependencyAnalyzer.analyze` | `dependency_graphs` table, `architecture_snapshots.graph` | `GET /architecture` | `ArchitectureGraph.tsx` | No | Deterministic |
| **Architecture Score** | `ArchitectureScorer.calculate` | `architecture_scores` table | `GET /architecture` | `ArchitecturePage.tsx`, `DashboardHome.tsx` | No | Deterministic |
| **Architecture Issues** | `ArchitectureIssueDetector.detect` | `architecture_issues` table | `GET /architecture` | `RisksPage.tsx`, `ArchitecturePage.tsx` | No | Deterministic |
| **Architecture Recommendations (Static)** | `ArchitectureRecommendationEngine.generate` | `architecture_recommendations` table | `GET /architecture` | `ArchitecturePage.tsx` | No | Deterministic |
| **Subsystem Boundaries** | Path prefix decomposition of graph edges | Derived in-memory from graph | `GET /architecture/boundaries` | `ArchitecturePage.tsx` | No | Deterministic |
| **What-If Direct Impacts** | `DeterministicSimulationEngine` direct neighbors | In-memory computation / logging | `POST /architecture/impact-analysis` | `ArchitectureCodeStudio.tsx` | No | Deterministic |
| **What-If Transitive Impacts & Paths** | `DeterministicSimulationEngine` BFS unweighted | In-memory computation / logging | `POST /architecture/impact-analysis` | `ArchitectureCodeStudio.tsx` | No | Deterministic |
| **What-If Instability / Coupling Shift** | Martin metric: $I = C_e / (C_e + C_a)$ | In-memory computation | `POST /architecture/impact-analysis` | `ArchitectureCodeStudio.tsx` | No | Deterministic |
| **What-If Confidence** | `structural_confidence`, `evidence_confidence`, `runtime_confidence` | In-memory computation | `POST /architecture/impact-analysis` | `ArchitectureCodeStudio.tsx` | No | Deterministic |
| **What-If Teams Impacted** | String interpolation on subsystem name | In-memory computation | `POST /architecture/impact-analysis` | `ArchitectureCodeStudio.tsx` | No | **Heuristic / Synthetic** |
| **What-If ADR Violations** | `select(ArchitectureDecision)` or fallback synthetic | In-memory / `architecture_decisions` | `POST /architecture/impact-analysis` | `ArchitectureCodeStudio.tsx` | No | **Synthetic fallback** |
| **What-If Recommended Design** | Hardcoded string interpolation in `architecture.py` | In-memory computation | `POST /architecture/impact-analysis` | `ArchitectureCodeStudio.tsx` | No | **Fabricated templates & scores** |
| **Agent Spec** | Template string with simulation metrics | In-memory computation | `POST /architecture/agent-spec` | `ArchitectureCodeStudio.tsx` | Optional LLM | Template / Semi-deterministic |
| **Architecture AI Chat** | `ContextEngine` + LLM provider | PostgreSQL `chat_messages` | `POST /chat` | `AIAssistantPage.tsx` | **Yes (LLM)** | Non-deterministic |

---

## 4. Truth Classification Model

Every claim, metric, and artifact generated by Coodara must fall into one of four verified categories:

```
  ┌──────────────────────────────────────────────────────────────┐
  │                           OBSERVED                           │
  │ Directly proven by repository files, AST, commits, or configs│
  └──────────────────────────────┬───────────────────────────────┘
                                 │
                                 ▼
  ┌──────────────────────────────────────────────────────────────┐
  │                           INFERRED                           │
  │ Logically derived from observed facts (BFS paths, coupling)  │
  └──────────────────────────────┬───────────────────────────────┘
                                 │
                                 ▼
  ┌──────────────────────────────────────────────────────────────┐
  │                           PROPOSED                           │
  │ Explicitly labeled recommendations or new design contracts   │
  │ (Must NEVER be presented as existing repository code/facts)  │
  └──────────────────────────────┬───────────────────────────────┘
                                 │
                                 ▼
  ┌──────────────────────────────────────────────────────────────┐
  │                           UNKNOWN                            │
  │ Cannot be proven from static source evidence (runtime data,  │
  │ team ownership, production traffic, unreferenced contracts) │
  └──────────────────────────────────────────────────────────────┘
```

### Truth Enforcement Invariants:
1. **Never conflate UNKNOWN with ZERO**: If team ownership is not specified in CODEOWNERS or metadata, team is `UNKNOWN`, not `"Root Team"`.
2. **Never present PROPOSED as EXISTING**: Generated interfaces (`I...Port`) must be labeled `PROPOSED INTERFACE`, never implying that the symbol or contract already exists in the repository.
3. **Never synthesize evidence when missing**: If zero ADRs are found in the repository, ADR violations must be `0` / empty, never inventing `ADR-INV-01: Domain Interface Isolation Contract`.
4. **Pattern Fit $\neq$ Problem Existence $\neq$ Recommendation Validity**: A 95% pattern match must never trigger an intervention unless evidence establishes that an architectural defect or boundary violation actually exists.
5. **Support "NO INTERVENTION REQUIRED" as a First-Class Outcome**: If a component has 0 inbound callers, 0 boundary crossings, and stable coupling, Coodara must return `NO INTERVENTION REQUIRED`.

---

## 5. Root Cause Analysis: The `apps/backend/__init__.py` Investigation

### The Defect
When analyzing its own repository (`coodara`), Coodara recommended:
- **Component:** `apps/backend/__init__.py`
- **Pattern:** `Port / Adapter & Dependency Inversion Pattern` (Fit: **95%**)
- **Alternative:** `Asynchronous Domain Events` (Fit: **88%**)
- **Generated Interface:**
  ```python
  class IinitpyPort(Protocol):
      async def execute_operation(self, payload: dict) -> dict:
          ...
  ```
- **Violations Cited:** `ADR-INV-01: Domain Interface Isolation Contract`
- **Teams Impacted:** `Root Team`, contact `@root-team-guild`
- **Cost Estimate:** `"Increases initial refactoring setup time by ~1 hour."`

### Reconciled Defect Taxonomy (8 Systemic Correctness Defects)

Line-by-line inspection of `apps/backend/app/architecture/simulation.py` and `apps/backend/app/api/v1/architecture.py` (lines 2940–3130) establishes an exact taxonomy of 8 independent correctness defects:

1. **Defect 1 — Target Self-Impact Accounting:**
   In `simulation.py` (line 312), the target node itself is appended to `direct_impacts` with `relationship="target"`. Consequently, `direct_impact_count` is always $\ge 1$, even for completely disconnected nodes with 0 callers and 0 dependencies. The target entity is conflated with downstream affected components.
2. **Defect 2 — Missing Decision Capability (`NO_INTERVENTION_REQUIRED`):**
   The architecture engine lacks a first-class `NO_INTERVENTION_REQUIRED` decision state. It operates under the false assumption that an intervention is always warranted, feeling compelled to recommend a refactoring pattern even when no architectural problem, boundary crossing, or invariant violation exists. (Note: This is a missing analytical decision capability, rather than merely an empirical false negative).
3. **Defect 3 — Hardcoded Fit Score (Dependency Inversion = 95):**
   Line 3063 hardcodes literal integer `fit_score=95` for Port/Adapter. This number is not computed from graph structure, metrics, or evidence.
4. **Defect 4 — Hardcoded Fit Score (Domain Events = 88):**
   Line 3074 hardcodes literal integer `fit_score=88` for Asynchronous Domain Events without computational or statistical derivation.
5. **Defect 5 — Arbitrary Implementation Time Estimate:**
   Line 3117 emits `"Increases initial refactoring setup time by ~1 hour."` as a static string literal without empirical project telemetry or estimation modeling.
6. **Defect 6 — Fabricated Interface & Method Signatures:**
   Line 3044 runs `safe_name = comp_name.replace(".", "").replace("_", "").replace("-", "")`. For `__init__.py`, this produces `initpy` (`IinitpyPort`). Line 3049 unconditionally generates `async def execute_operation(self, payload: dict) -> dict:`. Neither `IinitpyPort` nor `execute_operation` exists in the repository or corresponds to any real domain model.
7. **Defect 7 — Synthetic ADR Fallback:**
   Lines 3032–3041 inject a fabricated decision record:
   ```python
   ADRViolationDetail(
       adr_id="ADR-INV-01",
       adr_title="Domain Interface Isolation Contract",
       violation_reason=f"Modifying {comp_name} directly without interface extraction violates boundary isolation.",
       ...
   )
   ```
   If the repository has no authentic ADRs, Coodara invents one rather than reporting `0 ADR violations` or `ADR evidence: UNKNOWN`.
8. **Defect 8 — Fabricated Team & Guild Ownership:**
   Line 2951 constructs `team=f"{d.subsystem.title()} Team"` and line 2984 creates `lead_contact=f"@{t_name.lower().replace(' ', '-')}-guild"`. For `__init__.py` under root, this invents the `"Root Team"` and `"@root-team-guild"` without repository `CODEOWNERS` or metadata evidence.

---

## 6. Inventory of Deterministic vs Non-Deterministic Components

> [!NOTE]
> **Verification Level:** At this stage, deterministic pipeline stages represent *implementation-level determinism verified by code inspection*. True factual and computational correctness is not assumed proven until evaluated against independent ground-truth fixtures and human-authored oracles in Phase 3.

| Component | Status | Guarantee |
|---|---|---|
| AST Parsing (`DependencyAnalyzer`) | **Deterministic** | Given identical source files, always produces identical nodes and edges. |
| Metrics Calculation (`MetricsAnalyzer`) | **Deterministic** | LOC, complexity, file counts are computed by pure algorithmic scanning. |
| Graph Construction (`parse_dependency_graph`) | **Deterministic** | JSON serialization and deserialization are sorted and deterministic. |
| Cycle Detection (`TarjanCycleDetector`) | **Deterministic** | Pure Tarjan SCC algorithm with deterministic cycle ordering. |
| Martin Coupling Metrics (`RobertMartinMetricsEngine`) | **Deterministic** | Mathematical formula: $Ca, Ce, I = Ce / (Ce + Ca), A, D$. |
| Issue Detection (`ArchitectureIssueDetector`) | **Deterministic** | Pure rule evaluation sorted by severity, category, description. |
| Graph Simulation (`DeterministicSimulationEngine`) | **Deterministic** | Unweighted BFS with sorted neighbor traversal. |
| Recommendation Selection (`analyze_architectural_impact`) | **Flawed Determinism** | Deterministic but statically hardcoded (95%, 88%, fake ADRs, invented symbols). |
| AI Chat Assistant (`ContextEngine`, LLMs) | **Non-Deterministic** | Generative LLM responses; relies on temperature and external API calls. |

---

## 7. Known Weaknesses & Reliability Risks

1. **Lack of "No Intervention Required" Outcome:**
   The recommendation engine assumes that an intervention is always desired and always recommends Port/Adapter or Event-driven patterns.
2. **Unvalidated Pattern Fit Scores:**
   Fit percentages (`95%`, `88%`) are literal numbers rather than calibrated functions of coupling reduction, boundary restoration, or violation resolution.
3. **Invented Ownership & Contacts:**
   Fabricating team names (`Root Team`, `Core Team`) when CODEOWNERS or git blame data is absent.
4. **Invented Invariants:**
   Fabricating `ADR-INV-01` when no authentic repository ADRs exist.
5. **Self-Impact Accounting:**
   Counting the target component as an "impacted downstream component" inflates blast radius metrics on leaf nodes.
6. **Ephemeral Disk Dependency in Render Free:**
   Code Studio file tree falls back to graph parsing when ephemeral disk checkouts are cleared, triggering blocking HTTP clones or empty trees.

---

## 8. Test Coverage Assessment

### Existing Tests
- `apps/backend/tests/analyzers/test_dependency_analyzer.py` (Coverage: symbol index, Java/Scala FQCN, Python/Rust target resolution).
- `apps/backend/tests/architecture/test_analyzer.py` (Coverage: ArchitectureAnalyzer pipeline orchestration).
- `apps/backend/tests/architecture/test_cycles.py` (Coverage: Tarjan cycle detector).
- `apps/backend/tests/architecture/test_issues.py` (Coverage: Issue detector categories).
- `apps/backend/tests/architecture/test_metrics.py` (Coverage: Robert Martin metrics computation).
- `apps/backend/tests/architecture/test_adr_scanner.py` (Coverage: ADR markdown parsing).

### Missing Tests (Required for Truth & Reliability)
1. **Isolated Leaf Component Test:** Verifies that a node with 0 inbound callers and 0 dependencies produces `0` affected components and `"NO INTERVENTION REQUIRED"`.
2. **Hallucination Detection Tests:** Asserts that Coodara never invents non-existent symbols (`execute_operation`), ADR IDs (`ADR-INV-01`), or team guilds (`@...-guild`).
3. **Ground-Truth Graph Fixtures:** Controlled micro-repositories with known mathematical oracles (transitive chains, cycles, diamond dependencies, re-exports).
4. **Recommendation Safety Tests:** Verifies that pattern fit alone does not trigger a recommendation when no architectural problem exists.
5. **Ground-Truth Team & ADR Verification:** Ensures that missing metadata returns `UNKNOWN` or `None`, never fabricated names.
6. **Self-Analysis Regression Test:** End-to-end verification of Coodara analyzing `apps/backend/__init__.py` without false-positive port recommendations.

---

## 9. Completed Phases

- **Phase 1 (Completed):** Complete pipeline inspection and mapping documented in this report.
- **Phase 2 (Completed):** Formalized the Truth Model in `app/architecture/models.py` (`TruthStatus`, `TruthClaim`) and simulation response schemas.
- **Phase 3 (Completed):** Constructed the 18 ground-truth fixture corpus (`tests/reliability/fixtures/`) with human-authored `oracle.json` specifications.
- **Phase 4 & 5 (Completed):** Fixed all 8 correctness defects with targeted code changes and regression tests:
  - Added `NO_INTERVENTION_REQUIRED` decision outcome when no architectural problem exists.
  - Eliminated hardcoded 95%/88% fit scores; replaced with dynamic, evidence-based coupling/boundary scoring.
  - Eliminated synthetic `ADR-INV-01` injection; only authentic repository ADRs are cited.
  - Eliminated fabricated `"Root Team"` and `"@root-team-guild"`; metadata-absent teams default to `UNKNOWN` and `teams_impacted = []`.
  - Labeled proposed interfaces with `[PROPOSED DESIGN - NOT AN EXISTING REPOSITORY SYMBOL]`; removed fabricated `execute_operation`.
  - Fixed target self-impact accounting in `simulation.py` (target entity separated from downstream affected components).
  - Eliminated arbitrary `~1 hour` refactoring setup time estimate from tradeoffs.
  - Added 34 reliability and regression tests in `apps/backend/tests/reliability/`.

---

## 10. Phase 4 & Phase 5 Remediation Verification (Before vs After)

| Item / Finding | Before Remediation | After Remediation | Ground-Truth Invariant Verified |
|---|---|---|---|
| **Defect 1: Target Self-Impact Accounting** | Target entity appended to `direct_impacts` (`relationship="target"`). Disconnected nodes reported `direct_impact_count = 1`. | Target separated into `sim_res.target_entity`. Disconnected nodes report `direct_impact_count = 0`. | Target entity $\neq$ downstream affected component. |
| **Defect 2: Missing `NO_INTERVENTION_REQUIRED`** | Engine unconditionally forced Port/Adapter or Domain Events recommendations even on completely isolated modules. | Returns `pattern_name="NO_INTERVENTION_REQUIRED"`, `summary="Component is structurally isolated..."`, `alternative_patterns=[]`. | Pattern fit $\neq$ Problem existence $\neq$ Recommendation validity. |
| **Defects 3 & 4: Static Fit Scores (95, 88)** | Literal integers `fit_score=95` and `fit_score=88` hardcoded in `architecture.py`. | Dynamically computed based on boundaries crossed and efferent fan-out shift: $\text{fit} = f(\Delta I, \text{boundaries})$. | Fit scores must be mathematically grounded in graph telemetry. |
| **Defect 5: Arbitrary Time Estimate** | Tradeoffs included `"Increases initial refactoring setup time by ~1 hour."` without empirical telemetry. | Removed arbitrary time estimate; replaced with factual architectural tradeoffs (e.g. interface maintenance overhead). | Estimates must not claim specific durations without project history telemetry. |
| **Defect 6: Fabricated Symbols & Signatures** | Generated `IinitpyPort` with `async def execute_operation(self, payload: dict) -> dict:`. | Explicitly labeled `# [PROPOSED DESIGN - NOT AN EXISTING REPOSITORY SYMBOL]`. Eliminated fake `execute_operation`. | Proposed designs must never be presented as existing repository code. |
| **Defect 7: Synthetic ADR Fallback** | Fallback injected `ADR-INV-01: Domain Interface Isolation Contract` when 0 repository ADRs existed. | Removed synthetic fallback. If repo has 0 ADRs, `adr_violations = []`. Only authentic repository ADRs are cited. | Never synthesize architectural records when absent from repository. |
| **Defect 8: Fabricated Team & Guild Ownership** | Created `"{subsystem} Team"` and `"@{team}-guild"`, generating `"Root Team"` and `"@root-team-guild"`. | Component `team` defaults to `UNKNOWN`. If team metadata is absent, `teams_impacted = []` and lead contact is `"Unassigned"`. | Never invent organizational teams or contacts without CODEOWNERS or metadata. |

---

## 11. Final Verification & Test Suite Summary

- **34 / 34 Reliability Tests Passing** (`apps/backend/tests/reliability/`):
  - `test_truth_model.py`: 5/5 passed (semantic truth states, invariant rules).
  - `test_ground_truth_fixtures.py`: 18/18 passed (evaluating all 18 controlled micro-repositories against independent mathematical oracles).
  - `test_critical_regressions.py`: 7/7 passed (verifying isolated module facts, self-accounting, ADR presence/absence, team presence/absence).
  - `test_remediation_behavior.py`: 4/4 passed (verifying schema defaults, NO_INTERVENTION_REQUIRED on isolated modules, no synthetic ADR/team generation, dynamic fit scores and proposed design notices).
- **39 / 39 Analyzers Tests Passing** (`apps/backend/tests/analyzers/`).
- **5 / 5 Simulation Engine Unit Tests Passing** (`apps/backend/tests/architecture/test_simulation.py`).
- **Preserved Boundary Invariant:** All frontend files remain untouched and isolated from the truth & reliability remediation.
