import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  X,
  AlertTriangle,
  Info,
  ArrowRight,
  Layers,
  Lock,
  Unlock,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sliders,
  FileCheck2,
} from "lucide-react";
import {
  getArchitectureBoundaries,
  getArchitectureRules,
  createArchitectureRule,
  deleteArchitectureRule,
  evaluateArchitectureQualityGate,
} from "@/api/architecture";
import type {
  ArchitectureBoundaryMatrixResponse,
  ArchitectureBoundaryRule,
  ArchitectureRuleResponse,
  ArchitectureRuleCreateRequest,
  ArchitectureQualityGateResponse,
} from "@/types/architecture";

interface ArchitectureBoundariesModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string | number;
  repositoryId: string | number;
  onNavigateToStudio?: () => void;
}

export function ArchitectureBoundariesModal({
  isOpen,
  onClose,
  orgId,
  repositoryId,
  onNavigateToStudio,
}: ArchitectureBoundariesModalProps) {
  const [activeTab, setActiveTab] = useState<"matrix" | "rules" | "gate">("matrix");

  // Matrix State
  const [data, setData] = useState<ArchitectureBoundaryMatrixResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRule, setSelectedRule] = useState<ArchitectureBoundaryRule | null>(null);

  // Custom Rules State
  const [customRules, setCustomRules] = useState<ArchitectureRuleResponse[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [newRule, setNewRule] = useState<ArchitectureRuleCreateRequest>({
    name: "",
    rule_type: "disallow_dependency",
    source_pattern: "",
    target_pattern: "",
    severity: "critical",
    rationale: "",
    is_active: true,
  });
  const [ruleSubmitting, setRuleSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Quality Gate State
  const [gateResult, setGateResult] = useState<ArchitectureQualityGateResponse | null>(null);
  const [gateLoading, setGateLoading] = useState(false);

  const loadBoundaries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getArchitectureBoundaries(orgId, repositoryId);
      setData(res);
      if (res.rules.length > 0) {
        const breachRule = res.rules.find((r) => r.violation_count > 0) || res.rules[0];
        setSelectedRule(breachRule);
      }
    } catch (err) {
      console.error("Failed to load boundaries", err);
    } finally {
      setLoading(false);
    }
  }, [orgId, repositoryId]);

  const loadCustomRules = useCallback(async () => {
    try {
      setRulesLoading(true);
      const res = await getArchitectureRules(orgId, repositoryId);
      setCustomRules(res.rules);
    } catch (err) {
      console.error("Failed to load custom rules", err);
    } finally {
      setRulesLoading(false);
    }
  }, [orgId, repositoryId]);

  const runQualityGate = useCallback(async () => {
    try {
      setGateLoading(true);
      setActionError(null);
      const res = await evaluateArchitectureQualityGate(orgId, repositoryId);
      setGateResult(res);
    } catch (err) {
      console.error("Failed to evaluate quality gate", err);
      setActionError("Failed to evaluate quality gate. Please ensure analysis is up to date.");
    } finally {
      setGateLoading(false);
    }
  }, [orgId, repositoryId]);

  useEffect(() => {
    if (isOpen) {
      void loadBoundaries();
      void loadCustomRules();
      void runQualityGate();
    }
  }, [isOpen, loadBoundaries, loadCustomRules, runQualityGate]);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.name.trim() || !newRule.source_pattern.trim() || !newRule.target_pattern.trim()) {
      setActionError("Please fill out all required rule fields.");
      return;
    }

    try {
      setRuleSubmitting(true);
      setActionError(null);
      await createArchitectureRule(orgId, repositoryId, newRule);
      setIsAddingRule(false);
      setNewRule({
        name: "",
        rule_type: "disallow_dependency",
        source_pattern: "",
        target_pattern: "",
        severity: "critical",
        rationale: "",
        is_active: true,
      });
      await loadCustomRules();
      await runQualityGate();
    } catch (err) {
      console.error("Failed to create rule", err);
      setActionError("Failed to create custom boundary rule.");
    } finally {
      setRuleSubmitting(false);
    }
  };

  const handleDeleteRule = async (ruleId: number) => {
    try {
      setActionError(null);
      await deleteArchitectureRule(orgId, repositoryId, ruleId);
      await loadCustomRules();
      await runQualityGate();
    } catch (err) {
      console.error("Failed to delete rule", err);
      setActionError("Failed to delete custom rule.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-[var(--cd-border)] bg-[var(--cd-surface)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--cd-border-soft)] px-6 py-4 bg-[var(--cd-sunken)]/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-bold text-[var(--cd-ink)]">
                  Architectural Boundaries &amp; Quality Gate
                </h2>
                <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  PRODUCTION GOVERNANCE
                </span>
              </div>
              <p className="text-[12px] text-[var(--cd-ink-soft)]">
                Formal allowed vs. forbidden dependency policies, custom boundary rules, and automated CI/CD Quality Gate.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {data && (
              <div className="flex items-center gap-2 rounded-lg bg-[var(--cd-surface)] px-3 py-1 border border-[var(--cd-border)]">
                <span className="text-[11px] text-[var(--cd-ink-faint)]">Compliance:</span>
                <span className="font-mono text-[13px] font-bold text-[var(--cd-accent)]">
                  {data.compliance_score}%
                </span>
              </div>
            )}
            <button
              onClick={onClose}
              className="cursor-pointer rounded-lg p-1.5 text-[var(--cd-ink-faint)] hover:bg-[var(--cd-sunken)] hover:text-[var(--cd-ink)] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-[var(--cd-border-soft)] px-6 py-2.5 bg-[var(--cd-sunken)]/30 text-[13px]">
          <button
            onClick={() => setActiveTab("matrix")}
            className={`flex cursor-pointer items-center gap-2 px-3.5 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === "matrix"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-[var(--cd-ink-soft)] hover:bg-[var(--cd-surface)] hover:text-[var(--cd-ink)]"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Directional Layer Matrix</span>
          </button>

          <button
            onClick={() => setActiveTab("rules")}
            className={`flex cursor-pointer items-center gap-2 px-3.5 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === "rules"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-[var(--cd-ink-soft)] hover:bg-[var(--cd-surface)] hover:text-[var(--cd-ink)]"
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>Custom Policy Rules</span>
            <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10.5px]">
              {customRules.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("gate")}
            className={`flex cursor-pointer items-center gap-2 px-3.5 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === "gate"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-[var(--cd-ink-soft)] hover:bg-[var(--cd-surface)] hover:text-[var(--cd-ink)]"
            }`}
          >
            <FileCheck2 className="h-4 w-4" />
            <span>CI/CD Quality Gate</span>
            {gateResult && (
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  gateResult.passed ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                }`}
              >
                {gateResult.passed ? "PASSED" : "FAILED"}
              </span>
            )}
          </button>
        </div>

        {/* Action Error Banner */}
        {actionError && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[12px] flex items-center justify-between">
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)} className="cursor-pointer text-xs underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "matrix" && (
            <>
              {/* Top Info Banner */}
              <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-sunken)]/40 p-4 flex items-start gap-3">
                <Info className="h-4 w-4 text-[var(--cd-accent)] shrink-0 mt-0.5" />
                <div className="text-[12px] text-[var(--cd-ink-soft)] leading-relaxed">
                  <b>Why Architectural Boundaries Matter:</b> Modern software decays when modules take shortcuts (e.g. controllers querying databases directly, or domain entities importing external SDKs). Coodara continuously evaluates the AST graph against these directional layer rules.
                </div>
              </div>

              {/* Layer Hierarchy Flow */}
              <div>
                <h3 className="text-[12px] font-bold uppercase tracking-wider text-[var(--cd-ink-faint)] mb-3 flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Detected Architecture Layers ({data?.layers.length || 4})
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  {(data?.layers || [
                    "Presentation & Ingress (Controllers)",
                    "Application & Domain Services",
                    "Data Access & Persistence (DB)",
                    "External Integrations & Third-Party APIs",
                  ]).map((layer, idx) => (
                    <div
                      key={layer}
                      className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-3.5 flex flex-col justify-between shadow-xs"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-[10px] font-black text-[var(--cd-ink-faint)]">
                          LAYER 0{idx + 1}
                        </span>
                        <span className="h-2 w-2 rounded-full bg-[var(--cd-accent)]" />
                      </div>
                      <h4 className="text-[12.5px] font-bold text-[var(--cd-ink)] leading-snug">
                        {layer}
                      </h4>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rules Matrix List */}
              <div>
                <h3 className="text-[12px] font-bold uppercase tracking-wider text-[var(--cd-ink-faint)] mb-3">
                  Directional Layer Dependency Rules
                </h3>

                <div className="divide-y divide-[var(--cd-border-soft)] rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] overflow-hidden">
                  {loading ? (
                    <div className="p-6 text-center text-[12px] text-[var(--cd-ink-faint)]">
                      Loading boundary rules...
                    </div>
                  ) : (
                    data?.rules.map((rule) => {
                      const hasBreach = rule.violation_count > 0;
                      return (
                        <div
                          key={rule.id}
                          onClick={() => setSelectedRule(rule)}
                          className={`p-4 transition-colors cursor-pointer flex items-start justify-between gap-4 ${
                            selectedRule?.id === rule.id
                              ? "bg-[var(--cd-accent-soft)]/40"
                              : "hover:bg-[var(--cd-sunken)]/60"
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="mt-0.5 shrink-0">
                              {rule.is_allowed ? (
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                                  <Unlock className="h-3.5 w-3.5" />
                                </div>
                              ) : hasBreach ? (
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 animate-pulse">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                </div>
                              ) : (
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-500/10 text-slate-500">
                                  <Lock className="h-3.5 w-3.5" />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="font-semibold text-[13px] text-[var(--cd-ink)]">
                                  {rule.source_layer}
                                </span>
                                <ArrowRight className="h-3.5 w-3.5 text-[var(--cd-ink-faint)] shrink-0" />
                                <span className="font-semibold text-[13px] text-[var(--cd-ink)]">
                                  {rule.target_layer}
                                </span>
                                <span
                                  className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase font-mono ${
                                    rule.is_allowed
                                      ? "bg-emerald-500/10 text-emerald-600"
                                      : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                                  }`}
                                >
                                  {rule.is_allowed ? "ALLOWED PATH" : "FORBIDDEN BYPASS"}
                                </span>
                              </div>

                              <p className="text-[12px] text-[var(--cd-ink-soft)]">
                                {rule.description}
                              </p>

                              {rule.active_breaches.length > 0 && (
                                <div className="mt-2 rounded-lg bg-rose-500/10 border border-rose-500/20 p-2.5 text-[11.5px] text-rose-700 dark:text-rose-300">
                                  <div className="font-bold flex items-center gap-1.5 mb-1">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    Active Boundary Violation Detected:
                                  </div>
                                  {rule.active_breaches.map((b, i) => (
                                    <div key={i} className="font-mono text-[11px] pl-5">
                                      &bull; {b}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`font-mono text-[12px] font-bold px-2 py-0.5 rounded ${
                                hasBreach
                                  ? "bg-rose-500 text-white"
                                  : "bg-[var(--cd-sunken)] text-[var(--cd-ink-soft)]"
                              }`}
                            >
                              {rule.violation_count} {rule.violation_count === 1 ? "violation" : "violations"}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === "rules" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[14px] font-bold text-[var(--cd-ink)]">
                    Custom Architectural Boundary Policies
                  </h3>
                  <p className="text-[12px] text-[var(--cd-ink-soft)]">
                    Define custom component boundary constraints (ArchUnit-style) enforced against code changes.
                  </p>
                </div>

                <button
                  onClick={() => setIsAddingRule(!isAddingRule)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[12px] font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{isAddingRule ? "Cancel" : "Add Policy Rule"}</span>
                </button>
              </div>

              {/* Add Rule Form */}
              {isAddingRule && (
                <form
                  onSubmit={handleCreateRule}
                  className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-3 animate-in fade-in duration-150"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--cd-ink-soft)] mb-1">
                        Rule Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. No Presentation to Database"
                        value={newRule.name}
                        onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                        className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3 py-1.5 text-[12.5px] text-[var(--cd-ink)] focus:border-blue-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[var(--cd-ink-soft)] mb-1">
                        Constraint Type
                      </label>
                      <select
                        value={newRule.rule_type}
                        onChange={(e) => setNewRule({ ...newRule, rule_type: e.target.value })}
                        className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3 py-1.5 text-[12.5px] text-[var(--cd-ink)] focus:border-blue-500 focus:outline-hidden"
                      >
                        <option value="disallow_dependency">Disallow Direct Dependency</option>
                        <option value="require_interface">Require Interface / Port</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[var(--cd-ink-soft)] mb-1">
                        Source Pattern (Caller)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. controllers/** or *controller*"
                        value={newRule.source_pattern}
                        onChange={(e) => setNewRule({ ...newRule, source_pattern: e.target.value })}
                        className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3 py-1.5 text-[12.5px] font-mono text-[var(--cd-ink)] focus:border-blue-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[var(--cd-ink-soft)] mb-1">
                        Target Pattern (Callee)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. persistence/** or *db*"
                        value={newRule.target_pattern}
                        onChange={(e) => setNewRule({ ...newRule, target_pattern: e.target.value })}
                        className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3 py-1.5 text-[12.5px] font-mono text-[var(--cd-ink)] focus:border-blue-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[var(--cd-ink-soft)] mb-1">
                        Severity
                      </label>
                      <select
                        value={newRule.severity}
                        onChange={(e) => setNewRule({ ...newRule, severity: e.target.value })}
                        className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3 py-1.5 text-[12.5px] text-[var(--cd-ink)] focus:border-blue-500 focus:outline-hidden"
                      >
                        <option value="critical">Critical (Blocks CI Merge)</option>
                        <option value="warning">Warning (Generates Advisory)</option>
                        <option value="info">Info</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[var(--cd-ink-soft)] mb-1">
                        Rationale
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Controllers must route through domain services."
                        value={newRule.rationale}
                        onChange={(e) => setNewRule({ ...newRule, rationale: e.target.value })}
                        className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3 py-1.5 text-[12.5px] text-[var(--cd-ink)] focus:border-blue-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingRule(false)}
                      className="cursor-pointer rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3 py-1.5 text-[12px] text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={ruleSubmitting}
                      className="cursor-pointer rounded-lg bg-blue-600 px-4 py-1.5 text-[12px] font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {ruleSubmitting ? "Saving Rule..." : "Save Policy"}
                    </button>
                  </div>
                </form>
              )}

              {/* Rules List */}
              <div className="divide-y divide-[var(--cd-border-soft)] rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] overflow-hidden">
                {rulesLoading ? (
                  <div className="p-6 text-center text-[12px] text-[var(--cd-ink-faint)]">
                    Loading custom boundary policies...
                  </div>
                ) : customRules.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <Shield className="h-8 w-8 text-[var(--cd-ink-faint)] mx-auto opacity-50" />
                    <p className="text-[13px] font-semibold text-[var(--cd-ink)]">
                      No custom boundary policies defined
                    </p>
                    <p className="text-[12px] text-[var(--cd-ink-soft)] max-w-md mx-auto">
                      Define strict layer boundaries to safeguard architectural integrity during automated PR reviews and CI runs.
                    </p>
                  </div>
                ) : (
                  customRules.map((rule) => (
                    <div key={rule.id} className="p-4 flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[13px] text-[var(--cd-ink)]">
                            {rule.name}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase font-mono ${
                              rule.severity === "critical"
                                ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                                : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                            }`}
                          >
                            {rule.severity}
                          </span>
                          <span className="rounded bg-[var(--cd-sunken)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--cd-ink-soft)]">
                            {rule.rule_type}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[12px] font-mono text-[var(--cd-ink-soft)]">
                          <span>{rule.source_pattern}</span>
                          <ArrowRight className="h-3 w-3 text-[var(--cd-ink-faint)]" />
                          <span>{rule.target_pattern}</span>
                        </div>

                        {rule.rationale && (
                          <p className="text-[11.5px] text-[var(--cd-ink-faint)]">
                            {rule.rationale}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="cursor-pointer rounded-lg p-2 text-[var(--cd-ink-faint)] hover:bg-rose-500/10 hover:text-rose-600 transition-colors"
                        title="Delete Rule"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "gate" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[14px] font-bold text-[var(--cd-ink)]">
                    Automated CI/CD Quality Gate
                  </h3>
                  <p className="text-[12px] text-[var(--cd-ink-soft)]">
                    Evaluates custom boundary rules, circular dependency loops, and health thresholds for pull request merge readiness.
                  </p>
                </div>

                <button
                  onClick={runQualityGate}
                  disabled={gateLoading}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-[12px] font-bold text-white shadow-xs hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${gateLoading ? "animate-spin" : ""}`} />
                  <span>Re-evaluate Quality Gate</span>
                </button>
              </div>

              {gateLoading ? (
                <div className="p-12 text-center text-[13px] text-[var(--cd-ink-faint)] space-y-2">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-500" />
                  <p>Evaluating active architectural rules and circular dependency loops...</p>
                </div>
              ) : gateResult ? (
                <div className="space-y-4">
                  {/* Verdict Card */}
                  <div
                    className={`rounded-xl border p-5 flex items-center justify-between ${
                      gateResult.passed
                        ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
                        : "border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {gateResult.passed ? (
                        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                      ) : (
                        <XCircle className="h-8 w-8 text-rose-500" />
                      )}
                      <div>
                        <h4 className="text-[16px] font-bold">
                          {gateResult.passed
                            ? "Quality Gate Passed: Safe to Merge"
                            : "Quality Gate Failed: Blocked by Architectural Violations"}
                        </h4>
                        <p className="text-[12px] opacity-90">{gateResult.summary}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`rounded-full px-3 py-1 font-mono text-[12px] font-black tracking-wider uppercase border ${
                          gateResult.passed
                            ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                            : "border-rose-500/30 bg-rose-500/20 text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {gateResult.status}
                      </span>
                    </div>
                  </div>

                  {/* Summary Telemetry Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-3">
                      <span className="text-[10px] font-bold text-[var(--cd-ink-faint)] uppercase">
                        Architecture Score
                      </span>
                      <p className="text-[18px] font-bold font-mono text-[var(--cd-ink)]">
                        {gateResult.health_score.toFixed(1)}%
                      </p>
                    </div>

                    <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-3">
                      <span className="text-[10px] font-bold text-[var(--cd-ink-faint)] uppercase">
                        Critical Breaches
                      </span>
                      <p
                        className={`text-[18px] font-bold font-mono ${
                          gateResult.critical_violations_count > 0 ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        {gateResult.critical_violations_count}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-3">
                      <span className="text-[10px] font-bold text-[var(--cd-ink-faint)] uppercase">
                        Warnings
                      </span>
                      <p className="text-[18px] font-bold font-mono text-[var(--cd-ink)]">
                        {gateResult.warning_violations_count}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-3">
                      <span className="text-[10px] font-bold text-[var(--cd-ink-faint)] uppercase">
                        Circular Loops
                      </span>
                      <p
                        className={`text-[18px] font-bold font-mono ${
                          gateResult.circular_dependencies_count > 0 ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        {gateResult.circular_dependencies_count}
                      </p>
                    </div>
                  </div>

                  {/* Violations Details */}
                  {gateResult.violations.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[12px] font-bold uppercase tracking-wider text-[var(--cd-ink-faint)]">
                        Active Quality Gate Violations ({gateResult.violations.length})
                      </h4>

                      <div className="divide-y divide-[var(--cd-border-soft)] rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] overflow-hidden">
                        {gateResult.violations.map((v, i) => (
                          <div key={i} className="p-3.5 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[13px] text-rose-600 dark:text-rose-400">
                                {v.rule_name}
                              </span>
                              <span className="rounded bg-rose-500/10 text-rose-600 border border-rose-500/20 px-1.5 py-0.2 text-[10px] font-mono font-bold uppercase">
                                {v.severity}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-[12px] font-mono text-[var(--cd-ink-soft)]">
                              <span>{v.source_component}</span>
                              <ArrowRight className="h-3 w-3 text-[var(--cd-ink-faint)]" />
                              <span>{v.target_component}</span>
                            </div>

                            <p className="text-[11.5px] text-[var(--cd-ink-soft)]">
                              {v.rationale}
                            </p>

                            {v.suggested_fix && (
                              <p className="text-[11.5px] text-emerald-600 dark:text-emerald-400 font-medium">
                                💡 Suggested Fix: {v.suggested_fix}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--cd-border-soft)] px-6 py-3 bg-[var(--cd-sunken)]/20">
          <div className="text-[11.5px] text-[var(--cd-ink-faint)]">
            Enforcing structural invariants against AST dependency graph and PostgreSQL policies.
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3.5 py-1.5 text-[12px] font-medium text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)] cursor-pointer"
            >
              Close
            </button>
            {onNavigateToStudio && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToStudio();
                }}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-[var(--cd-accent-hover)] cursor-pointer"
              >
                <span>Fix in Code Studio</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ArchitectureBoundariesModal;
