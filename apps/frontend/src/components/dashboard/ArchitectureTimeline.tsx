import { ArrowRight } from "lucide-react";
import type { DashboardOverviewData } from "@/hooks/useDashboardOverview";

interface Props {
  events?: DashboardOverviewData["timelineEvents"];
}

const colorFor = (type: "add" | "risk" | "remove" | "resolved") =>
  type === "risk" ? "#D6432D" : type === "resolved" ? "#2F9E52" : "#5E6AD2";

export function ArchitectureTimeline({ events }: Props) {
  const timelineEvents = events || [];

  if (timelineEvents.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)]">
        <div className="flex items-center justify-between border-b border-[var(--cd-border-soft,var(--cd-border))] px-4 py-3">
          <h3 className="text-[13px] font-semibold text-[var(--cd-ink)]">
            Architecture evolution timeline
          </h3>
        </div>
        <div className="p-8 text-center text-[12px] text-[var(--cd-ink-faint)]">
          No architecture timeline events recorded yet. Run an analysis scan on your repositories to track evolution.
        </div>
      </div>
    );
  }

  const w = 1000;
  const h = 140;
  const padL = 24;
  const padR = 24;
  const midY = 70;
  const n = timelineEvents.length;
  const step = n > 1 ? (w - padL - padR) / (n - 1) : 0;

  return (
    <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)]">
      <div className="flex items-center justify-between border-b border-[var(--cd-border-soft,var(--cd-border))] px-4 py-3">
        <h3 className="text-[13px] font-semibold text-[var(--cd-ink)]">
          Architecture evolution timeline
        </h3>
        <span className="flex cursor-pointer items-center gap-1 text-[12px] font-medium text-[var(--cd-ink-faint)] transition-colors hover:text-[var(--cd-ink)]">
          Full history <ArrowRight className="h-3 w-3" />
        </span>
      </div>

      <div className="p-4 sm:p-5">
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${w} ${h}`}
            className="block h-[140px] w-full min-w-[760px]"
          >
            <line
              x1={padL}
              y1={midY}
              x2={w - padR}
              y2={midY}
              stroke="var(--cd-border)"
              strokeWidth={1.5}
            />
            {timelineEvents.map((ev, i) => {
              const x = n > 1 ? padL + step * i : w / 2;
              const c = colorFor(ev.type);
              const above = i % 2 === 0;

              const lineY2 = above ? midY - 10 : midY + 10;
              const labelY = above ? midY - 20 : midY + 24;
              const weekY = above ? midY - 36 : midY + 40;

              return (
                <g key={`${ev.dateStr}-${ev.label}-${i}`}>
                  <line
                    x1={x}
                    y1={midY}
                    x2={x}
                    y2={lineY2}
                    stroke={c}
                    strokeWidth={1.25}
                    opacity={0.55}
                  />
                  <circle cx={x} cy={midY} r={9} fill={c} opacity={0.15} />
                  <circle cx={x} cy={midY} r={5} fill={c} style={{ cursor: "pointer" }}>
                    <title>{`${ev.dateStr} — ${ev.detail}`}</title>
                  </circle>
                  <text
                    x={x}
                    y={weekY}
                    textAnchor="middle"
                    fontSize={9}
                    fill="var(--cd-ink-faint)"
                    className="font-mono"
                  >
                    {ev.dateStr}
                  </text>
                  <text
                    x={x}
                    y={labelY}
                    textAnchor="middle"
                    fontSize={9.5}
                    fill="var(--cd-ink)"
                  >
                    {ev.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-[var(--cd-ink-faint)]">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: "var(--cd-accent)" }} />
            Service added/scanned
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: "var(--cd-risk)" }} />
            Risk introduced
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: "var(--cd-good)" }} />
            Scan completed
          </span>
        </div>
      </div>
    </div>
  );
}