import { ArrowRight } from "lucide-react";
import type { DashboardOverviewData } from "@/hooks/useDashboardOverview";

interface Hotspot {
  name: string;
  x: number;
  y: number;
  r: number;
  band: "good" | "warn" | "risk";
}

interface Props {
  data?: DashboardOverviewData;
}

const BAND = {
  good: { c: "var(--cd-good)", label: "Healthy" },
  warn: { c: "var(--cd-warn)", label: "Warning" },
  risk: { c: "var(--cd-risk)", label: "Alert" },
};

export function CodeHealthHotspots({ data }: Props) {
  const w = 560;
  const h = 280;
  const padL = 48;
  const padR = 24;
  const padT = 34;
  const padB = 40;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const repos = data?.repoData ?? [];
  const hasRealData = repos.length > 0;

  const hotspots: Hotspot[] = hasRealData
    ? repos.map((item, idx) => {
        const loc = item.result?.metrics?.loc || 1000;
        const funcs = item.result?.metrics?.functions || 20;
        const x = Math.min(92, Math.max(15, (loc / 10000) * 80 + 15));
        const y = Math.min(90, Math.max(15, (funcs / 300) * 80 + 15));
        const r = Math.min(24, Math.max(10, Math.sqrt(loc) / 4));
        const health = item.result?.metrics?.maintainability ?? 85;
        const band: "good" | "warn" | "risk" =
          health >= 80 ? "good" : health >= 60 ? "warn" : "risk";

        return {
          name: item.repo.name,
          x: Math.round(x + ((idx * 5) % 15)),
          y: Math.round(y),
          r: Math.round(r),
          band,
        };
      })
    : [];

  const goodCount = hotspots.filter((h) => h.band === "good").length;
  const warnCount = hotspots.filter((h) => h.band === "warn").length;
  const riskCount = hotspots.filter((h) => h.band === "risk").length;

  const healthDist = [
    { label: "Healthy", band: "good" as const, count: goodCount },
    { label: "Warning", band: "warn" as const, count: warnCount },
    { label: "Alert", band: "risk" as const, count: riskCount },
  ];

  const totalServices = healthDist.reduce((s, hh) => s + hh.count, 0);
  const LABEL_MIN_R = 10;

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.3fr_1fr]">
      {/* Hotspot bubble chart */}
      <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)]">
        <div className="flex items-center justify-between border-b border-[var(--cd-border-soft,var(--cd-border))] px-4 py-3">
          <h3 className="text-[13px] font-semibold text-[var(--cd-ink)]">
            Hotspots — complexity × change frequency
          </h3>
          <span className="flex cursor-pointer items-center gap-1 text-[12px] font-medium text-[var(--cd-ink-faint)] transition-colors hover:text-[var(--cd-ink)]">
            View all <ArrowRight className="h-3 w-3" />
          </span>
        </div>

        <div className="p-4 sm:p-5">
          <svg viewBox={`0 0 ${w} ${h}`} className="block h-[240px] w-full sm:h-[280px]">
            {[0, 1, 2, 3, 4].map((i) => (
              <line
                key={`gy-${i}`}
                x1={padL}
                y1={padT + (innerH / 4) * i}
                x2={w - padR}
                y2={padT + (innerH / 4) * i}
                stroke="var(--cd-border-soft,var(--cd-border))"
                strokeWidth={1}
              />
            ))}
            {[0, 1, 2, 3, 4].map((i) => (
              <line
                key={`gx-${i}`}
                x1={padL + (innerW / 4) * i}
                y1={padT}
                x2={padL + (innerW / 4) * i}
                y2={h - padB}
                stroke="var(--cd-border-soft,var(--cd-border))"
                strokeWidth={1}
              />
            ))}

            <line x1={padL} y1={h - padB} x2={w - padR} y2={h - padB} stroke="var(--cd-border)" strokeWidth={1.2} />
            <line x1={padL} y1={padT} x2={padL} y2={h - padB} stroke="var(--cd-border)" strokeWidth={1.2} />

            {hotspots.length === 0 ? (
              <text
                x={(padL + w - padR) / 2}
                y={(padT + h - padB) / 2}
                textAnchor="middle"
                fontSize={12}
                fill="var(--cd-ink-faint)"
              >
                No repository hotspot metrics available
              </text>
            ) : null}

            {/* Bubbles */}
            {hotspots.map((pt) => {
              const cx = padL + (pt.x / 100) * innerW;
              const cy = padT + innerH - (pt.y / 100) * innerH;
              const color = BAND[pt.band].c;
              return (
                <g key={pt.name}>
                  <circle cx={cx} cy={cy} r={pt.r} fill={color} opacity={0.16} stroke={color} strokeWidth={1.5} />
                  <circle cx={cx} cy={cy} r={2.5} fill={color} />
                </g>
              );
            })}

            {hotspots
              .filter((pt) => pt.r >= LABEL_MIN_R)
              .map((pt) => {
                const cx = padL + (pt.x / 100) * innerW;
                const cy = padT + innerH - (pt.y / 100) * innerH;
                const labelX = cx - pt.r - 6;
                const labelY = Math.max(cy - pt.r * 0.4, padT + 6);
                const approxWidth = pt.name.length * 6 + 10;

                return (
                  <g key={`label-${pt.name}`}>
                    <rect
                      x={labelX - approxWidth}
                      y={labelY - 11}
                      width={approxWidth}
                      height={15}
                      rx={4}
                      fill="var(--cd-surface)"
                      opacity={0.92}
                    />
                    <text
                      x={labelX}
                      y={labelY}
                      textAnchor="end"
                      fontSize={10}
                      className="font-mono"
                      fill="var(--cd-ink)"
                    >
                      {pt.name}
                    </text>
                  </g>
                );
              })}

            <text
              x={(padL + w - padR) / 2}
              y={h - 12}
              textAnchor="middle"
              fontSize={10.5}
              fill="var(--cd-ink-faint)"
            >
              LOC / Size Scale →
            </text>
            <text
              x={16}
              y={(padT + h - padB) / 2}
              textAnchor="middle"
              fontSize={10.5}
              fill="var(--cd-ink-faint)"
              transform={`rotate(-90 16 ${(padT + h - padB) / 2})`}
            >
              Function Complexity →
            </text>
          </svg>
        </div>
      </div>

      {/* Health distribution */}
      <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)]">
        <div className="flex items-center justify-between border-b border-[var(--cd-border-soft,var(--cd-border))] px-4 py-3">
          <h3 className="text-[13px] font-semibold text-[var(--cd-ink)]">Health distribution</h3>
          <span className="text-[12px] text-[var(--cd-ink-faint)]">{totalServices} services</span>
        </div>

        <div className="flex flex-col gap-3.5 p-4 sm:p-5">
          {healthDist.map((hh) => {
            const pct = totalServices > 0 ? Math.round((hh.count / totalServices) * 100) : 0;
            return (
              <div key={hh.label} className="flex items-center gap-2.5">
                <span className="w-16 flex-shrink-0 text-[12px] font-medium text-[var(--cd-ink)]">
                  {hh.label}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--cd-sunken)]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: BAND[hh.band].c }}
                  />
                </div>
                <span className="w-6 flex-shrink-0 text-right font-mono text-[12px] text-[var(--cd-ink-faint)]">
                  {hh.count}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}