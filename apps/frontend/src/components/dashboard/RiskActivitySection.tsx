import { RefreshCw, Share2, Database, ShieldCheck, type LucideIcon } from "lucide-react";
import type { DashboardOverviewData } from "@/hooks/useDashboardOverview";

interface Props {
  data?: DashboardOverviewData;
}

const BAND = {
  good: { c: "var(--cd-good)", bg: "var(--cd-good-bg)", label: "Healthy" },
  warn: { c: "var(--cd-warn)", bg: "var(--cd-warn-bg)", label: "Warning" },
  risk: { c: "var(--cd-risk)", bg: "var(--cd-risk-bg)", label: "Alert" },
};

interface Risk {
  sev: "good" | "warn" | "risk";
  title: string;
  detail: string;
  icon: LucideIcon;
}

const QUEUE_COLOR: Record<string, string> = {
  running: "var(--cd-accent)",
  pending: "var(--cd-ink-faint)",
  queued: "var(--cd-ink-faint)",
  completed: "var(--cd-good)",
  failed: "var(--cd-risk)",
  cancelled: "var(--cd-ink-faint)",
};


export function RiskActivitySection({ data }: Props) {
  const allIssues = data?.allIssues ?? [];
  const hasRealIssues = allIssues.length > 0;

  const risks: Risk[] = hasRealIssues
    ? allIssues.slice(0, 4).map((i) => ({
        sev: i.issue.severity === "critical" ? "risk" : "warn",
        title: i.issue.title,
        detail: `${i.repoName} — ${i.issue.description}`,
        icon: i.issue.severity === "critical" ? RefreshCw : Share2,
      }))
    : [
        {
          sev: "good",
          title: "Clean Architecture Health",
          detail: "No critical circular dependencies or architectural violations detected.",
          icon: ShieldCheck,
        },
        {
          sev: "good",
          title: "AST Telemetry Active",
          detail: "Automated scans extracting exact module bounds and dependency graphs.",
          icon: Database,
        },
      ];

  const activity = data?.recentActivities?.length
    ? data.recentActivities.slice(0, 5)
    : [
        { timestamp: "Recent", text: "Architecture scanning engine active", tag: "good" as const },
        { timestamp: "Continuous", text: "AST dependency analyzers watching organization repositories", tag: "good" as const },
      ];

  const queue = data?.analysisQueue?.length
    ? data.analysisQueue.slice(0, 5)
    : [
        { status: "completed" as const, text: "Organization code scan" },
      ];

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      {/* Top risks */}
      <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)]">
        <div className="border-b border-[var(--cd-border-soft,var(--cd-border))] px-4 py-3">
          <h3 className="text-[13px] font-semibold text-[var(--cd-ink)]">Top risks</h3>
        </div>
        <div>
          {risks.map((r, i) => {
            const Icon = r.icon;
            return (
              <div
                key={`${r.title}-${i}`}
                className="flex items-start gap-2.5 border-b border-[var(--cd-border-soft,var(--cd-border))] px-4 py-3 last:border-b-0"
              >
                <div
                  className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md"
                  style={{ background: BAND[r.sev].bg }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: BAND[r.sev].c }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[12.5px] font-medium text-[var(--cd-ink)]">
                      {r.title}
                    </span>
                    <span
                      className="flex-shrink-0 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold"
                      style={{ background: BAND[r.sev].bg, color: BAND[r.sev].c }}
                    >
                      {BAND[r.sev].label}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate font-mono text-[11.5px] text-[var(--cd-ink-faint)]">
                    {r.detail}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent activity */}
      <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)]">
        <div className="border-b border-[var(--cd-border-soft,var(--cd-border))] px-4 py-3">
          <h3 className="text-[13px] font-semibold text-[var(--cd-ink)]">Recent activity</h3>
        </div>
        <div>
          {activity.map((a, i) => (
            <div
              key={`${a.timestamp}-${i}`}
              className="flex gap-2.5 border-b border-[var(--cd-border-soft,var(--cd-border))] px-4 py-3 last:border-b-0"
            >
              <div
                className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full"
                style={{ background: BAND[a.tag].c }}
              />
              <div>
                <p className="text-[12.5px] leading-snug text-[var(--cd-ink)]">{a.text}</p>
                <span className="font-mono text-[11px] text-[var(--cd-ink-faint)]">{a.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Analysis queue */}
      <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)]">
        <div className="border-b border-[var(--cd-border-soft,var(--cd-border))] px-4 py-3">
          <h3 className="text-[13px] font-semibold text-[var(--cd-ink)]">Analysis queue</h3>
        </div>
        <div>
          {queue.map((q, i) => (
            <div
              key={`${q.text}-${i}`}
              className="flex items-center gap-2.5 border-b border-[var(--cd-border-soft,var(--cd-border))] px-4 py-3 last:border-b-0"
            >
              <span
                className={`h-2 w-2 flex-shrink-0 rounded-full ${
                  q.status === "running" ? "animate-pulse" : ""
                }`}
                style={{ background: QUEUE_COLOR[q.status] }}
              />
              <span className="flex-1 text-[12.5px] text-[var(--cd-ink)]">{q.text}</span>
              <span className="text-[11px] capitalize text-[var(--cd-ink-faint)]">{q.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}