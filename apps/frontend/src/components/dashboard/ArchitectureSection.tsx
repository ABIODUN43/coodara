import { useEffect, useRef, useState } from "react";
import { Search, X, Sparkles, MoreHorizontal } from "lucide-react";

type Band = "good" | "warn" | "risk";

interface ArchNode {
  id: string;
  label: string;
  x: number;
  y: number;
  band: Band;
  repo: string;
  health: number;
  loc: string;
}

const nodes: ArchNode[] = [
  { id: "frontend", label: "frontend-app", x: 520, y: 36, band: "good", repo: "frontend", health: 9.1, loc: "22.4K" },
  { id: "gateway", label: "api-gateway", x: 520, y: 140, band: "warn", repo: "backend", health: 8.0, loc: "6.1K" },
  { id: "auth", label: "auth-service", x: 230, y: 270, band: "risk", repo: "backend", health: 6.8, loc: "9.7K" },
  { id: "user", label: "user-service", x: 410, y: 270, band: "risk", repo: "backend", health: 6.5, loc: "11.2K" },
  { id: "billing", label: "billing-service", x: 600, y: 270, band: "warn", repo: "payment-service", health: 6.5, loc: "14.8K" },
  { id: "notif", label: "notification-service", x: 800, y: 270, band: "warn", repo: "notifications", health: 7.2, loc: "14.1K" },
  { id: "db", label: "postgres", x: 520, y: 400, band: "good", repo: "infra", health: 9.4, loc: "—" },
];

const edges: [string, string][] = [
  ["frontend", "gateway"],
  ["gateway", "auth"],
  ["gateway", "user"],
  ["gateway", "billing"],
  ["gateway", "notif"],
  ["auth", "db"],
  ["user", "db"],
  ["billing", "db"],
];

const byId = (id: string) => nodes.find((n) => n.id === id)!;
const bandVar = (b: Band) => `var(--cd-${b})`;

const nodeRisks: Record<string, string[]> = {
  auth: ["Circular dependency with user-service, introduced across the last 3 merges."],
  user: ["Circular dependency with auth-service."],
  billing: ["Coupling with payment-service up 22% this month, raising deployment risk."],
  notif: ["Crossed 14K lines with no matching increase in test coverage."],
};

interface Insight {
  sev: "critical" | "warning" | "info";
  sevLabel: string;
  impactLevel: string;
  title: string;
  subtitle: string;
  impact: string;
  reco: string;
  cta: string;
}

const insights: Insight[] = [
  { sev: "critical", sevLabel: "Critical", impactLevel: "High", title: "Circular dependency detected", subtitle: "auth-service ↔ user-service", impact: "New deploys to either service risk breaking the other; rollbacks become unsafe.", reco: "Extract shared logic into a new identity-core module.", cta: "View dependency path" },
  { sev: "warning", sevLabel: "Warning", impactLevel: "High", title: "Coupling increasing", subtitle: "payment-service ↔ billing-service", impact: "Coupling up 22% this month — deployment risk rising for both services.", reco: "Introduce an event contract instead of direct calls.", cta: "See coupling trend" },
  { sev: "warning", sevLabel: "Warning", impactLevel: "Medium", title: "Service size threshold crossed", subtitle: "notification-service", impact: "14K+ lines with no matching increase in test coverage.", reco: "Split into channel-specific services (email, SMS, push).", cta: "Review complexity" },
  { sev: "info", sevLabel: "Info", impactLevel: "Low", title: "Code health improving", subtitle: "backend-api", impact: "Health rose from 7.9 to 8.4 after last week's refactor.", reco: "No action needed — trend is stabilizing.", cta: "See what changed" },
];

const severityStyle: Record<Insight["sev"], { bg: string; color: string; label: string }> = {
  critical: { bg: "var(--cd-risk-bg)", color: "var(--cd-risk)", label: "🔴 Critical" },
  warning: { bg: "var(--cd-warn-bg)", color: "var(--cd-warn)", label: "🟡 Warning" },
  info: { bg: "var(--cd-good-bg)", color: "var(--cd-good)", label: "🟢 Info" },
};

type DrawerTab = "details" | "deps" | "risks" | "insights";

export function ArchitectureSection() {
  const [graphView, setGraphView] = useState<"graph" | "map">("graph");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("details");
  const [selectedInsight, setSelectedInsight] = useState<number | null>(null);

  const dotRefs = useRef<(SVGCircleElement | null)[]>([]);
  const loop1Ref = useRef<SVGPathElement | null>(null);
  const loop2Ref = useRef<SVGPathElement | null>(null);
  const loopTextRef = useRef<SVGTextElement | null>(null);

  useEffect(() => {
    let frame: number;
    let tick = 0;
    function animate() {
      tick = (tick + 1) % 1000;
      const progress = (tick % 130) / 130;
      edges.forEach(([a, b], i) => {
        const A = byId(a);
        const B = byId(b);
        const x = A.x + (B.x - A.x) * progress;
        const y = A.y + 18 + (B.y - 18 - (A.y + 18)) * progress;
        const dot = dotRefs.current[i];
        if (dot) {
          dot.setAttribute("cx", String(x));
          dot.setAttribute("cy", String(y));
        }
      });
      const pulse = 0.5 + 0.5 * Math.abs(Math.sin(tick / 18));
      loop1Ref.current?.setAttribute("opacity", String(pulse));
      loop2Ref.current?.setAttribute("opacity", String(pulse));
      loopTextRef.current?.setAttribute("opacity", String(pulse));
      frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  const selectedNode = selectedId ? byId(selectedId) : null;
  const A = byId("auth");
  const B = byId("user");
  const midX = (A.x + B.x) / 2;

  function openNode(id: string) {
    setSelectedId(id);
    setDrawerTab("details");
  }

  const deps = selectedNode
    ? edges
        .filter(([a, b]) => a === selectedNode.id || b === selectedNode.id)
        .map(([a, b]) => (a === selectedNode.id ? { dir: "→", id: b } : { dir: "←", id: a }))
    : [];

  const relatedInsights = selectedNode
    ? insights.filter((ins) => ins.subtitle.toLowerCase().includes(selectedNode.label.toLowerCase()))
    : [];

  const risks = selectedNode ? nodeRisks[selectedNode.id] ?? [] : [];

  return (
    <div className="mb-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--cd-ink-faint)]">
          Architecture
        </span>
        <div className="h-px flex-1 bg-[var(--cd-border-soft)]" />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_300px]">
        {/* Graph card */}
        <div className="overflow-hidden rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)]">
          <div className="flex items-center justify-between border-b border-[var(--cd-border-soft)] px-4 py-3">
            <div className="flex gap-0.5">
              <button
                onClick={() => setGraphView("graph")}
                className={`cursor-pointer rounded-md px-2.5 py-1 text-[11.5px] font-medium ${
                  graphView === "graph"
                    ? "bg-[var(--cd-accent-soft)] text-[var(--cd-accent)]"
                    : "text-[var(--cd-ink-faint)] hover:bg-[var(--cd-sunken)]"
                }`}
              >
                Dependency graph
              </button>
              <button
                onClick={() => setGraphView("map")}
                className={`cursor-pointer rounded-md px-2.5 py-1 text-[11.5px] font-medium ${
                  graphView === "map"
                    ? "bg-[var(--cd-accent-soft)] text-[var(--cd-accent)]"
                    : "text-[var(--cd-ink-faint)] hover:bg-[var(--cd-sunken)]"
                }`}
              >
                Service map
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-[var(--cd-good)]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--cd-good)] opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--cd-good)]" />
                </span>
                Live
              </span>
              <button className="cursor-pointer rounded-md p-1 text-[var(--cd-ink-faint)] hover:bg-[var(--cd-sunken)]" aria-label="More">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="relative p-2 pb-5 sm:p-5">
            <div className="relative h-[300px] w-full sm:h-[400px]">
              {graphView === "graph" ? (
                <>
                  <svg viewBox="0 0 1040 460" className="h-full w-full">
                    {edges.map(([a, b], i) => {
                      const A2 = byId(a);
                      const B2 = byId(b);
                      return (
                        <line
                          key={i}
                          x1={A2.x}
                          y1={A2.y + 18}
                          x2={B2.x}
                          y2={B2.y - 18}
                          stroke="var(--cd-border)"
                          strokeWidth={1.5}
                        />
                      );
                    })}

                    {edges.map((_, i) => (
                      <circle
                        key={i}
                        ref={(el) => { dotRefs.current[i] = el; }}
                        r={2.75}
                        fill="var(--cd-ink-faint)"
                        opacity={0.75}
                      />
                    ))}

                    <path
                      ref={loop1Ref}
                      d={`M ${A.x + 40} ${A.y - 6} C ${midX} ${A.y - 52}, ${midX} ${A.y - 52}, ${B.x - 40} ${A.y - 6}`}
                      fill="none"
                      stroke="var(--cd-risk)"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                    />
                    <path
                      ref={loop2Ref}
                      d={`M ${B.x - 40} ${A.y + 14} C ${midX} ${A.y + 58}, ${midX} ${A.y + 58}, ${A.x + 40} ${A.y + 14}`}
                      fill="none"
                      stroke="var(--cd-risk)"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                    />
                    <text
                      ref={loopTextRef}
                      x={midX}
                      y={A.y - 60}
                      textAnchor="middle"
                      fontSize={11}
                      fontFamily="'JetBrains Mono',monospace"
                      fill="var(--cd-risk)"
                    >
                      circular dependency
                    </text>

                    {nodes.map((n) => {
                      const charWidth = 7.4;
                      const padLeft = 30;
                      const padRight = 16;
                      const boxWidth = n.label.length * charWidth + padLeft + padRight;
                      const halfWidth = boxWidth / 2;
                      return (
                        <g
                          key={n.id}
                          transform={`translate(${n.x},${n.y})`}
                          style={{ cursor: "pointer" }}
                          onClick={() => openNode(n.id)}
                        >
                          <rect
                            x={-halfWidth}
                            y={-18}
                            width={boxWidth}
                            height={36}
                            rx={8}
                            fill="var(--cd-surface)"
                            stroke={n.band === "risk" ? bandVar(n.band) : "var(--cd-border)"}
                            strokeWidth={n.band === "risk" ? 1.75 : 1}
                          />
                          <circle cx={-halfWidth + 14} cy={0} r={4} fill={bandVar(n.band)} />
                          <text
                            x={-halfWidth + padLeft}
                            y={4.5}
                            fontSize={12.5}
                            fontFamily="'JetBrains Mono',monospace"
                            fill="var(--cd-ink)"
                          >
                            {n.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>

                  <div className="absolute bottom-1 left-1 flex flex-wrap gap-3 text-[11px] text-[var(--cd-ink-faint)] sm:bottom-3 sm:left-3">
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--cd-good)" }} />
                      Healthy
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--cd-warn)" }} />
                      Warning
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--cd-risk)" }} />
                      Circular dependency
                    </span>
                  </div>
                  <div className="absolute right-1 top-1 hidden items-center gap-1.5 text-[11px] text-[var(--cd-ink-faint)] sm:flex">
                    <Search className="h-3 w-3" />
                    Click a node for details
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-[13px] text-[var(--cd-ink-soft)]">
                  Service map view — coming soon
                </div>
              )}

              {/* Node detail drawer */}
              <div
                className={`absolute right-0 top-0 flex h-full w-[240px] flex-col rounded-lg bg-[var(--cd-surface)] transition-transform duration-200 ${
                  selectedNode ? "translate-x-0" : "translate-x-full"
                }`}
                style={selectedNode ? { boxShadow: "-8px 0 24px rgba(20,20,30,0.12)" } : undefined}
              >
                {selectedNode && (
                  <>
                    <div className="flex items-center justify-between border-b border-[var(--cd-border-soft)] px-4 py-3">
                      <h4 className="font-mono text-[13px] font-semibold text-[var(--cd-ink)]">
                        {selectedNode.label}
                      </h4>
                      <button
                        onClick={() => setSelectedId(null)}
                        className="cursor-pointer rounded-md p-1 text-[var(--cd-ink-faint)] hover:bg-[var(--cd-sunken)]"
                        aria-label="Close"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex border-b border-[var(--cd-border-soft)]">
                      {(["details", "deps", "risks", "insights"] as DrawerTab[]).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setDrawerTab(tab)}
                          className={`flex-1 cursor-pointer border-b-2 py-2 text-[10.5px] font-medium capitalize ${
                            drawerTab === tab
                              ? "border-[var(--cd-accent)] text-[var(--cd-accent)]"
                              : "border-transparent text-[var(--cd-ink-faint)]"
                          }`}
                        >
                          {tab === "insights" ? "AI" : tab}
                        </button>
                      ))}
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                      {drawerTab === "details" && (
                        <div className="flex flex-col">
                          <div className="flex justify-between border-b border-[var(--cd-border-soft)] py-1.5 text-[11.5px]">
                            <span className="text-[var(--cd-ink-soft)]">Health</span>
                            <b style={{ color: bandVar(selectedNode.band) }}>{selectedNode.health}/10</b>
                          </div>
                          <div className="flex justify-between border-b border-[var(--cd-border-soft)] py-1.5 text-[11.5px]">
                            <span className="text-[var(--cd-ink-soft)]">Repository</span>
                            <b className="text-[var(--cd-ink)]">{selectedNode.repo}</b>
                          </div>
                          <div className="flex justify-between border-b border-[var(--cd-border-soft)] py-1.5 text-[11.5px]">
                            <span className="text-[var(--cd-ink-soft)]">Lines of code</span>
                            <b className="text-[var(--cd-ink)]">{selectedNode.loc}</b>
                          </div>
                          <div className="flex justify-between py-1.5 text-[11.5px]">
                            <span className="text-[var(--cd-ink-soft)]">Status</span>
                            <b style={{ color: bandVar(selectedNode.band) }}>
                              {selectedNode.band === "risk" ? "At risk" : selectedNode.band === "warn" ? "Watch" : "Healthy"}
                            </b>
                          </div>
                        </div>
                      )}
                      {drawerTab === "deps" &&
                        (deps.length ? (
                          <div className="flex flex-col gap-1.5">
                            {deps.map((d, i) => (
                              <div key={i} className="flex items-center gap-1.5 font-mono text-[11.5px] text-[var(--cd-ink)]">
                                <span>{d.dir}</span>
                                <span>{byId(d.id).label}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11.5px] text-[var(--cd-ink-faint)]">No dependencies.</span>
                        ))}
                      {drawerTab === "risks" &&
                        (risks.length ? (
                          <div className="flex flex-col">
                            {risks.map((r, i) => (
                              <div key={i} className="border-b border-[var(--cd-border-soft)] py-2 text-[11.5px] leading-relaxed text-[var(--cd-ink)] last:border-none">
                                {r}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11.5px] text-[var(--cd-ink-faint)]">No known risks.</span>
                        ))}
                      {drawerTab === "insights" &&
                        (relatedInsights.length ? (
                          <div className="flex flex-col">
                            {relatedInsights.map((ins, i) => (
                              <div key={i} className="border-b border-[var(--cd-border-soft)] py-2 text-[11.5px] leading-relaxed text-[var(--cd-ink)] last:border-none">
                                <b>{ins.title}</b>
                                <br />
                                {ins.reco}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11.5px] text-[var(--cd-ink-faint)]">No AI insights for this service yet.</span>
                        ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Insights panel */}
        <div className="flex max-h-[300px] flex-col overflow-hidden rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] sm:max-h-[400px] lg:max-h-[476px]">
          <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--cd-border-soft)] px-4 py-3">
            <h3 className="text-[12.5px] font-semibold text-[var(--cd-ink)]">What's changing</h3>
            <span className="flex items-center gap-1 rounded-full bg-[var(--cd-accent-soft)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--cd-accent)]">
              <Sparkles className="h-2.5 w-2.5" />
              AI
            </span>
          </div>
          <div className="flex flex-1 flex-col overflow-y-auto">
            {insights.map((ins, i) => {
              const s = severityStyle[ins.sev];
              const isSelected = selectedInsight === i;
              return (
                <button
                  key={i}
                  onClick={() => setSelectedInsight(isSelected ? null : i)}
                  className={`cursor-pointer border-b border-[var(--cd-border-soft)] px-4 py-3 text-left last:border-none ${
                    isSelected ? "rounded-lg shadow-md" : ""
                  }`}
                  style={isSelected ? { boxShadow: "0 4px 14px rgba(20,20,30,0.12)" } : undefined}
                >
                  <span
                    className="inline-block w-fit whitespace-nowrap rounded-[5px] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide"
                    style={{ background: s.bg, color: s.color }}
                  >
                    {s.label}
                  </span>
                  <h4 className="mb-0.5 mt-2 text-[13px] font-semibold text-[var(--cd-ink)]">{ins.title}</h4>
                  <div className="mb-2 font-mono text-[11.5px] text-[var(--cd-ink-soft)]">{ins.subtitle}</div>
                  <div className="mb-2 flex gap-3.5 text-[11px] text-[var(--cd-ink-faint)]">
                    <span>
                      Severity: <b className="font-semibold text-[var(--cd-ink)]">{ins.sevLabel}</b>
                    </span>
                    <span>
                      Impact: <b className="font-semibold text-[var(--cd-ink)]">{ins.impactLevel}</b>
                    </span>
                  </div>
                  <p className="mb-0.5 text-[11.5px] leading-relaxed">
                    <b className="text-[var(--cd-ink-soft)]">Why it matters:</b> {ins.impact}
                  </p>
                  <p className="mb-1.5 text-[11.5px] leading-relaxed">
                    <b className="text-[var(--cd-ink-soft)]">Recommendation:</b> {ins.reco}
                  </p>
                  <span className="text-[11px] font-medium text-[var(--cd-accent)]">{ins.cta} →</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}