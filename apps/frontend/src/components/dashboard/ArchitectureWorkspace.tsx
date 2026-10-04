import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Network,
  ChevronDown,
  X,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Play,
  RotateCcw,
  Check,
  Search,
  Layers,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  ShieldAlert,
  Copy,
  Eye,
  EyeOff,
  Activity,
} from "lucide-react";
import type { Core } from "cytoscape";
import { ArchitectureGraph, resolveSubsystemInfo } from "@/components/architecture/ArchitectureGraph";
import { getArchitecture } from "@/api/architecture";
import type {
  ArchitectureGraph as ArchitectureGraphData,
  ArchitectureResponse,
  ArchitectureNode,
  ArchitectureNodeType,
} from "@/types/architecture";
import type { OverviewRepositoryItem } from "@/types/overview";
import { Button } from "@/components/ui/button";

interface ArchitectureWorkspaceProps {
  organizationId: number | string;
  activeRepo: OverviewRepositoryItem | null;
  repos: OverviewRepositoryItem[];
  onSelectRepo: (repo: OverviewRepositoryItem) => void;
  onAnalyze: () => void;
}

type FilterView = "all" | "services" | "dependencies" | "infrastructure";

function getTypeBadgeStyle(type: ArchitectureNodeType) {
  switch (type) {
    case "frontend":
    case "service":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30";
    case "database":
    case "storage":
    case "cache":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    case "external":
      return "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30";
    case "ui_component":
    case "package":
      return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
    case "queue":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
    default:
      return "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30";
  }
}

export function ArchitectureWorkspace({
  organizationId,
  activeRepo,
  repos,
  onSelectRepo,
  onAnalyze,
}: ArchitectureWorkspaceProps) {
  const navigate = useNavigate();
  const [architectureData, setArchitectureData] = useState<ArchitectureResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [filterView, setFilterView] = useState<FilterView>("all");
  const [viewLevel, setViewLevel] = useState<"subsystems" | "modules">("subsystems");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [layoutMode, setLayoutMode] = useState<"hierarchical" | "cose" | "concentric" | "grid">("hierarchical");
  const [riskOverlay, setRiskOverlay] = useState<boolean>(false);
  const [focusMode, setFocusMode] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [matchCount, setMatchCount] = useState<number>(0);
  const [copiedPath, setCopiedPath] = useState<boolean>(false);
  const [isRepoDropdownOpen, setIsRepoDropdownOpen] = useState<boolean>(false);
  const [hoveredNode, setHoveredNode] = useState<{
    node: ArchitectureNode;
    pos: { x: number; y: number };
  } | null>(null);

  const cyRef = useRef<Core | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // In-memory cache to prevent duplicate fetches across repository toggles
  const archCache = useRef<Map<number, ArchitectureResponse>>(new Map());

  // Escape key and body scroll lock for Fullscreen mode
  useEffect(() => {
    if (isFullscreen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setIsFullscreen(false);
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isFullscreen]);

  useEffect(() => {
    if (!activeRepo?.id || !organizationId) return;

    // Check in-memory cache first
    if (archCache.current.has(activeRepo.id)) {
      setArchitectureData(archCache.current.get(activeRepo.id)!);
      return;
    }

    // Only fetch if repo is analyzed or has latest analysis
    if (!activeRepo.latest_analysis_status && activeRepo.health_score === 100 && activeRepo.loc === 0) {
      setArchitectureData(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    getArchitecture(organizationId, activeRepo.id)
      .then((data) => {
        if (!isMounted) return;
        archCache.current.set(activeRepo.id, data);
        setArchitectureData(data);
      })
      .catch((err) => {
        console.warn("Could not fetch architecture for workspace:", err);
        if (isMounted) setArchitectureData(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeRepo?.id, organizationId]);

  // Derive filtered graph based on active filter view
  const displayGraph = useMemo<ArchitectureGraphData>(() => {
    const rawGraph = architectureData?.graph;
    if (!rawGraph || !rawGraph.nodes) {
      return { nodes: [], edges: [] };
    }

    if (filterView === "all") return rawGraph;

    let allowedTypes: string[] = [];
    if (filterView === "services") {
      allowedTypes = ["service", "core", "module"];
    } else if (filterView === "dependencies") {
      // Keep only nodes with at least 1 connection
      const connectedIds = new Set<string>();
      rawGraph.edges.forEach((e) => {
        connectedIds.add(e.source);
        connectedIds.add(e.target);
      });
      return {
        nodes: rawGraph.nodes.filter((n) => connectedIds.has(n.id)),
        edges: rawGraph.edges,
      };
    } else if (filterView === "infrastructure") {
      allowedTypes = ["database", "storage", "cache", "queue", "external"];
    }

    const filteredNodes = rawGraph.nodes.filter((n) => allowedTypes.includes(n.type));
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = rawGraph.edges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
    );

    return {
      nodes: filteredNodes,
      edges: filteredEdges,
    };
  }, [architectureData, filterView]);

  // Selected node entity for contextual inspector
  const selectedNode = useMemo<ArchitectureNode | null>(() => {
    if (!selectedNodeId || !architectureData?.graph?.nodes) return null;

    // 1. Direct match in raw nodes
    const direct = architectureData.graph.nodes.find((n) => n.id === selectedNodeId);
    if (direct) return direct;

    // 2. If selectedNodeId is a subsystem ID, synthesize clean domain representation
    const matchingMembers = architectureData.graph.nodes.filter(
      (n) => resolveSubsystemInfo(n.file_path || n.id, n.type).id === selectedNodeId,
    );
    if (matchingMembers.length > 0) {
      const sample = matchingMembers[0];
      const info = resolveSubsystemInfo(sample.file_path || sample.id, sample.type);
      const avgHealth = Math.round(
        matchingMembers.reduce((acc, m) => acc + (m.health_score ?? 85), 0) / matchingMembers.length,
      );
      const totalIssues = matchingMembers.reduce((acc, m) => acc + (m.issue_count ?? 0), 0);
      return {
        id: info.id,
        name: info.name,
        type: info.type,
        subsystem: info.id,
        description: `${info.description} (Encapsulates ${matchingMembers.length} modules)`,
        dependency_count: 0,
        dependent_count: 0,
        issue_count: totalIssues,
        health_score: avgHealth,
        responsibilities: [
          `Coordinates ${info.name} domain boundaries across ${matchingMembers.length} modules`,
          "Enforces architectural contracts and boundary isolation",
          "Maintains decoupled interfaces and state management",
        ],
        file_path: `${info.id}/ (${matchingMembers.length} modules)`,
      };
    }

    return null;
  }, [selectedNodeId, architectureData]);

  // Outgoing dependencies (what this node depends on) and Incoming dependents (what depends on this node)
  const { outgoingNeighbors, incomingNeighbors, violatingEdgesForNode } = useMemo(() => {
    if (!selectedNodeId || !architectureData?.graph) {
      return { outgoingNeighbors: [], incomingNeighbors: [], violatingEdgesForNode: [] };
    }

    const { nodes, edges } = architectureData.graph;
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    if (viewLevel === "subsystems") {
      // Group connections by subsystem
      const outMap = new Map<string, { id: string; name: string; type: ArchitectureNodeType }>();
      const inMap = new Map<string, { id: string; name: string; type: ArchitectureNodeType }>();
      const violating: typeof edges = [];

      edges.forEach((e) => {
        const srcSub = resolveSubsystemInfo(e.source).id;
        const tgtSub = resolveSubsystemInfo(e.target).id;

        if (srcSub === selectedNodeId && tgtSub !== selectedNodeId) {
          if (!outMap.has(tgtSub)) {
            const info = resolveSubsystemInfo(tgtSub);
            outMap.set(tgtSub, { id: info.id, name: info.name, type: info.type });
          }
          if (e.boundary_status === "violates_boundary" || (!e.is_intentional && e.is_intentional !== undefined)) {
            violating.push(e);
          }
        }
        if (tgtSub === selectedNodeId && srcSub !== selectedNodeId) {
          if (!inMap.has(srcSub)) {
            const info = resolveSubsystemInfo(srcSub);
            inMap.set(srcSub, { id: info.id, name: info.name, type: info.type });
          }
          if (e.boundary_status === "violates_boundary" || (!e.is_intentional && e.is_intentional !== undefined)) {
            violating.push(e);
          }
        }
      });

      return {
        outgoingNeighbors: Array.from(outMap.values()),
        incomingNeighbors: Array.from(inMap.values()),
        violatingEdgesForNode: violating,
      };
    } else {
      // Modules view: direct edge connections
      const outList = edges
        .filter((e) => e.source === selectedNodeId)
        .map((e) => {
          const targetNode = nodeMap.get(e.target);
          return {
            id: e.target,
            name: targetNode?.name || e.target,
            type: targetNode?.type || "module",
          };
        });

      const inList = edges
        .filter((e) => e.target === selectedNodeId)
        .map((e) => {
          const sourceNode = nodeMap.get(e.source);
          return {
            id: e.source,
            name: sourceNode?.name || e.source,
            type: sourceNode?.type || "module",
          };
        });

      const violating = edges.filter(
        (e) =>
          (e.source === selectedNodeId || e.target === selectedNodeId) &&
          (e.boundary_status === "violates_boundary" || (!e.is_intentional && e.is_intentional !== undefined)),
      );

      return {
        outgoingNeighbors: outList,
        incomingNeighbors: inList,
        violatingEdgesForNode: violating,
      };
    }
  }, [selectedNodeId, architectureData, viewLevel]);

  // Overall system overview statistics when no node is selected
  const systemStats = useMemo(() => {
    if (!architectureData?.graph) {
      return { totalComponents: 0, totalDependencies: 0, healthScore: null, violationsCount: 0, topComponents: [] };
    }
    const { nodes, edges } = architectureData.graph;
    const violationsCount = edges.filter(
      (e) => e.boundary_status === "violates_boundary" || (!e.is_intentional && e.is_intentional !== undefined),
    ).length;

    // Top connected components for one-click exploration
    const sorted = [...nodes].sort(
      (a, b) => ((b.dependency_count || 0) + (b.dependent_count || 0)) - ((a.dependency_count || 0) + (a.dependent_count || 0)),
    );

    return {
      totalComponents: nodes.length,
      totalDependencies: edges.length,
      healthScore: architectureData.summary?.health_score ?? 88,
      violationsCount,
      topComponents: sorted.slice(0, 5),
    };
  }, [architectureData]);

  // Zoom and Canvas navigation controls
  const handleZoomIn = useCallback(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;
    cy.zoom({
      level: cy.zoom() * 1.25,
      renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 },
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;
    cy.zoom({
      level: cy.zoom() * 0.8,
      renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 },
    });
  }, []);

  const handleFit = useCallback(() => {
    if (!cyRef.current) return;
    cyRef.current.fit(undefined, 35);
    cyRef.current.center();
  }, []);

  const handleReset = useCallback(() => {
    setSelectedNodeId(null);
    setSearchQuery("");
    setFocusMode(false);
    setRiskOverlay(false);
    setFilterView("all");
    if (cyRef.current) {
      cyRef.current.fit(undefined, 35);
      cyRef.current.center();
    }
  }, []);

  const handleCopyPath = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 1500);
  }, []);

  const hasNodes = (displayGraph.nodes?.length ?? 0) > 0;
  const isAnalyzed = activeRepo && activeRepo.latest_analysis_status === "completed";

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-50 flex flex-col bg-[var(--cd-surface)] overflow-hidden animate-in fade-in duration-150"
          : "mb-8 rounded-[12px] border border-[var(--cd-border)] bg-[var(--cd-surface)] shadow-xs overflow-hidden"
      }
    >
      {/* ========================================================================= */}
      {/* 1. UNIFIED ENGINEERING TOOLBAR                                            */}
      {/* ========================================================================= */}
      <div className="flex flex-col gap-3 border-b border-[var(--cd-border-soft)] p-4 bg-[var(--cd-surface)]">
        {/* Top row: Title, Subsystem/Module switch, Filter tabs, Fullscreen */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[var(--cd-accent-soft)] text-[var(--cd-accent)]">
                <Network className="h-4 w-4" />
              </div>
              <h2 className="text-[13.5px] font-bold uppercase tracking-wider text-[var(--cd-ink)] font-heading">
                System Architecture
              </h2>
            </div>

            {/* Multi-repository selector */}
            {repos.length > 1 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsRepoDropdownOpen(!isRepoDropdownOpen)}
                  className="flex items-center gap-1.5 rounded-[6px] border border-[var(--cd-border)] bg-[var(--cd-sunken)]/70 px-2 py-1 text-[11.5px] font-medium text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)] cursor-pointer"
                >
                  <span className="max-w-[130px] truncate">{activeRepo?.name || "Select repo"}</span>
                  <ChevronDown className="h-3 w-3 text-[var(--cd-ink-faint)]" />
                </button>

                {isRepoDropdownOpen && (
                  <div className="absolute left-0 top-full z-30 mt-1 w-56 rounded-[8px] border border-[var(--cd-border)] bg-[var(--cd-surface)] py-1 shadow-lg">
                    {repos.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          onSelectRepo(r);
                          setSelectedNodeId(null);
                          setIsRepoDropdownOpen(false);
                        }}
                        className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[12px] text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)] cursor-pointer"
                      >
                        <span className="truncate">{r.name}</span>
                        {r.id === activeRepo?.id && <Check className="h-3.5 w-3.5 text-[var(--cd-accent)]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* View Level Segmented Control (Subsystems vs Granular Modules) */}
            <div className="inline-flex rounded-[8px] border border-[var(--cd-border)] bg-[var(--cd-sunken)] p-0.5 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setViewLevel("subsystems")}
                className={`cursor-pointer rounded-[6px] px-2.5 py-0.5 transition-colors ${
                  viewLevel === "subsystems"
                    ? "bg-[var(--cd-surface)] text-[var(--cd-accent)] shadow-xs"
                    : "text-[var(--cd-ink-soft)] hover:text-[var(--cd-ink)]"
                }`}
                title="View high-level domain subsystems and cross-tier dependency contracts"
              >
                🏛️ Subsystems
              </button>
              <button
                type="button"
                onClick={() => setViewLevel("modules")}
                className={`cursor-pointer rounded-[6px] px-2.5 py-0.5 transition-colors ${
                  viewLevel === "modules"
                    ? "bg-[var(--cd-surface)] text-[var(--cd-accent)] shadow-xs"
                    : "text-[var(--cd-ink-soft)] hover:text-[var(--cd-ink)]"
                }`}
                title="View granular module imports and direct code dependencies"
              >
                🔍 Modules ({architectureData?.graph?.nodes?.length ?? 0})
              </button>
            </div>
          </div>

          {/* Filter Tabs & External Navigation */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex overflow-hidden rounded-[8px] border border-[var(--cd-border)] bg-[var(--cd-surface)] p-0.5">
              {(
                [
                  { id: "all", label: "Overview" },
                  { id: "services", label: "Services" },
                  { id: "dependencies", label: "Dependencies" },
                  { id: "infrastructure", label: "Infrastructure" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterView(tab.id)}
                  className={`rounded-[6px] px-2.5 py-1 text-[11.5px] font-medium transition-colors cursor-pointer ${
                    filterView === tab.id
                      ? "bg-[var(--cd-accent-soft)] text-[var(--cd-accent)] font-semibold"
                      : "text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* External full canvas link */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (activeRepo) {
                  navigate(
                    `/dashboard/organizations/${organizationId}/repositories/${activeRepo.id}/architecture`,
                  );
                }
              }}
              className="hidden sm:inline-flex gap-1 text-[11.5px]"
              title="Open dedicated Architecture Intelligence studio"
            >
              <span>Full Workspace</span>
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Second row: Interactive Search, Layout Mode, Risk Overlay toggle, Zoom & Fullscreen */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-[var(--cd-border-soft)] pt-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Interactive Search Box with Match Counter */}
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-[var(--cd-ink-faint)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search components..."
                className="h-8 w-40 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] pl-8 pr-16 text-[11.5px] text-[var(--cd-ink)] placeholder-[var(--cd-ink-faint)] focus:w-52 focus:border-[var(--cd-accent)] focus:outline-none transition-all sm:w-48"
              />
              {searchQuery.trim().length > 0 && (
                <div className="absolute right-2 flex items-center gap-1">
                  <span className="rounded bg-[var(--cd-sunken)] px-1.5 py-0.2 font-mono text-[10px] text-[var(--cd-ink-soft)] font-medium">
                    {matchCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="p-0.5 text-[var(--cd-ink-faint)] hover:text-[var(--cd-ink)] cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Layout Mode Selector */}
            <div className="flex items-center rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-2">
              <Layers className="h-3.5 w-3.5 text-[var(--cd-ink-faint)] mr-1" />
              <select
                value={layoutMode}
                onChange={(e) => setLayoutMode(e.target.value as any)}
                className="h-8 border-none bg-transparent pr-2 text-[11.5px] font-medium text-[var(--cd-ink)] focus:outline-none cursor-pointer"
              >
                <option value="hierarchical">Hierarchical (Tiered)</option>
                <option value="cose">Clustered (Organic)</option>
                <option value="concentric">Concentric</option>
                <option value="grid">Structured Grid</option>
              </select>
            </div>

            {/* Risk Overlay Mode Toggle (Real data backed) */}
            <button
              type="button"
              onClick={() => setRiskOverlay(!riskOverlay)}
              className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11.5px] font-medium transition-all cursor-pointer ${
                riskOverlay
                  ? "border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-400 font-semibold shadow-xs"
                  : "border-[var(--cd-border)] bg-[var(--cd-surface)] text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)]"
              }`}
              title="Highlight components with detected boundary violations or health risks"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  riskOverlay ? "bg-rose-500 animate-pulse" : "bg-slate-400"
                }`}
              />
              <span>Risk Overlay</span>
            </button>
          </div>

          {/* Zoom Controls, Reset & Fullscreen Toggle */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center overflow-hidden rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)]">
              <button
                type="button"
                onClick={handleZoomIn}
                title="Zoom in"
                className="flex h-8 items-center gap-1 px-2 text-[11.5px] font-medium text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)] cursor-pointer"
              >
                <ZoomIn className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Zoom In</span>
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                title="Zoom out"
                className="flex h-8 items-center gap-1 border-l border-[var(--cd-border)] px-2 text-[11.5px] font-medium text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)] cursor-pointer"
              >
                <ZoomOut className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Zoom Out</span>
              </button>
              <button
                type="button"
                onClick={handleFit}
                title="Fit to view"
                className="flex h-8 items-center gap-1 border-l border-[var(--cd-border)] px-2 text-[11.5px] font-medium text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)] cursor-pointer"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Fit</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                title="Reset view"
                className="flex h-8 items-center border-l border-[var(--cd-border)] px-2 text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)] cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11.5px] font-medium transition-all cursor-pointer ${
                isFullscreen
                  ? "border-[var(--cd-accent)] bg-[var(--cd-accent-soft)] text-[var(--cd-accent)] font-semibold"
                  : "border-[var(--cd-border)] bg-[var(--cd-surface)] text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)]"
              }`}
              title={isFullscreen ? "Exit Fullscreen (Esc)" : "Expand to Fullscreen"}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5" />
                  <span>Exit Fullscreen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Fullscreen</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. WORKSPACE BODY: GRAPH CANVAS + CONTEXTUAL INTELLIGENCE INSPECTOR       */}
      {/* ========================================================================= */}
      <div className="relative flex flex-1 flex-col lg:flex-row min-h-[580px] overflow-hidden">
        {/* Graph Canvas Container */}
        <div ref={canvasContainerRef} className="relative flex-1 min-w-0 flex flex-col">
          {/* Focus Mode Banner Overlay */}
          {focusMode && selectedNode && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full border border-[var(--cd-accent)]/40 bg-[var(--cd-surface)]/95 px-3.5 py-1 text-[11.5px] shadow-md backdrop-blur-md animate-in fade-in duration-150">
              <span className="h-2 w-2 rounded-full bg-[var(--cd-accent)] animate-pulse" />
              <span className="text-[var(--cd-ink)]">
                Focusing on <strong className="font-semibold text-[var(--cd-accent)]">{selectedNode.name}</strong> neighborhood ({outgoingNeighbors.length + incomingNeighbors.length} connected)
              </span>
              <button
                type="button"
                onClick={() => setFocusMode(false)}
                className="ml-1 rounded-full p-0.5 text-[var(--cd-ink-faint)] hover:bg-[var(--cd-sunken)] hover:text-[var(--cd-ink)] cursor-pointer"
                title="Exit Focus Mode"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Lightweight Hover Tooltip Overlay */}
          {hoveredNode && (
            <div
              className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-full transform rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)]/95 p-2.5 shadow-lg backdrop-blur-md transition-all duration-75"
              style={{
                left: Math.max(130, Math.min((canvasContainerRef.current?.clientWidth ?? 600) - 130, hoveredNode.pos.x)),
                top: Math.max(65, hoveredNode.pos.y - 12),
              }}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-[12.5px] text-[var(--cd-ink)] font-heading">
                  {hoveredNode.node.name}
                </span>
                <span
                  className={`rounded border px-1.5 py-0.2 font-mono text-[9.5px] uppercase font-semibold ${getTypeBadgeStyle(
                    hoveredNode.node.type,
                  )}`}
                >
                  {hoveredNode.node.type}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-3 text-[11px] text-[var(--cd-ink-soft)]">
                <span className="flex items-center gap-1 font-medium">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#4F46E5]" />
                  {hoveredNode.node.dependency_count ?? 0} out
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#059669]" />
                  {hoveredNode.node.dependent_count ?? 0} in
                </span>
                {(hoveredNode.node.issue_count ?? 0) > 0 && (
                  <span className="font-semibold text-rose-600 dark:text-rose-400">
                    {hoveredNode.node.issue_count} issues
                  </span>
                )}
                {hoveredNode.node.health_score !== null && hoveredNode.node.health_score !== undefined && (
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {hoveredNode.node.health_score}% health
                  </span>
                )}
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex flex-1 min-h-[560px] w-full flex-col items-center justify-center gap-3 bg-[var(--cd-bg)] p-8 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--cd-accent)] border-t-transparent" />
              <p className="text-[13px] font-medium text-[var(--cd-ink)]">
                Reconstructing architecture topology...
              </p>
              <p className="text-[11.5px] text-[var(--cd-ink-faint)] max-w-sm">
                Parsing AST symbols, cross-file imports, and layer boundaries.
              </p>
            </div>
          ) : hasNodes ? (
            <ArchitectureGraph
              graph={displayGraph}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
              hideInternalToolbar={true}
              searchQuery={searchQuery}
              layoutMode={layoutMode}
              viewLevel={viewLevel}
              onViewLevelChange={setViewLevel}
              riskOverlay={riskOverlay}
              focusMode={focusMode}
              onHoverNode={(node, pos) => setHoveredNode(node && pos ? { node, pos } : null)}
              cyRefOut={cyRef}
              onMatchCountChange={setMatchCount}
              className="flex-1 min-h-[560px] flex flex-col border-none bg-transparent"
            />
          ) : (
            <div className="flex flex-1 min-h-[560px] w-full flex-col items-center justify-center gap-3 bg-[var(--cd-bg)] p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[var(--cd-sunken)] text-[var(--cd-ink-faint)]">
                <Network className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--cd-ink)]">
                {isAnalyzed
                  ? "No components match the current filter"
                  : "Architecture awaiting initial scan"}
              </h3>
              <p className="max-w-md text-[12px] text-[var(--cd-ink-soft)] leading-relaxed">
                {isAnalyzed
                  ? "Try resetting the filter view to 'Overview' to view all system components."
                  : "Trigger an architectural scan on this repository to synthesize component dependencies and structural telemetry."}
              </p>
              <div className="mt-2 flex items-center gap-2">
                {!isAnalyzed ? (
                  <Button variant="primary" size="md" onClick={onAnalyze} className="gap-1.5">
                    <Play className="h-3.5 w-3.5" />
                    <span>Run Initial Architecture Scan</span>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilterView("all")}
                    className="gap-1.5"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reset Filter</span>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 3. CONTEXTUAL INTELLIGENCE (RIGHT INSPECTOR PANEL)                         */}
        {/* ========================================================================= */}
        <aside className="w-full border-t border-[var(--cd-border)] bg-[var(--cd-surface)] p-5 lg:w-96 lg:border-l lg:border-t-0 flex flex-col justify-between overflow-y-auto animate-in fade-in duration-150">
          {selectedNode ? (
            /* STATE A: ACTIVE COMPONENT INSPECTOR */
            <div className="space-y-4">
              {/* Header with type badge, subsystem, and dismiss */}
              <div className="flex items-start justify-between gap-2 border-b border-[var(--cd-border-soft)] pb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${getTypeBadgeStyle(
                        selectedNode.type,
                      )}`}
                    >
                      {selectedNode.type}
                    </span>
                    <span className="text-[11px] text-[var(--cd-ink-faint)] truncate max-w-[150px]">
                      {selectedNode.subsystem}
                    </span>
                  </div>

                  <h3 className="mt-1.5 truncate text-[15px] font-bold text-[var(--cd-ink)] font-heading">
                    {selectedNode.name}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedNodeId(null);
                    setFocusMode(false);
                  }}
                  className="rounded-[6px] p-1 text-[var(--cd-ink-faint)] hover:bg-[var(--cd-sunken)] hover:text-[var(--cd-ink)] cursor-pointer"
                  title="Close Inspector"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Quick Component Action Bar */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFocusMode(!focusMode)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-1.5 text-[11.5px] font-medium transition-all cursor-pointer ${
                    focusMode
                      ? "border-[var(--cd-accent)] bg-[var(--cd-accent-soft)] text-[var(--cd-accent)] font-semibold shadow-xs"
                      : "border-[var(--cd-border)] bg-[var(--cd-sunken)]/60 text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)] hover:text-[var(--cd-ink)]"
                  }`}
                  title="Isolate this component's immediate neighborhood on canvas"
                >
                  {focusMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  <span>{focusMode ? "Exit Focus" : "Focus Neighborhood"}</span>
                </button>

                {selectedNode.file_path && (
                  <button
                    type="button"
                    onClick={() => handleCopyPath(selectedNode.file_path || selectedNode.id)}
                    className="flex items-center gap-1 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-sunken)]/60 px-2.5 py-1.5 text-[11.5px] font-medium text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)] hover:text-[var(--cd-ink)] transition-colors cursor-pointer"
                    title="Copy path to clipboard"
                  >
                    {copiedPath ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Path</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* 4-Cell Real Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 rounded-[8px] border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)]/40 p-2.5">
                <div>
                  <div className="text-[10.5px] text-[var(--cd-ink-faint)] font-medium">
                    Depends On (Out)
                  </div>
                  <div className="text-[14px] font-bold text-[#4F46E5] dark:text-indigo-400 font-mono">
                    {outgoingNeighbors.length || (selectedNode.dependency_count ?? 0)}
                  </div>
                </div>
                <div>
                  <div className="text-[10.5px] text-[var(--cd-ink-faint)] font-medium">
                    Depended On By (In)
                  </div>
                  <div className="text-[14px] font-bold text-[#059669] dark:text-emerald-400 font-mono">
                    {incomingNeighbors.length || (selectedNode.dependent_count ?? 0)}
                  </div>
                </div>
                <div>
                  <div className="text-[10.5px] text-[var(--cd-ink-faint)] font-medium">
                    Component Health
                  </div>
                  <div className="text-[14px] font-bold text-[var(--cd-good)] font-mono">
                    {selectedNode.health_score ?? 85}%
                  </div>
                </div>
                <div>
                  <div className="text-[10.5px] text-[var(--cd-ink-faint)] font-medium">
                    Boundary Violations
                  </div>
                  <div
                    className={`text-[14px] font-bold font-mono ${
                      violatingEdgesForNode.length > 0 || (selectedNode.issue_count ?? 0) > 0
                        ? "text-[var(--cd-risk)]"
                        : "text-[var(--cd-good)]"
                    }`}
                  >
                    {violatingEdgesForNode.length || (selectedNode.issue_count ?? 0)}
                  </div>
                </div>
              </div>

              {/* Interactive Neighborhood Traversal (Clickable neighbor pills) */}
              <div className="space-y-3 border-t border-[var(--cd-border-soft)] pt-3">
                {/* Outgoing Dependencies */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--cd-ink)] mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-full bg-[#4F46E5]" />
                      <span>Depends On ({outgoingNeighbors.length})</span>
                    </span>
                    <span className="text-[10px] text-[var(--cd-ink-faint)]">Outgoing</span>
                  </div>

                  {outgoingNeighbors.length === 0 ? (
                    <p className="text-[11px] text-[var(--cd-ink-faint)] italic">
                      Leaf component (no outgoing architecture dependencies).
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                      {outgoingNeighbors.map((dep) => (
                        <button
                          key={dep.id}
                          type="button"
                          onClick={() => setSelectedNodeId(dep.id)}
                          className="flex items-center gap-1.5 rounded-md border border-[var(--cd-border)] bg-[var(--cd-sunken)]/60 px-2 py-1 text-[11.5px] text-[var(--cd-ink)] hover:border-[#4F46E5] hover:bg-indigo-50/40 dark:hover:bg-indigo-950/40 transition-all cursor-pointer group"
                          title={`Navigate to ${dep.name}`}
                        >
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#4F46E5]" />
                          <span className="font-medium truncate max-w-[135px]">{dep.name}</span>
                          <ArrowRight className="h-3 w-3 text-[var(--cd-ink-faint)] group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Incoming Dependents */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--cd-ink)] mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-full bg-[#059669]" />
                      <span>Depended On By ({incomingNeighbors.length})</span>
                    </span>
                    <span className="text-[10px] text-[var(--cd-ink-faint)]">Incoming</span>
                  </div>

                  {incomingNeighbors.length === 0 ? (
                    <p className="text-[11px] text-[var(--cd-ink-faint)] italic">
                      Root component (not depended on by other components).
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                      {incomingNeighbors.map((dep) => (
                        <button
                          key={dep.id}
                          type="button"
                          onClick={() => setSelectedNodeId(dep.id)}
                          className="flex items-center gap-1.5 rounded-md border border-[var(--cd-border)] bg-[var(--cd-sunken)]/60 px-2 py-1 text-[11.5px] text-[var(--cd-ink)] hover:border-[#059669] hover:bg-emerald-50/40 dark:hover:bg-emerald-950/40 transition-all cursor-pointer group"
                          title={`Navigate to ${dep.name}`}
                        >
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#059669]" />
                          <span className="font-medium truncate max-w-[135px]">{dep.name}</span>
                          <ArrowRight className="h-3 w-3 text-[var(--cd-ink-faint)] group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Real Evidence / Boundary Status */}
              <div className="space-y-2 border-t border-[var(--cd-border-soft)] pt-3">
                {violatingEdgesForNode.length > 0 && (
                  <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5">
                    <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-rose-700 dark:text-rose-300">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span>Boundary Violation Detected</span>
                    </div>
                    <p className="mt-1 text-[11px] text-rose-800 dark:text-rose-200 leading-relaxed">
                      {violatingEdgesForNode[0].rationale ||
                        "Direct dependency violates established architectural layers without orchestration."}
                    </p>
                  </div>
                )}

                {/* File path info */}
                {selectedNode.file_path && (
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--cd-ink-faint)]">
                      Component Path
                    </span>
                    <div className="mt-1 break-all rounded bg-[var(--cd-sunken)] p-2 font-mono text-[11px] text-[var(--cd-ink-soft)]">
                      {selectedNode.file_path}
                    </div>
                  </div>
                )}

                {/* Responsibilities list if present */}
                {selectedNode.responsibilities && selectedNode.responsibilities.length > 0 && (
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--cd-ink-faint)]">
                      Architectural Responsibilities
                    </span>
                    <ul className="mt-1 space-y-1 text-[11.5px] text-[var(--cd-ink-soft)]">
                      {selectedNode.responsibilities.slice(0, 3).map((r, i) => (
                        <li key={i} className="flex items-start gap-1.5 leading-snug">
                          <span className="text-[var(--cd-accent)] mt-0.5">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* STATE B: SYSTEM ARCHITECTURE OVERVIEW (WHEN NO COMPONENT SELECTED) */
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--cd-accent)] uppercase tracking-wider">
                  <Activity className="h-3.5 w-3.5" />
                  <span>Telemetry Overview</span>
                </div>
                <h3 className="mt-1 text-[15px] font-bold text-[var(--cd-ink)] font-heading">
                  System Architecture Intelligence
                </h3>
                <p className="mt-1 text-[12px] text-[var(--cd-ink-soft)] leading-relaxed">
                  Computable macro topology reconstructed from AST symbol analysis and import contracts.
                </p>
              </div>

              {/* 4-Cell System Summary Grid */}
              <div className="grid grid-cols-2 gap-2 rounded-[8px] border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)]/40 p-2.5">
                <div>
                  <div className="text-[10.5px] text-[var(--cd-ink-faint)] font-medium">
                    Total Components
                  </div>
                  <div className="text-[15px] font-bold text-[var(--cd-ink)] font-mono">
                    {systemStats.totalComponents}
                  </div>
                </div>
                <div>
                  <div className="text-[10.5px] text-[var(--cd-ink-faint)] font-medium">
                    Direct Contracts
                  </div>
                  <div className="text-[15px] font-bold text-[var(--cd-ink)] font-mono">
                    {systemStats.totalDependencies}
                  </div>
                </div>
                <div>
                  <div className="text-[10.5px] text-[var(--cd-ink-faint)] font-medium">
                    System Health
                  </div>
                  <div className="text-[15px] font-bold text-[var(--cd-good)] font-mono">
                    {systemStats.healthScore !== null ? `${systemStats.healthScore}%` : "88%"}
                  </div>
                </div>
                <div>
                  <div className="text-[10.5px] text-[var(--cd-ink-faint)] font-medium">
                    Layer Violations
                  </div>
                  <div
                    className={`text-[15px] font-bold font-mono ${
                      systemStats.violationsCount > 0 ? "text-[var(--cd-risk)]" : "text-[var(--cd-good)]"
                    }`}
                  >
                    {systemStats.violationsCount}
                  </div>
                </div>
              </div>

              {/* Quick Guidance Box */}
              <div className="rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)]/20 p-3">
                <p className="text-[11.5px] text-[var(--cd-ink-soft)] leading-relaxed">
                  Select any component on the canvas to inspect its directional dependencies, architectural contracts, and coupling metrics.
                </p>
              </div>

              {/* Top Connected Components for One-Click Traversal */}
              {systemStats.topComponents.length > 0 && (
                <div className="border-t border-[var(--cd-border-soft)] pt-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--cd-ink-faint)]">
                    Key Architectural Components
                  </span>
                  <div className="mt-2 space-y-1.5">
                    {systemStats.topComponents.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => setSelectedNodeId(n.id)}
                        className="flex w-full items-center justify-between rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-surface)] p-2 text-left hover:border-[var(--cd-accent)] hover:bg-[var(--cd-sunken)] transition-all cursor-pointer group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`rounded px-1.5 py-0.2 font-mono text-[9px] uppercase font-semibold border ${getTypeBadgeStyle(
                                n.type,
                              )}`}
                            >
                              {n.type}
                            </span>
                            <span className="font-semibold text-[12px] text-[var(--cd-ink)] truncate">
                              {n.name}
                            </span>
                          </div>
                          <span className="text-[10.5px] text-[var(--cd-ink-faint)] font-mono">
                            {n.dependency_count ?? 0} out · {n.dependent_count ?? 0} in
                          </span>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-[var(--cd-ink-faint)] group-hover:translate-x-0.5 group-hover:text-[var(--cd-accent)] transition-all" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Primary Action Triggers */}
          <div className="mt-5 space-y-2 border-t border-[var(--cd-border-soft)] pt-4">
            <Button
              variant="primary"
              size="sm"
              className="w-full justify-between cursor-pointer"
              onClick={() => {
                if (activeRepo) {
                  navigate(
                    `/architecture?repoId=${activeRepo.id}&orgId=${organizationId}&tab=studio${
                      selectedNode ? `&component=${encodeURIComponent(selectedNode.id)}` : ""
                    }`,
                  );
                }
              }}
            >
              <span>{selectedNode ? "Inspect in Code Studio" : "Open Code Studio"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between cursor-pointer"
              onClick={() => {
                navigate(
                  `/chat?query=${encodeURIComponent(
                    selectedNode
                      ? `Explain the architecture and dependencies of ${selectedNode.name}`
                      : `Explain the macro architecture of ${activeRepo?.name || "this repository"}`,
                  )}`,
                );
              }}
            >
              <span>{selectedNode ? "Ask Coodara about this node" : "Ask Architect AI"}</span>
              <Sparkles className="h-3.5 w-3.5 text-[var(--cd-accent)]" />
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
