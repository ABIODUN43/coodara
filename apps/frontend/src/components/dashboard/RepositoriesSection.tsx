import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { FaGithub } from "react-icons/fa";

const BAND = {
  good: { c: "var(--cd-good)", bg: "var(--cd-good-bg)", label: "Healthy" },
  warn: { c: "var(--cd-warn)", bg: "var(--cd-warn-bg)", label: "Warning" },
  risk: { c: "var(--cd-risk)", bg: "var(--cd-risk-bg)", label: "Alert" },
};

function bandFor(score10: number): "good" | "warn" | "risk" {
  return score10 >= 8 ? "good" : score10 >= 5 ? "warn" : "risk";
}

const repos = [
  { owner: "acme", name: "frontend-app", desc: "Customer-facing web application (Next.js)", lang: "TypeScript", langColor: "#3178C6", score: 9.2, updated: "2h ago" },
  { owner: "acme", name: "backend-api", desc: "Core REST + GraphQL API gateway", lang: "Go", langColor: "#00ADD8", score: 8.4, updated: "1h ago" },
  { owner: "acme", name: "api-gateway", desc: "Edge routing, auth, and rate limiting", lang: "Go", langColor: "#00ADD8", score: 7.1, updated: "2d ago" },
  { owner: "acme", name: "analytics-service", desc: "Event ingestion and usage analytics pipeline", lang: "Python", langColor: "#3572A5", score: 8.8, updated: "3d ago" },
  { owner: "acme", name: "payment-service", desc: "Payments, invoicing, and billing integrations", lang: "TypeScript", langColor: "#3178C6", score: 5.6, updated: "Today" },
];

function miniHeatmap(seed: number) {
  const cells: string[] = [];
  for (let i = 0; i < 12; i++) {
    const v = Math.abs(Math.sin(seed * 13.7 + i * 3.1));
    let color = "var(--cd-sunken)";
    if (v > 0.75) color = "var(--cd-accent)";
    else if (v > 0.5) color = "var(--cd-accent-soft)";
    else if (v > 0.3) color = "var(--cd-border)";
    cells.push(color);
  }
  return cells;
}

type Filter = "all" | "good" | "warn" | "risk";

export function RepositoriesSection() {
  const [filter, setFilter] = useState<Filter>("all");

  const counts = {
    all: repos.length,
    good: repos.filter((r) => bandFor(r.score) === "good").length,
    warn: repos.filter((r) => bandFor(r.score) === "warn").length,
    risk: repos.filter((r) => bandFor(r.score) === "risk").length,
  };

  const filteredRepos = repos.filter((r) => filter === "all" || bandFor(r.score) === filter);

  return (
    <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)]">
      <div className="flex items-center justify-between border-b border-[var(--cd-border-soft,var(--cd-border))] px-4 py-3">
        <h3 className="text-[13px] font-semibold text-[var(--cd-ink)]">
          {repos.length} repositories
        </h3>
        <span className="flex cursor-pointer items-center gap-1 text-[12px] font-medium text-[var(--cd-ink-faint)] transition-colors hover:text-[var(--cd-ink)]">
          View all <ArrowRight className="h-3 w-3" />
        </span>
      </div>

      <div className="flex flex-wrap gap-2 px-4 pb-1 pt-3">
        {(
          [
            { key: "all", label: "All", color: null },
            { key: "good", label: "Healthy", color: BAND.good.c },
            { key: "warn", label: "At risk", color: BAND.warn.c },
            { key: "risk", label: "Critical", color: BAND.risk.c },
          ] as const
        ).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors ${
              filter === f.key
                ? "border-transparent bg-[var(--cd-accent-soft)] text-[var(--cd-accent)]"
                : "border-[var(--cd-border)] bg-[var(--cd-surface)] text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)]"
            }`}
          >
            {f.color && (
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: f.color }} />
            )}
            {f.label}{" "}
            <span className={filter === f.key ? "font-mono text-[var(--cd-accent)]" : "font-mono text-[var(--cd-ink-faint)]"}>
              {counts[f.key]}
            </span>
          </button>
        ))}
      </div>

      <div>
        {filteredRepos.map((r, i) => {
          const band = bandFor(r.score);
          return (
            <div
              key={r.name}
              className="flex flex-col gap-3 border-b border-[var(--cd-border-soft,var(--cd-border))] px-4 py-3.5 last:border-b-0 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <FaGithub className="h-3.5 w-3.5 flex-shrink-0 text-[var(--cd-ink-faint)]" />
                  <span className="truncate font-mono text-[13px] font-semibold text-[var(--cd-ink)]">
                    <span className="font-normal text-[var(--cd-ink-faint)]">{r.owner}/</span>
                    {r.name}
                  </span>
                </div>
                <div className="mt-0.5 truncate text-[12px] text-[var(--cd-ink-soft)]">
                  {r.desc}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-3.5 text-[11.5px] text-[var(--cd-ink-faint)]">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: r.langColor }}
                    />
                    {r.lang}
                  </span>
                  <span
                    className="rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold"
                    style={{ background: BAND[band].bg, color: BAND[band].c }}
                  >
                    {BAND[band].label}
                  </span>
                </div>
              </div>

              <div className="grid flex-shrink-0 grid-cols-12 gap-0.5" style={{ width: 70, height: 24 }}>
                {miniHeatmap(i + 1).map((color, idx) => (
                  <i
                    key={idx}
                    className="block rounded-[1.5px]"
                    style={{ width: 5, height: 5, background: color }}
                  />
                ))}
              </div>

              <div className="flex flex-shrink-0 items-center gap-4 sm:gap-5">
                <div className="text-right">
                  <div className="font-mono text-[15px] font-semibold" style={{ color: BAND[band].c }}>
                    {r.score.toFixed(1)}
                    <span className="font-normal text-[var(--cd-ink-faint)]">/10</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-[88px] overflow-hidden rounded-full bg-[var(--cd-sunken)]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${r.score * 10}%`, background: BAND[band].c }}
                    />
                  </div>
                </div>
                <div className="w-16 flex-shrink-0 text-right text-[11.5px] text-[var(--cd-ink-faint)]">
                  {r.updated}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}