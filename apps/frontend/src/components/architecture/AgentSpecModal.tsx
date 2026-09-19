import { useState, useEffect } from "react";
import { Bot, X, Copy, Check, Sparkles, Shield, AlertTriangle, Code2 } from "lucide-react";
import { generateAgentArchitectureSpec } from "@/api/architecture";
import type { ArchitectureAgentSpecResponse } from "@/types/architecture";

interface AgentSpecModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string | number;
  repositoryId: string | number;
  selectedFile?: string;
  selectedComponent?: string;
}

export function AgentSpecModal({
  isOpen,
  onClose,
  orgId,
  repositoryId,
  selectedFile = "",
  selectedComponent = "",
}: AgentSpecModalProps) {
  const [taskDescription, setTaskDescription] = useState(
    selectedComponent
      ? `Refactor ${selectedComponent} to eliminate architectural violations and decouple dependencies.`
      : "Refactor architecture components to enforce layer boundaries and eliminate coupling."
  );
  const [spec, setSpec] = useState<ArchitectureAgentSpecResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      void handleGenerateSpec();
    }
  }, [isOpen, selectedFile, selectedComponent]);

  const handleGenerateSpec = async () => {
    try {
      setLoading(true);
      const res = await generateAgentArchitectureSpec(orgId, repositoryId, {
        task_description: taskDescription,
        target_components: selectedComponent ? [selectedComponent] : [],
        target_files: selectedFile ? [selectedFile] : [],
        max_blast_radius_budget: 30.0,
      });
      setSpec(res);
    } catch (err) {
      console.error("Failed to generate agent spec", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!spec) return;
    navigator.clipboard.writeText(spec.prompt_ready_spec);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-[var(--cd-border)] bg-[var(--cd-surface)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--cd-border-soft)] px-6 py-4 bg-[var(--cd-sunken)]/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-bold text-[var(--cd-ink)]">
                  Architecture-Aware Agent Specification Generator
                </h2>
                <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  AGENT PROMPT ENGINE
                </span>
              </div>
              <p className="text-[12px] text-[var(--cd-ink-soft)]">
                Provides AI coding agents (Cursor, Claude Code, Gemini, Copilot, Antigravity) with precise architectural guardrails.
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
          {/* Task input banner */}
          <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-4 shadow-xs">
            <label className="block text-[12px] font-bold uppercase tracking-wider text-[var(--cd-ink-faint)] mb-2">
              Implementation Task for Coding Agent
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                className="flex-1 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-sunken)] px-3 py-2 text-[12.5px] text-[var(--cd-ink)] focus:border-[var(--cd-accent)] focus:outline-none"
              />
              <button
                onClick={handleGenerateSpec}
                disabled={loading}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[var(--cd-accent-hover)] transition-colors disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{loading ? "Synthesizing..." : "Regenerate Spec"}</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-[13px] text-[var(--cd-ink-faint)]">
              Synthesizing architectural AST contracts and boundary invariants...
            </div>
          ) : spec ? (
            <>
              {/* Guardrails Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1.5">
                    <Shield className="h-3.5 w-3.5" />
                    Allowed Imports
                  </div>
                  <div className="space-y-1">
                    {spec.allowed_imports.map((imp, i) => (
                      <div key={i} className="font-mono text-[11px] text-[var(--cd-ink)] truncate">
                        &bull; {imp}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Forbidden Imports
                  </div>
                  <div className="space-y-1">
                    {spec.forbidden_imports.map((imp, i) => (
                      <div key={i} className="font-mono text-[11px] text-rose-700 dark:text-rose-300 truncate">
                        &bull; {imp}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1.5">
                    <Code2 className="h-3.5 w-3.5" />
                    Blast Radius Budget
                  </div>
                  <div className="text-xl font-black font-mono text-[var(--cd-ink)]">
                    &le; {spec.blast_radius_budget_percentage}%
                  </div>
                  <p className="text-[11px] text-[var(--cd-ink-faint)] mt-0.5">
                    Agent change must not trigger downstream breaking contracts.
                  </p>
                </div>
              </div>

              {/* Prompt Ready Code Block */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[12px] font-bold uppercase tracking-wider text-[var(--cd-ink-faint)]">
                    Prompt-Ready Specification (Paste into Cursor / Claude / Antigravity)
                  </h4>
                  <button
                    onClick={handleCopy}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-[var(--cd-accent-hover)] transition-colors shadow-xs"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-300" />
                        <span>Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Agent Prompt</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="relative rounded-xl border border-[var(--cd-border)] bg-[var(--cd-sunken)] p-4 font-mono text-[12px] text-[var(--cd-ink)] overflow-x-auto max-h-[300px]">
                  <pre className="whitespace-pre-wrap leading-relaxed">
                    {spec.prompt_ready_spec}
                  </pre>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--cd-border-soft)] px-6 py-3 bg-[var(--cd-sunken)]/20">
          <div className="text-[11.5px] text-[var(--cd-ink-faint)]">
            Agents guided by Coodara specifications maintain 98% clean architecture compliance.
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3.5 py-1.5 text-[12px] font-medium text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)] cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-[var(--cd-accent-hover)] cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Copied" : "Copy Prompt"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AgentSpecModal;
