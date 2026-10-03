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
  - Evaluated if `storage_gb > 0` and `storage_gb_month` exists in the rate card. If rate is missing, persistent storage is marked as not modeled in the formulas.
- **Database Instances:**
  - Evaluated only when `resource.database_class` is explicitly defined and non-empty.
  - If configured but `database_hour` is missing from the rate card, `database_modeled = False` and the component cost is set to `0.00`.

---

## 4. Network Egress Modeling: Zero-Assumption Architecture

Earlier iterations assumed a static heuristic of 20 KB/request when traffic throughput was specified. Under Stage 5.1 input integrity rules, **arbitrary packet size heuristics are completely removed**:

1. **Supported Explicit Inputs:**
   - Workload data volume: `workload.data_volume_gb`
   - Workload configuration monthly egress: `workload.configuration["monthly_egress_gb"]`
   - Workload average request payload: `workload.configuration["average_egress_kb_per_request"]` (evaluated with `requests_per_second`)
2. **Missing Input Behavior:**
   - If none of the explicit inputs above exist, network egress is **NOT modeled**.
   - `network_modeled = False`, `monthly_network = 0.00`.
   - The formula transparently notes:
     `"Network egress cost not modeled: explicit data_volume_gb, monthly_egress_gb, or average_egress_kb_per_request required"`
   - The UI displays `"Not Modeled (explicit egress input required)"` instead of a fabricated zero or synthetic cost.

---

## 5. Operational Conventions & Metadata

Operational time conversions are exposed explicitly as calculation conventions in both `EconomicEstimate` and `EvidenceItem.provenance`:

| Convention Constant | Value | Derivation |
| :--- | :--- | :--- |
| `hours_per_month` | `730.0` | 365 days / 12 months × 24 hours |
| `days_per_month` | `30.4167` | 365 days / 12 months |
| `hours_per_day` | `24.0` | Standard solar day |

---

## 6. Classified Assumptions Ledger

Every parameter used in economic modeling is classified into an explicit taxonomy:

- **`SUPPLIED PRICING SNAPSHOT`**: External rate card supplied as a controlled input. Never labeled as "current cloud pricing" or "modeled assumption".
- **`ASSUMED`**: Configured resource specifications, replica counts, or synthetic workload profiles.
- **`MEASURED`**: Observed production telemetry or load-testing benchmarks (`workload.is_measured == True`).
- **`OBSERVED`**: Static repository structures or directly inspected infrastructure configurations.
