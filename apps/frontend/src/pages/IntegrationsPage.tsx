import { Activity, DollarSign, GitBranch } from "lucide-react";

export function IntegrationsPage() {
  return (
    <div className="flex h-full min-h-[calc(100vh-52px)] flex-col bg-[var(--cd-bg)] p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[var(--cd-ink)] sm:text-2xl">
              Integrations & Telemetry Adapters
            </h1>
            <span className="rounded-full bg-[var(--cd-sunken)] px-2.5 py-0.5 font-mono text-xs font-semibold text-[var(--cd-ink-soft)] border border-[var(--cd-border)]">
              Optional Calibration
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[var(--cd-ink-soft)] max-w-2xl">
            Connect runtime observability, cloud pricing catalogs, and source providers. Telemetry is an optional calibration input; Coodara never requires production access to analyze architecture.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl">
        {/* Card 1: Observability & Telemetry */}
        <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-sm text-[var(--cd-ink)]">
              <Activity className="h-4 w-4 text-[var(--cd-accent)]" />
              <span>Runtime Observability</span>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
              OPTIONAL
            </span>
          </div>

          <p className="text-xs text-[var(--cd-ink-soft)] leading-relaxed">
            Calibrate baseline experiment models with empirical CPU, memory, and latency metrics from production monitoring without hard dependencies.
          </p>

          <div className="space-y-2 border-t border-[var(--cd-border-soft)] pt-3 text-xs">
            <div className="flex items-center justify-between py-1">
              <span className="text-[var(--cd-ink)] font-medium">Prometheus</span>
              <span className="text-[11px] text-[var(--cd-ink-faint)]">Configurable endpoint</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-[var(--cd-ink)] font-medium">Datadog APM</span>
              <span className="text-[11px] text-[var(--cd-ink-faint)]">Trace metrics adapter</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-[var(--cd-ink)] font-medium">Grafana Tempo / Loki</span>
              <span className="text-[11px] text-[var(--cd-ink-faint)]">Log & trace correlation</span>
            </div>
          </div>
        </div>

        {/* Card 2: Cloud Pricing Catalogs */}
        <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-sm text-[var(--cd-ink)]">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              <span>Cloud Pricing Catalogs</span>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
              ACTIVE
            </span>
          </div>

          <p className="text-xs text-[var(--cd-ink-soft)] leading-relaxed">
            Versioned instance, database, and bandwidth rate cards normalized by Coodara Cloud Pricing Adapters for Architectural Economics modeling.
          </p>

          <div className="space-y-2 border-t border-[var(--cd-border-soft)] pt-3 text-xs">
            <div className="flex items-center justify-between py-1">
              <span className="text-[var(--cd-ink)] font-medium">Amazon Web Services</span>
              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">Snapshot v2026.09</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-[var(--cd-ink)] font-medium">Google Cloud Platform</span>
              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">Snapshot v2026.09</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-[var(--cd-ink)] font-medium">Microsoft Azure</span>
              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">Snapshot v2026.08</span>
            </div>
          </div>
        </div>

        {/* Card 3: Source Code Ingestion */}
        <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-sm text-[var(--cd-ink)]">
              <GitBranch className="h-4 w-4 text-indigo-500" />
              <span>Source Repositories</span>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
              CONNECTED
            </span>
          </div>

          <p className="text-xs text-[var(--cd-ink-soft)] leading-relaxed">
            GitHub OAuth and App token credentials configured per workspace to enable automated branch and commit analysis.
          </p>

          <div className="space-y-2 border-t border-[var(--cd-border-soft)] pt-3 text-xs">
            <div className="flex items-center justify-between py-1">
              <span className="text-[var(--cd-ink)] font-medium">GitHub Cloud</span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Authorized</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-[var(--cd-ink)] font-medium">Webhook Ingestion</span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Active (Push & PR)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
