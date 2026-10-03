# Architectural Economics Intelligence (AEI): Input Integrity & Provenance

## 1. Principles of Architectural Economics

Coodara's Architectural Economics layer provides transparent, deterministic cost modeling to answer:

> *"Given this exact architectural experiment, these workload assumptions, these resource assumptions, and this pricing snapshot, what is the modeled economic consequence of the proposed architecture?"*

### Non-Negotiable Semantic Guardrails

1. **Deterministic Projections, Not Live Billing:**
   All configuration-first economic results are strictly categorized as `MODELED`, never `MEASURED`. The system never claims "guaranteed savings" or "proven cost reductions" without empirical runtime validation.
2. **Explicit Controlled Inputs:**
   Economic calculations never rely on silent auto-seeding, hidden heuristics, or fallback magic numbers. Missing required rates fail fast with actionable validation errors.
3. **Traceable Pricing Provenance:**
   Every economic evidence item records the exact `PricingSnapshot` (`id`, `provider`, `region`, `currency`, `pricing_source`, `captured_at`, `source_metadata`) and explicitly states that costs are *"calculated from the supplied PricingSnapshot"*.

---

## 2. Pricing Snapshot Requirements & Isolation

- **No Silent Auto-Seeding:**
  Listing pricing snapshots (`GET /pricing-snapshots` / `list_pricing_snapshots`) never seeds default cloud rate cards. Pricing snapshots must be explicitly captured or imported by users (`POST /pricing-snapshots`).
- **Required Reference Rate Card:**
  If an economic evaluation or comparison is triggered without an existing `PricingSnapshot`, the service raises `LabValidationError`:
  `"Pricing snapshot required. No reference rate card has been captured or supplied."`
- **Mandatory Unit Rates:**
  The supplied rate card must provide valid unit rates for compute (`vcpu_hour` or `compute_unit_hour`) and memory (`memory_gib_hour` or `ram_gib_hour`). If either is missing, calculation fails with `PricingRateNotFoundError`.

---

## 3. Resource & Workload Sizing Input Rules

- **Resource Sizing (`cpu`, `memory`):**
  - Numeric or string formats (e.g. `2`, `2 vCPU`, `2000m`, `4Gi`, `4096Mi`, `4GB`) must represent positive values.
  - Missing (`None`), empty, or non-positive values raise `EconomicInputValidationError`. Silent substitution of default sizes is prohibited.
- **Storage GB:**
  - If `resource.storage_gb is None`, persistent storage is marked as **`storage_modeled = False`** with reason `"Persistent storage capacity not specified in ResourceProfile"`.
  - If `resource.storage_gb == 0.0`, storage is modeled as `$0.00` (`storage_modeled = True`, truly stateless).
  - If `storage_gb > 0`: evaluated using `storage_gb_month`. If the unit rate is missing from the rate card, storage is marked as **`storage_modeled = False`** with reason `"Storage unit rate 'storage_gb_month' missing from PricingSnapshot rate card"`.
- **Database Instances:**
  - If `resource.database_class` is not configured, database is modeled as `$0.00` (`database_modeled = True`, no dedicated database).
  - If `resource.database_class` is specified but `database_hour` is missing from the rate card, database is marked as **`database_modeled = False`** with reason `"Database instance rate 'database_hour' missing from PricingSnapshot rate card for <class>"`.
- **Workload Data Volume (`data_volume_gb`):**
  - `workload.data_volume_gb` represents the dataset or storage working set size, **NOT network egress volume**. It is recorded in classified assumptions as `"Data Working Set Size"` and does not model network egress.

---

## 4. Network Egress Modeling: Zero-Assumption Architecture

Arbitrary packet size heuristics and dataset size conflation are completely eliminated:

1. **Supported Explicit Inputs:**
   - Workload configuration monthly egress: `workload.configuration["monthly_egress_gb"]` or `workload.configuration["egress_volume_gb"]`
   - Workload average request payload: `workload.configuration["average_egress_kb_per_request"]` (evaluated with `requests_per_second`)
2. **Missing Input Behavior:**
   - If none of the explicit network egress inputs above exist, network egress is **NOT modeled**.
   - `network_modeled = False`, `monthly_network = 0.00`.
   - Recorded reason: `"Explicit egress volume input (monthly_egress_gb or average_egress_kb_per_request) required"`.
   - The UI and API display `"Not Modeled"` with the exact reason instead of a misleading `$0.00`.

---

## 5. Calculation Completeness & Partial-Model Semantics

Economic calculations explicitly track completeness:

- **`COMPLETE`**: All five core infrastructure components (`compute`, `memory`, `database`, `storage`, `network`) are explicitly modeled. The total is labeled `"Modeled Monthly Total"`.
- **`PARTIAL`**: One or more components are unmodeled due to missing profile inputs or pricing rates. The total is labeled `"Modeled Monthly Total (Partial — excludes <components>)"`. The system never represents an incomplete sum simply as "Total Cost".

### Comparative Semantics for Partial Models

When comparing baseline and proposed architectures:
1. **Completeness Evaluation:**
   - `comparison_completeness` is `COMPLETE` only when both baseline and proposed models are `COMPLETE`.
   - If either model is `PARTIAL`, the comparison is marked as `PARTIAL`.
2. **Component Tracking:**
   - `common_modeled_components`: List of components modeled in BOTH scenarios.
   - `unmodeled_components`: List of components unmodeled in either or both scenarios.
3. **Delta Neutrality:**
   - The comparison explanation explicitly warns that the delta reflects only common modeled components, preventing false impressions of savings when unmodeled components differ.
   - Footnotes and methodology notes explicitly document excluded infrastructure categories.

---

## 6. Operational Conventions & Metadata

Operational time conversions are exposed explicitly as calculation conventions in both `EconomicEstimate` and `EvidenceItem.provenance`:

| Convention Constant | Value | Derivation |
| :--- | :--- | :--- |
| `hours_per_month` | `730.0` | 365 days / 12 months × 24 hours |
| `days_per_month` | `30.4167` | 365 days / 12 months |
| `hours_per_day` | `24.0` | Standard solar day |

---

## 7. Classified Assumptions Ledger

Every parameter used in economic modeling is classified into an explicit taxonomy:

- **`SUPPLIED PRICING SNAPSHOT`**: External rate card supplied as a controlled input. Never labeled as "current cloud pricing" or "modeled assumption".
- **`ASSUMED`**: Configured resource specifications, replica counts, or synthetic workload profiles.
- **`MEASURED`**: Observed production telemetry or load-testing benchmarks (`workload.is_measured == True`).
- **`OBSERVED`**: Static repository structures or directly inspected infrastructure configurations.
