import {
  Network,
  ShieldCheck,
  Zap,
  X,
  ArrowRight,
  Code2,
} from "lucide-react";

interface ArchitectureIntelligenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToStudio?: () => void;
}

export function ArchitectureIntelligenceModal({
  isOpen,
  onClose,
  onNavigateToStudio,
}: ArchitectureIntelligenceModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-6 sm:p-8 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-[var(--cd-ink-faint)] hover:bg-[var(--cd-sunken)] hover:text-[var(--cd-ink)] transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[var(--cd-accent-soft)] px-3 py-1 text-[11px] font-bold text-[var(--cd-accent)]">
              CATEGORY CLARITY BRIEF
            </span>
            <span className="text-[11px] font-semibold text-[var(--cd-ink-faint)]">
              For Venture Judges &amp; Technical Evaluators
            </span>
          </div>
          <h2 className="text-[22px] font-black tracking-tight text-[var(--cd-ink)] mt-2">
            Why Coodara is <span className="text-[var(--cd-accent)]">Architecture Intelligence</span>, Not Documentation
          </h2>
          <p className="text-[13px] text-[var(--cd-ink-soft)] mt-1 max-w-2xl leading-relaxed">
            While documentation tools describe what exists and copilots generate lines of code, Coodara is the only platform that models the macro system as a computable graph $G=(V,E)$ to enforce boundaries and simulate change impact.
          </p>
        </div>

        {/* Comparison Table / Grid */}
        <div className="mb-6 overflow-hidden rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)]">
          <div className="grid grid-cols-4 border-b border-[var(--cd-border)] bg-[var(--cd-sunken)]/70 p-3 text-[11px] font-bold uppercase tracking-wider text-[var(--cd-ink-faint)]">
            <div>Category</div>
            <div>Primary Focus</div>
            <div>System Awareness</div>
            <div>Key Limitation</div>
          </div>

          {/* Row 1: Linters */}
          <div className="grid grid-cols-4 items-center border-b border-[var(--cd-border-soft)] p-3 text-[12px] hover:bg-[var(--cd-sunken)]/40 transition-colors">
            <div className="font-semibold text-[var(--cd-ink)]">
              Linters &amp; Static Analyzers
              <span className="block text-[10.5px] font-normal text-[var(--cd-ink-faint)]">
                ESLint, SonarQube, Flake8
              </span>
            </div>
            <div className="text-[var(--cd-ink-soft)]">
              Single-file syntax, style &amp; local vulnerabilities
            </div>
            <div className="text-[var(--cd-ink-soft)]">
              <span className="rounded px-1.5 py-0.5 text-[10.5px] font-mono bg-amber-500/10 text-amber-700 dark:text-amber-400">
                Single File Only
              </span>
            </div>
            <div className="text-[var(--cd-ink-faint)] text-[11px]">
              Blind to cross-service dependencies and macro architecture drift.
            </div>
          </div>

          {/* Row 2: Copilots */}
          <div className="grid grid-cols-4 items-center border-b border-[var(--cd-border-soft)] p-3 text-[12px] hover:bg-[var(--cd-sunken)]/40 transition-colors">
            <div className="font-semibold text-[var(--cd-ink)]">
              AI Code Copilots
              <span className="block text-[10.5px] font-normal text-[var(--cd-ink-faint)]">
                GitHub Copilot, Cursor
              </span>
            </div>
            <div className="text-[var(--cd-ink-soft)]">
              Next-token autocomplete &amp; function generation
            </div>
            <div className="text-[var(--cd-ink-soft)]">
              <span className="rounded px-1.5 py-0.5 text-[10.5px] font-mono bg-amber-500/10 text-amber-700 dark:text-amber-400">
                Local Context Window
              </span>
            </div>
            <div className="text-[var(--cd-ink-faint)] text-[11px]">
              Generates code that works locally but violates architectural boundaries.
            </div>
          </div>

          {/* Row 3: Doc Tools (Pallo) */}
          <div className="grid grid-cols-4 items-center border-b border-[var(--cd-border-soft)] p-3 text-[12px] hover:bg-[var(--cd-sunken)]/40 transition-colors">
            <div className="font-semibold text-[var(--cd-ink)]">
              Codebase Knowledge Tools
              <span className="block text-[10.5px] font-normal text-[var(--cd-ink-faint)]">
                Pallo, Swimm, Readme
              </span>
            </div>
            <div className="text-[var(--cd-ink-soft)]">
              Descriptive summaries &amp; documentation catalogs
            </div>
            <div className="text-[var(--cd-ink-soft)]">
              <span className="rounded px-1.5 py-0.5 text-[10.5px] font-mono bg-blue-500/10 text-blue-700 dark:text-blue-400">
                Passive / Descriptive
              </span>
            </div>
            <div className="text-[var(--cd-ink-faint)] text-[11px]">
              Tells you what code exists, but cannot simulate impact or enforce rules.
            </div>
          </div>

          {/* Row 4: Coodara */}
          <div className="grid grid-cols-4 items-center bg-[var(--cd-accent-soft)]/40 p-3.5 text-[12px] font-medium border-t-2 border-[var(--cd-accent)]">
            <div className="font-bold text-[var(--cd-accent)] flex items-center gap-1.5">
              <Zap className="h-4 w-4" />
              <span>Coodara (Our Platform)</span>
            </div>
            <div className="font-semibold text-[var(--cd-ink)]">
              Architecture Intelligence &amp; Decision Support
            </div>
            <div>
              <span className="rounded px-2 py-0.5 text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                System-Wide Graph G=(V,E)
              </span>
            </div>
            <div className="text-emerald-700 dark:text-emerald-300 text-[11.5px] font-semibold">
              Active drift detection + Pre-commit blast radius simulation.
            </div>
          </div>
        </div>

        {/* 3 Core Differentiators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-6">
          <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-4">
            <div className="flex items-center gap-2 text-[12.5px] font-bold text-[var(--cd-ink)] mb-1.5">
              <Network className="h-4 w-4 text-[var(--cd-accent)]" />
              1. Mathematical Graph
            </div>
            <p className="text-[11.5px] text-[var(--cd-ink-soft)] leading-relaxed">
              Coodara transforms thousands of multi-language AST symbols into an interactive directed graph with mathematically verified coupling and modularity metrics.
            </p>
          </div>

          <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-4">
            <div className="flex items-center gap-2 text-[12.5px] font-bold text-[var(--cd-ink)] mb-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              2. Architectural Drift Rules
            </div>
            <p className="text-[11.5px] text-[var(--cd-ink-soft)] leading-relaxed">
              Enforces layer boundaries (e.g. presentation controllers must never run raw SQL queries) and flags circular dependency loops in real time.
            </p>
          </div>

          <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-4">
            <div className="flex items-center gap-2 text-[12.5px] font-bold text-[var(--cd-ink)] mb-1.5">
              <Zap className="h-4 w-4 text-rose-500" />
              3. Change Impact Simulator
            </div>
            <p className="text-[11.5px] text-[var(--cd-ink-soft)] leading-relaxed">
              Before merging a PR, Coodara answers: <em>&quot;What happens if I change this?&quot;</em> calculating downstream ripples across 5+ services and databases.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--cd-border-soft)] pt-4">
          <span className="text-[12px] text-[var(--cd-ink-faint)]">
            Coodara &bull; Better Architecture. Stronger Software.
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="cursor-pointer rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-4 py-2 text-[12px] font-semibold text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)] transition-colors"
            >
              Close
            </button>

            {onNavigateToStudio && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToStudio();
                }}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-4 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-[var(--cd-accent-hover)] transition-colors"
              >
                <Code2 className="h-4 w-4" />
                <span>Experience Demo Moment</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ArchitectureIntelligenceModal;
