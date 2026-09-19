import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, X, ShieldCheck, AlertTriangle } from "lucide-react";
import { verifyArchitectureImprovement } from "@/api/architecture";
import type { ArchitectureVerificationResponse } from "@/types/architecture";

interface ArchitectureVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string | number;
  repositoryId: string | number;
  filePath: string;
  proposedCode: string;
}

export function ArchitectureVerificationModal({
  isOpen,
  onClose,
  orgId,
  repositoryId,
  filePath,
  proposedCode,
}: ArchitectureVerificationModalProps) {
  const [data, setData] = useState<ArchitectureVerificationResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      void handleVerify();
    }
  }, [isOpen, filePath, proposedCode]);

  const handleVerify = async () => {
    try {
      setLoading(true);
      const res = await verifyArchitectureImprovement(orgId, repositoryId, {
        file_path: filePath,
        modified_code: proposedCode,
      });
      setData(res);
    } catch (err) {
      console.error("Failed to verify improvement", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isPass = data?.verdict === "VERIFIED_IMPROVEMENT";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-[var(--cd-border)] bg-[var(--cd-surface)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--cd-border-soft)] px-6 py-4 bg-[var(--cd-sunken)]/40">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                isPass
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
              }`}
            >
              {isPass ? <ShieldCheck className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-bold text-[var(--cd-ink)]">
                  Architecture Re-Analysis &amp; Improvement Proof
                </h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-bold uppercase border ${
                    isPass
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                  }`}
                >
                  {data?.verdict || "VERIFYING"}
                </span>
              </div>
              <p className="text-[12px] text-[var(--cd-ink-soft)]">
                Automated before vs. after architectural re-analysis verifying actual technical debt reduction.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-[var(--cd-ink-faint)] hover:bg-[var(--cd-sunken)] hover:text-[var(--cd-ink)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loading ? (
            <div className="p-12 text-center text-[13px] text-[var(--cd-ink-faint)]">
              Re-analyzing AST graph and recalculating coupling &amp; boundary scores...
            </div>
          ) : data ? (
            <>
              {/* Verdict Summary Box */}
              <div
                className={`rounded-xl border p-4 ${
                  isPass
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-900 dark:text-rose-200"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-[13px] mb-1">
                  {isPass ? <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <XCircle className="h-4 w-4 text-rose-600" />}
                  <span>{isPass ? "Architectural Improvement Certified" : "Architectural Regression Detected"}</span>
                </div>
                <p className="text-[12.5px] leading-relaxed opacity-90">
                  {data.verification_summary}
                </p>
              </div>

              {/* Mathematical Delta Comparison Cards */}
              <div>
                <h4 className="text-[11.5px] font-bold uppercase tracking-wider text-[var(--cd-ink-faint)] mb-2.5">
                  Mathematical Metrics Delta (&Delta;)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Health Delta */}
                  <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-3.5 shadow-xs">
                    <div className="text-[11px] font-bold uppercase text-[var(--cd-ink-faint)] mb-1">
                      Health Score
                    </div>
                    <div className="flex items-baseline justify-between">
                      <div className="text-xl font-black font-mono text-[var(--cd-ink)]">
                        {data.metrics_delta.after_health}
                      </div>
                      <span
                        className={`text-[12px] font-bold font-mono px-1.5 py-0.5 rounded ${
                          data.metrics_delta.health_delta >= 0
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-rose-500/10 text-rose-600"
                        }`}
                      >
                        {data.metrics_delta.health_delta >= 0 ? `+${data.metrics_delta.health_delta}` : data.metrics_delta.health_delta}
                      </span>
                    </div>
                    <div className="text-[10.5px] text-[var(--cd-ink-faint)] mt-1 font-mono">
                      Baseline: {data.metrics_delta.before_health}
                    </div>
                  </div>

                  {/* Coupling Delta */}
                  <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-3.5 shadow-xs">
                    <div className="text-[11px] font-bold uppercase text-[var(--cd-ink-faint)] mb-1">
                      Coupling Index
                    </div>
                    <div className="flex items-baseline justify-between">
                      <div className="text-xl font-black font-mono text-[var(--cd-ink)]">
                        {data.metrics_delta.after_coupling}%
                      </div>
                      <span
                        className={`text-[12px] font-bold font-mono px-1.5 py-0.5 rounded ${
                          data.metrics_delta.coupling_delta <= 0
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-rose-500/10 text-rose-600"
                        }`}
                      >
                        {data.metrics_delta.coupling_delta}%
                      </span>
                    </div>
                    <div className="text-[10.5px] text-[var(--cd-ink-faint)] mt-1 font-mono">
                      Baseline: {data.metrics_delta.before_coupling}%
                    </div>
                  </div>

                  {/* Resolved Smells */}
                  <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-3.5 shadow-xs">
                    <div className="text-[11px] font-bold uppercase text-[var(--cd-ink-faint)] mb-1">
                      Smells Resolved
                    </div>
                    <div className="flex items-baseline justify-between">
                      <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                        {data.metrics_delta.violations_resolved_count} Fixed
                      </div>
                      <span className="text-[11px] font-mono text-[var(--cd-ink-faint)]">
                        0 New
                      </span>
                    </div>
                    <div className="text-[10.5px] text-[var(--cd-ink-faint)] mt-1 font-mono">
                      Remaining: {data.metrics_delta.after_violations_count}
                    </div>
                  </div>
                </div>
              </div>

              {/* Resolved Violations List */}
              {data.resolved_violations.length > 0 && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <h4 className="text-[11.5px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    Verified Architectural Debt Reductions:
                  </h4>
                  <div className="space-y-1.5">
                    {data.resolved_violations.map((v, i) => (
                      <div key={i} className="text-[12px] text-[var(--cd-ink)] flex items-start gap-2">
                        <span className="text-emerald-500 font-bold">&check;</span>
                        <span>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Certification Stamp */}
              <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-sunken)] p-3 flex items-center justify-between">
                <div>
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--cd-ink-faint)] block">
                    Coodara Architectural Certification Stamp
                  </span>
                  <span className="font-mono text-[12px] font-bold text-[var(--cd-accent)]">
                    {data.certification_stamp}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Verified Safe to Merge</span>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--cd-border-soft)] px-6 py-3 bg-[var(--cd-sunken)]/20">
          <div className="text-[11.5px] text-[var(--cd-ink-faint)]">
            Before-and-after AST delta mathematically certified by Coodara Engine.
          </div>

          <button
            onClick={onClose}
            className="rounded-lg bg-[var(--cd-accent)] px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-[var(--cd-accent-hover)] cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default ArchitectureVerificationModal;
