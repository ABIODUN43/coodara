import { Link } from "react-router-dom";
import {
  GitCommit,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  Clock,
} from "lucide-react";
import type { DashboardOverviewData } from "@/hooks/useDashboardOverview";

interface RecentArchitectureChangesProps {
  timelineEvents: DashboardOverviewData["timelineEvents"];
  recentActivities: DashboardOverviewData["recentActivities"];
  organizationId: number | string;
}

export function RecentArchitectureChanges({
  timelineEvents,
  recentActivities,
  organizationId,
}: RecentArchitectureChangesProps) {
  // Merge or fallback to recent activities
  const hasEvents = timelineEvents && timelineEvents.length > 0;
  const hasActivities = recentActivities && recentActivities.length > 0;

  return (
    <div className="rounded-[12px] border border-[var(--cd-border)] bg-[var(--cd-surface)] p-5 shadow-2xs">
      <div className="flex items-center justify-between border-b border-[var(--cd-border-soft)] pb-3">
        <div>
          <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[var(--cd-ink)] font-heading">
            Recent Architecture Changes
          </h3>
          <p className="mt-0.5 text-[11.5px] text-[var(--cd-ink-faint)]">
            Continuous AST change detection &amp; boundary shifts
          </p>
        </div>

        <Link
          to={`/dashboard/history?orgId=${organizationId}`}
          className="flex items-center gap-1 text-[11.5px] font-medium text-[var(--cd-accent)] hover:underline"
        >
          <span>History</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="mt-3 divide-y divide-[var(--cd-border-soft)]">
        {hasEvents ? (
          timelineEvents.slice(0, 5).map((ev, idx) => (
            <div
              key={`${ev.dateStr}-${idx}`}
              className="flex items-start gap-3 py-3 first:pt-1 last:pb-0"
            >
              <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--cd-sunken)] text-[var(--cd-ink-soft)]">
                {ev.type === "risk" ? (
                  <ShieldAlert className="h-3.5 w-3.5 text-[var(--cd-risk)]" />
                ) : ev.type === "resolved" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-[var(--cd-good)]" />
                ) : (
                  <GitCommit className="h-3.5 w-3.5 text-[var(--cd-accent)]" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[12.5px] font-semibold text-[var(--cd-ink)]">
                    {ev.label}
                  </span>
                  <span className="flex-shrink-0 text-[11px] text-[var(--cd-ink-faint)] font-mono">
                    {ev.dateStr}
                  </span>
                </div>

                <p className="mt-0.5 truncate text-[11.5px] text-[var(--cd-ink-soft)]">
                  {ev.detail}
                </p>
              </div>
            </div>
          ))
        ) : hasActivities ? (
          recentActivities.slice(0, 5).map((act, idx) => (
            <div
              key={`${act.timestamp}-${idx}`}
              className="flex items-start gap-3 py-3 first:pt-1 last:pb-0"
            >
              <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--cd-sunken)]">
                <Clock className="h-3.5 w-3.5 text-[var(--cd-ink-faint)]" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[12px] font-medium text-[var(--cd-ink)]">
                    {act.text}
                  </span>
                  <span className="flex-shrink-0 text-[10.5px] text-[var(--cd-ink-faint)]">
                    {new Date(act.timestamp).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-6 text-center text-[12px] text-[var(--cd-ink-faint)]">
            No architecture changes detected yet. Subsequent scans track evolution across commits.
          </div>
        )}
      </div>
    </div>
  );
}
