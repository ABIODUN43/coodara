import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Sparkles, MoreHorizontal, Network, FileCode, CheckCircle2 } from "lucide-react";
import { useProject } from "@/context/ProjectContext";
import type { DashboardOverviewData } from "@/hooks/useDashboardOverview";

type Band = "good" | "warn" | "risk";

interface ArchNode {
  id: string;
  repoId: number;
  label: string;
  x: number;
  y: number;
  band: Band;
  repo: string;
  health: number;
  loc: string;
  files?: number;
  type?: string;
}

interface Insight {
  sev: "critical" | "warning" | "info";
  sevLabel: string;
  impactLevel: string;
  title: string;
  subtitle: string;
  impact: string;
  reco: string;
  cta: string;
  repoId?: number;
}

const severityStyle: Record<Insight["sev"], { bg: string; color: string; label: string }> = {
  critical: { bg: "var(--cd-risk-bg)", color: "var(--cd-risk)", label: "🔴 Critical" },
  warning: { bg: "var(--cd-warn-bg)", color: "var(--cd-warn)", label: "🟡 Warning" },
  info: { bg: "var(--cd-good-bg)", color: "var(--cd-good)", label: "🟢 Info" },
};

type DrawerTab = "details" | "deps" | "insights";

interface Props {
  data?: DashboardOverviewData;
}

export function ArchitectureSection({ data }: Props) {
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const [graphView, setGraphView] = useState<"graph" | "map">("graph");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("details");
  const [selectedInsight, setSelectedInsight] = useState<number | null>(null);

  const dotRefs = useRef<(SVGCircleElement | null)[]>([]);

  // Build dynamic nodes exclusively from real repositories
  const rawRepos = data?.repoData ?? [];
  const repos = rawRepos.length > 0 ? rawRepos : (data?.repos || []).map((r) => ({
    repo: r,
    latestAnalysis: null,
    result: null,
    architecture: null,
  }));

  const hasRealData = repos.length > 0;

  const nodes: ArchNode[] = hasRealData
    ? repos.map((item, idx) => {
        const total = repos.length;
        let x = 520;
        let y = 220;

        if (total === 1) {
          x = 520;
          y = 215;
        } else if (total === 2) {
          x = idx === 0 ? 380 : 660;
          y = 215;
        } else if (total === 3) {
          const positions = [
            { x: 320, y: 240 },
            { x: 520, y: 160 },
            { x: 720, y: 240 },
          ];
          x = positions[idx].x;
          y = positions[idx].y;
        } else {
          // Multi-node distribution across 2 tiers or arc
          const spacing = Math.min(220, 800 / Math.max(1, Math.ceil(total / 2)));
          const row = Math.floor(idx / 3);
          const col = idx % 3;
          const itemsInRow = Math.min(3, total - row * 3);
          const startX = 520 - ((itemsInRow - 1) * spacing) / 2;
          x = startX + col * spacing;
          y = row === 0 ? 160 : 280;
        }

        const locVal = item.result?.metrics?.loc
          ? `${(item.result.metrics.loc / 1000).toFixed(1)}K`
          : (item.repo as any)?.loc
          ? `${((item.repo as any).loc / 1000).toFixed(1)}K`
          : "—";

        const filesVal = item.result?.metrics?.files ?? (item.repo as any)?.files ?? 0;

        const healthVal = item.result?.metrics?.maintainability
          ? Number((item.result.metrics.maintainability / 10).toFixed(1))
          : (item.repo as any)?.health_score !== undefined
          ? Number((item.repo as any).health_score)
          : 10.0;

        const band: Band =
          healthVal >= 8 ? "good" : healthVal >= 6 ? "warn" : "risk";

        return {
          id: `repo-${item.repo.id}`,
          repoId: item.repo.id,
          label: item.repo.name,
          x: Math.round(x),
          y: Math.round(y),
          band,
          repo: item.repo.full_name || item.repo.name,
          health: healthVal,
          loc: locVal,
          files: filesVal,
          type: item.repo.primary_language || "service",
        };
      })
    : [];

  // Authentic inter-repository edges (only present when cross-repo dependencies exist)
  const edges: [string, string][] = [];

  const byId = (id: string) => nodes.find((n) => n.id === id);
  const bandVar = (b: Band) => `var(--cd-${b})`;

  // Dynamic AI insights derived directly from actual AST analysis
  const issuesList = data?.allIssues || [];
  const recsList = data?.allRecommendations || [];

  const insights: Insight[] = issuesList.length > 0 || recsList.length > 0
    ? [
        ...issuesList.slice(0, 3).map((issue) => ({
          sev: (issue.issue.severity as "critical" | "warning" | "info") || "warning",
          sevLabel: issue.issue.severity === "critical" ? "Critical" : "Warning",
          impactLevel: issue.issue.severity === "critical" ? "High" : "Medium",
          title: issue.issue.title || "Architectural Violation Detected",
          subtitle: issue.repoName,
          impact: issue.issue.description,
          reco: "Inspect component boundaries and decouple cyclical imports.",
          cta: "View repository architecture",
          repoId: issue.repoId,
        })),
        ...recsList.slice(0, 2).map((rec) => ({
          sev: "info" as const,
          sevLabel: "Action Plan",
          impactLevel: rec.priority === "high" ? "High" : "Low",
          title: rec.recommendation,
          subtitle: rec.repoName,
          impact: rec.action_plan || "Recommended structural improvement to maintain high cohesion.",
          reco: "Apply modular refactoring or layer extraction.",
          cta: "View recommendations",
          repoId: rec.repoId,
        })),
      ]
    : nodes.length > 0
    ? [
        {
          sev: "info" as const,
          sevLabel: "Info",
          impactLevel: "Low",
          title: "Continuous Architecture Live",
          subtitle: `${data?.totalLoc.toLocaleString() ?? 0} Lines Scanned`,
          impact: "Automated worker pipeline analyzes AST nodes and dependencies in real-time.",
          reco: "Trigger new scans on any repository to refresh architecture telemetry.",
          cta: "View repositories",
        },
      ]
    : [
        {
          sev: "info" as const,
          sevLabel: "Info",
          impactLevel: "Low",
          title: "No Repositories Connected",
          subtitle: "Connect your codebase",
          impact: "Coodara extracts full AST code dependency graphs and detects architectural debt automatically.",
          reco: "Import a repository to start tracking software architecture.",
          cta: "Import repository",
        },
      ];

  useEffect(() => {
    if (edges.length === 0) return;
    let frame: number;
    let tick = 0;
    function animate() {
      tick = (tick + 1) % 1000;
      const progress = (tick % 130) / 130;
      edges.forEach(([a, b], i) => {
        const A = byId(a);
        const B = byId(b);
        if (A && B) {
          const x = A.x + (B.x - A.x) * progress;
          const y = A.y + 18 + (B.y - 18 - (A.y + 18)) * progress;
          const dot = dotRefs.current[i];
          if (dot) {
            dot.setAttribute("cx", String(x));
            dot.setAttribute("cy", String(y));
          }
        }
      });
      frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [edges, nodes]);

  const selectedNode = selectedId ? byId(selectedId) : null;

  function openNode(id: string) {
    setSelectedId(id);
    setDrawerTab("details");
  }

  const selectedRepoIssues = selectedNode
    ? (data?.allIssues || []).filter(
        (i) => i.repoId === selectedNode.repoId || i.repoName === selectedNode.label,
      )
    : [];

  const deps = selectedNode
    ? edges
        .filter(([a, b]) => a === selectedNode.id || b === selectedNode.id)
        .map(([a, b]) => (a === selectedNode.id ? { dir: "→", id: b } : { dir: "←", id: a }))
    : [];

  const orgId = activeProject?.id;

  return (
    <div className="mb-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--cd-ink-faint)]">
          Architecture
        </span>
        <div className="h-px flex-1 bg-[var(--cd-border-soft)]" />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_320px]">
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

          <div className="p-3 sm:p-4">
            <div className="relative h-[360px] w-full overflow-hidden rounded-lg border border-[var(--cd-border)] bg-[var(--cd-sunken)] sm:h-[420px]">
              {graphView === "graph" ? (
                nodes.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                    <Network className="h-10 w-10 text-[var(--cd-ink-faint)] mb-3" />
                    <h4 className="text-[14px] font-semibold text-[var(--cd-ink)] mb-1">
                      No repositories connected yet
                    </h4>
                    <p className="text-[12px] text-[var(--cd-ink-soft)] max-w-[360px] mb-4">
                      Import a GitHub repository to automatically construct AST code dependency graphs and live architecture snapshots.
                    </p>
                  </div>
                ) : (
                  <>
                    <svg
                      viewBox="0 0 1040 450"
                      className="h-full w-full select-none"
                      style={{ background: "radial-gradient(ellipse at center, rgba(94,106,210,0.03) 0%, transparent 70%)" }}
                    >
                      <defs>
                        <pattern id="arch-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                          <circle cx="12" cy="12" r="0.75" fill="var(--cd-border)" opacity="0.6" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#arch-grid)" />

                      {/* Edges */}
                      {edges.map(([a, b], i) => {
                        const A = byId(a);
                        const B = byId(b);
                        if (!A || !B) return null;
                        return (
                          <line
                            key={i}
                            x1={A.x}
                            y1={A.y + 18}
                            x2={B.x}
                            y2={B.y - 18}
                            stroke="var(--cd-border)"
                            strokeWidth={1.5}
                            strokeDasharray="3 3"
                          />
                        );
                      })}

                      {edges.map((_, i) => (
                        <circle
                          key={i}
                          ref={(el) => { dotRefs.current[i] = el; }}
                          r={2.75}
                          fill="var(--cd-accent)"
                          opacity={0.85}
                        />
                      ))}

                      {/* Nodes */}
                      {nodes.map((n) => {
                        const charWidth = 7.2;
                        const padLeft = 28;
                        const padRight = 16;
                        const boxWidth = Math.max(120, n.label.length * charWidth + padLeft + padRight);
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
                              fontSize={12}
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
                        Alert
                      </span>
                    </div>
                    <div className="absolute right-1 top-1 hidden items-center gap-1.5 text-[11px] text-[var(--cd-ink-faint)] sm:flex">
                      <Search className="h-3 w-3" />
                      Click a repository for details &amp; architecture map
                    </div>
                  </>
                )
              ) : (
                /* Service Map Tab: Clean Table of Organization Services */
                <div className="h-full overflow-y-auto p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-[var(--cd-ink)]">
                      Organization Services &amp; Repositories ({nodes.length})
                    </span>
                    <span className="text-[11px] text-[var(--cd-ink-faint)]">
                      Synchronized with active AST architecture models
                    </span>
                  </div>

                  <div className="space-y-2">
                    {nodes.map((node) => (
                      <div
                        key={node.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] p-3 hover:border-[var(--cd-accent)] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ background: bandVar(node.band) }}
                          />
                          <div>
                            <div className="font-mono text-[12.5px] font-bold text-[var(--cd-ink)]">
                              {node.label}
                            </div>
                            <div className="text-[11px] text-[var(--cd-ink-soft)]">
                              {node.repo}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-[11.5px]">
                          <span className="rounded bg-[var(--cd-sunken)] px-2 py-0.5 text-[11px] font-medium text-[var(--cd-ink-soft)]">
                            {node.type}
                          </span>
                          <span className="font-mono text-[var(--cd-ink)]">
                            {node.loc} LOC
                          </span>
                          <span
                            className="font-bold"
                            style={{ color: bandVar(node.band) }}
                          >
                            {node.health}/10
                          </span>

                          <button
                            onClick={() => {
                              if (orgId) {
                                navigate(`/dashboard/organizations/${orgId}/repositories/${node.repoId}/architecture`);
                              }
                            }}
                            className="flex cursor-pointer items-center gap-1 rounded-md bg-[var(--cd-accent-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--cd-accent)] hover:bg-[var(--cd-accent)] hover:text-white transition-colors"
                          >
                            <Network className="h-3 w-3" />
                            <span>Architecture</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Node detail drawer */}
              <div
                className={`absolute right-0 top-0 flex h-full w-[260px] flex-col rounded-lg bg-[var(--cd-surface)] transition-transform duration-200 ${
                  selectedNode ? "translate-x-0" : "translate-x-full"
                }`}
                style={selectedNode ? { boxShadow: "-8px 0 24px rgba(20,20,30,0.12)" } : undefined}
              >
                {selectedNode && (
                  <>
                    <div className="flex items-center justify-between border-b border-[var(--cd-border-soft)] px-4 py-3">
                      <h4 className="font-mono text-[13px] font-semibold text-[var(--cd-ink)] truncate">
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
                      {(["details", "deps", "insights"] as DrawerTab[]).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setDrawerTab(tab)}
                          className={`flex-1 cursor-pointer border-b-2 py-2 text-[10.5px] font-medium capitalize ${
                            drawerTab === tab
                              ? "border-[var(--cd-accent)] text-[var(--cd-accent)]"
                              : "border-transparent text-[var(--cd-ink-faint)]"
                          }`}
                        >
                          {tab === "insights" ? "Issues" : tab}
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
                            <span className="text-[var(--cd-ink-soft)]">Language</span>
                            <b className="text-[var(--cd-ink)]">{selectedNode.type}</b>
                          </div>
                          <div className="flex justify-between border-b border-[var(--cd-border-soft)] py-1.5 text-[11.5px]">
                            <span className="text-[var(--cd-ink-soft)]">Lines of Code</span>
                            <b className="font-mono text-[var(--cd-ink)]">{selectedNode.loc}</b>
                          </div>
                          <div className="flex justify-between border-b border-[var(--cd-border-soft)] py-1.5 text-[11.5px]">
                            <span className="text-[var(--cd-ink-soft)]">Detected Issues</span>
                            <b className="text-[var(--cd-ink)]">{selectedRepoIssues.length}</b>
                          </div>

                          <div className="mt-4 space-y-2">
                            <button
                              onClick={() => {
                                if (orgId) {
                                  navigate(`/dashboard/organizations/${orgId}/repositories/${selectedNode.repoId}/architecture`);
                                }
                              }}
                              className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-3 py-2 text-[11.5px] font-semibold text-white hover:bg-[var(--cd-accent-hover)] transition-colors shadow-xs"
                            >
                              <Network className="h-3.5 w-3.5" />
                              <span>Explore Architecture Map</span>
                            </button>

                            <button
                              onClick={() => {
                                if (orgId) {
                                  navigate(`/dashboard/organizations/${orgId}/repositories/${selectedNode.repoId}/analysis`);
                                }
                              }}
                              className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3 py-2 text-[11.5px] font-medium text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)] transition-colors"
                            >
                              <FileCode className="h-3.5 w-3.5" />
                              <span>View AST Analysis Report</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {drawerTab === "deps" && (
                        deps.length ? (
                          <div className="flex flex-col">
                            {deps.map((d, i) => {
                              const target = byId(d.id);
                              return (
                                <div key={i} className="flex items-center gap-2 border-b border-[var(--cd-border-soft)] py-1.5 font-mono text-[11.5px] text-[var(--cd-ink)] last:border-none">
                                  <span className="text-[var(--cd-ink-faint)]">{d.dir}</span>
                                  <span className="truncate">{target ? target.label : d.id}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="py-2 text-[11.5px] text-[var(--cd-ink-faint)]">
                            Multi-repo contract dependencies will appear as additional services are integrated.
                          </div>
                        )
                      )}

                      {drawerTab === "insights" && (
                        <div className="flex flex-col space-y-2">
                          {selectedRepoIssues.length > 0 ? (
                            selectedRepoIssues.slice(0, 4).map((iss, i) => (
                              <div
                                key={i}
                                className="rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)] p-2 text-[11.5px]"
                              >
                                <div className="font-semibold text-[var(--cd-ink)] mb-0.5">
                                  {iss.issue.title}
                                </div>
                                <div className="text-[11px] text-[var(--cd-ink-soft)] leading-snug">
                                  {iss.issue.description}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="py-4 text-center text-[11.5px] text-[var(--cd-good)] flex items-center justify-center gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>No critical violations</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Insights panel */}
        <div className="flex max-h-[360px] flex-col overflow-hidden rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] sm:max-h-[420px] lg:max-h-[476px]">
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
                  onClick={() => {
                    setSelectedInsight(isSelected ? null : i);
                    if (ins.repoId && orgId) {
                      navigate(`/dashboard/organizations/${orgId}/repositories/${ins.repoId}/architecture`);
                    }
                  }}
                  className={`cursor-pointer border-b border-[var(--cd-border-soft)] px-4 py-3 text-left last:border-none hover:bg-[var(--cd-sunken)] transition-colors ${
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