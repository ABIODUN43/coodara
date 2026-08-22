import { ArrowRight } from "lucide-react";

interface TimelineEvent {
  week: string;
  label: string;
  detail: string;
  type: "add" | "risk" | "remove" | "resolved";
}

const timelineEvents: TimelineEvent[] = [
  { week: "Jun 1", label: "analytics-service added", detail: "New service added to the dependency graph.", type: "add" },
  { week: "Jun 8", label: "payment↔billing coupling ↑", detail: "Coupling between payment-service and billing-service began rising.", type: "risk" },
  { week: "Jun 15", label: "api-gateway split out", detail: "api-gateway split from backend-api into its own service.", type: "add" },
  { week: "Jun 29", label: "queue-worker removed", detail: "Legacy queue-worker service was decommissioned.", type: "remove" },
  { week: "Jul 6", label: "auth ↔ user cycle formed", detail: "Circular dependency introduced between auth-service and user-service.", type: "risk" },
  { week: "Jul 13", label: "backend-api health ↑ 8.4", detail: "Code health improved from 7.9 to 8.4 after refactor.", type: "resolved" },
  { week: "Jul 20", label: "notification-service 14K LOC", detail: "Crossed 14K lines with no matching test coverage increase.", type: "risk" },
];

const colorFor = (type: TimelineEvent["type"]) =>
  type === "risk" ? "#D6432D" : type === "resolved" ? "#2F9E52" : "#5E6AD2";

export function ArchitectureTimeline() {
  const w = 1000;
  const h = 140;
  const padL = 16;
  const padR = 16;
  const midY = 70;
  const n = timelineEvents.length;
  const step = (w - padL - padR) / (n - 1);

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
              const x = padL + step * i;
              const c = colorFor(ev.type);
              const above = i % 2 === 0;

              // Generous, fixed separation between the tick line, the
              // week/date text, and the event label — no overlap risk
              // regardless of label length.
              const lineY2 = above ? midY - 10 : midY + 10;
              const labelY = above ? midY - 20 : midY + 24;
              const weekY = above ? midY - 36 : midY + 40;

              return (
                <g key={`${ev.week}-${ev.label}`}>
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
                    <title>{`${ev.week} — ${ev.detail}`}</title>
                  </circle>
                  <text
                    x={x}
                    y={weekY}
                    textAnchor="middle"
                    fontSize={9}
                    fill="var(--cd-ink-faint)"
                    className="font-mono"
                  >
                    {ev.week}
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
            Service added/removed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: "var(--cd-risk)" }} />
            Risk introduced
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: "var(--cd-good)" }} />
            Risk resolved
          </span>
        </div>
      </div>
    </div>
  );
}