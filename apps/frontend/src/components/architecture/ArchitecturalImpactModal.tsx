import { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  Flame,
  ShieldAlert,
  Users,
  Box,
  ArrowRight,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  Search,
  FileText,
  Sliders,
  Compass,
  CheckCircle,
  XCircle,
  Folder,
  FolderOpen,
  FileCode,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  FolderTree,
  GitBranch,
  Activity,
} from "lucide-react";
import {
  getArchitecturalImpactAnalysis,
  getArchitectureFileTree,
  getArchitectureFileContent,
  getArchitectureGraph,
} from "@/api/architecture";
import type {
  ArchitecturalImpactAnalysisResponse,
  ArchitectureFileNode,
} from "@/types/architecture";

interface ArchitecturalImpactModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string | number;
  repositoryId: string | number;
  initialComponentId?: string;
  onOpenAgentSpec?: (task: string) => void;
}

function findNodeByPath(node: ArchitectureFileNode | null, targetPath: string): ArchitectureFileNode | null {
  if (!node) return null;
  if (node.path === targetPath || node.id === targetPath || (node.name && targetPath.endsWith(node.name))) {
    return node;
  }
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeByPath(child, targetPath);
      if (found) return found;
    }
  }
  return null;
}

function getLanguageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "py": return "Python";
    case "ts": return "TypeScript";
    case "tsx": return "TypeScript (React)";
    case "js": return "JavaScript";
    case "jsx": return "JavaScript (React)";
    case "go": return "Go";
    case "rs": return "Rust";
    case "java": return "Java";
    case "cpp": case "cxx": case "cc": return "C++";
    case "c": case "h": return "C";
    case "rb": return "Ruby";
    case "php": return "PHP";
    case "cs": return "C#";
    case "json": return "JSON";
    case "yaml": case "yml": return "YAML";
    case "md": return "Markdown";
    case "sql": return "SQL";
    default: return ext ? ext.toUpperCase() : "Source Code";
  }
}

export function ArchitecturalImpactModal({
  isOpen,
  onClose,
  orgId,
  repositoryId,
  initialComponentId = "",
  onOpenAgentSpec,
}: ArchitecturalImpactModalProps) {
  const [selectedComponentId, setSelectedComponentId] = useState(initialComponentId);
  const [proposedChange, setProposedChange] = useState("Architectural modification and dependency update");
  const [data, setData] = useState<ArchitecturalImpactAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "tree" | "recommendation" | "components" | "boundaries" | "teams" | "coupling"
  >("overview");
  const [selectedOptionId, setSelectedOptionId] = useState<string>("opt-acl-async");
  const [codeViewTab, setCodeViewTab] = useState<"after" | "before">("after");
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [componentSearch, setComponentSearch] = useState("");

  // Real Repository File Tree & Real Code State
  const [fileTree, setFileTree] = useState<ArchitectureFileNode | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [selectedFile, setSelectedFile] = useState<ArchitectureFileNode | null>(null);
  const [fileCode, setFileCode] = useState<string>("");
  const [fileCodeLoading, setFileCodeLoading] = useState(false);
  const [treeSearchQuery, setTreeSearchQuery] = useState("");
  const [filterBadOnly, setFilterBadOnly] = useState(false);
  const [availableComponents, setAvailableComponents] = useState<
    Array<{ id: string; name: string; subsystem: string }>
  >([]);

  useEffect(() => {
    if (initialComponentId) {
      setSelectedComponentId(initialComponentId);
    }
  }, [initialComponentId]);

  // Load real file tree and graph nodes to populate component selector and GitHub explorer
  useEffect(() => {
    if (!isOpen || !orgId || !repositoryId) return;

    setTreeLoading(true);
    Promise.all([
      getArchitectureFileTree(orgId, repositoryId).catch(() => null),
      getArchitectureGraph(orgId, repositoryId).catch(() => null),
    ]).then(([treeRes, graphRes]) => {
      setTreeLoading(false);
      if (treeRes?.root) {
        setFileTree(treeRes.root);
        const initExpanded: Record<string, boolean> = { [treeRes.root.id]: true };
        const expandSmells = (n: ArchitectureFileNode, depth: number = 0) => {
          if (n.type === "directory") {
            if (n.has_bad_architecture || depth <= 1) {
              initExpanded[n.id] = true;
            }
            if (n.children) n.children.forEach((c) => expandSmells(c, depth + 1));
          }
        };
        expandSmells(treeRes.root);
        setExpandedFolders(initExpanded);

        // Find first file with smell to pre-select
        const findFirstSmellyFile = (n: ArchitectureFileNode): ArchitectureFileNode | null => {
          if (n.type === "file" && n.has_bad_architecture) return n;
          if (n.children) {
            for (const child of n.children) {
              const f = findFirstSmellyFile(child);
              if (f) return f;
            }
          }
          if (n.type === "file") return n;
          return null;
        };
        const initialF = findFirstSmellyFile(treeRes.root);
        if (initialF) {
          setSelectedFile(initialF);
          getArchitectureFileContent(orgId, repositoryId, initialF.path)
            .then((contentRes) => setFileCode(contentRes.content))
            .catch(() => setFileCode("// Error reading file content"));
        }
      }

      // Populate component list from real AST graph nodes or file tree
      const components: Array<{ id: string; name: string; subsystem: string }> = [];
      if (graphRes?.nodes && graphRes.nodes.length > 0) {
        graphRes.nodes.forEach((n) => {
          components.push({
            id: n.id,
            name: n.name || n.id,
            subsystem: n.subsystem || n.type || "Architecture Module",
          });
        });
      } else if (treeRes?.root) {
        const collectFiles = (n: ArchitectureFileNode) => {
          if (n.type === "file") {
            components.push({
              id: n.path,
              name: n.name,
              subsystem: n.has_bad_architecture ? "Smell Detected" : "Source File",
            });
          }
          if (n.children) n.children.forEach(collectFiles);
        };
        collectFiles(treeRes.root);
      }

      if (components.length > 0) {
        setAvailableComponents(components);
        // Only preselect when initialComponentId was explicitly passed from caller
        if (initialComponentId && components.some((c) => c.id === initialComponentId)) {
          setSelectedComponentId(initialComponentId);
        }
      }
    });
  }, [isOpen, orgId, repositoryId]);

  useEffect(() => {
    if (!isOpen || !orgId || !repositoryId) return;
    if (!selectedComponentId) return;

    setLoading(true);
    getArchitecturalImpactAnalysis(orgId, repositoryId, selectedComponentId, proposedChange)
      .then((res) => {
        setData(res);
        if (res.recommended_design?.alternative_patterns?.length) {
          setSelectedOptionId(res.recommended_design.alternative_patterns[0].id);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch architectural impact analysis:", err);
      })
      .finally(() => setLoading(false));
  }, [isOpen, orgId, repositoryId, selectedComponentId, proposedChange]);

  if (!isOpen) return null;

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopySummary = () => {
    if (!data) return;
    const bullets = data.consequence_bullets.join("\n");
    const text = `${data.headline}\n\n${bullets}\n\nRecommended design:\n${data.recommended_design.summary}\n\nWhy this resolves it:\n${(data.recommended_design.why_this_resolves_all_issues || []).join("\n")}`;
    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  const handleSelectFile = async (file: ArchitectureFileNode) => {
    setSelectedFile(file);
    if (file.content) {
      setFileCode(file.content);
    } else {
      try {
        setFileCodeLoading(true);
        const res = await getArchitectureFileContent(orgId, repositoryId, file.path);
        file.content = res.content;
        setFileCode(res.content);
      } catch (err) {
        console.error("Failed to load file content:", err);
        setFileCode("// Error loading file content from repository checkout.");
      } finally {
        setFileCodeLoading(false);
      }
    }
  };

  const renderExplorerTree = (node: ArchitectureFileNode, depth: number = 0) => {
    if (node.type === "directory") {
      const isExpanded = expandedFolders[node.id] ?? true;
      const hasBadChild = node.has_bad_architecture;

      if (filterBadOnly && !hasBadChild) {
        return null;
      }

      return (
        <div key={node.id} className="select-none">
          <div
            onClick={() => toggleFolder(node.id)}
            style={{ paddingLeft: `${depth * 14 + 6}px` }}
            className={`group flex cursor-pointer items-center justify-between py-1.5 pr-2 rounded-md text-[12px] transition-all ${
              hasBadChild
                ? "text-rose-400 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/15"
                : "text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)] hover:text-[var(--cd-ink)]"
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" />
              )}
              {isExpanded ? (
                <FolderOpen
                  className={`h-4 w-4 shrink-0 ${
                    hasBadChild ? "text-rose-400 animate-pulse" : "text-amber-400"
                  }`}
                />
              ) : (
                <Folder
                  className={`h-4 w-4 shrink-0 ${
                    hasBadChild ? "text-rose-400 animate-pulse" : "text-amber-400"
                  }`}
                />
              )}
              <span className="font-mono text-[12px] font-semibold truncate">
                {node.name || "root"}
              </span>
            </div>

            {hasBadChild && (
              <div className="flex items-center gap-1 shrink-0">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  {node.violation_count} smells
                </span>
              </div>
            )}
          </div>

          {isExpanded && node.children && (
            <div className="space-y-0.5 mt-0.5">
              {node.children
                .filter((child) => {
                  if (treeSearchQuery.trim()) {
                    return child.name.toLowerCase().includes(treeSearchQuery.toLowerCase());
                  }
                  return true;
                })
                .map((child) => renderExplorerTree(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    // File Node
    const isSelected = selectedFile?.id === node.id;
    const isBad = node.has_bad_architecture;
    const isAffected = data?.affected_components?.some(
      (c) => c.id === node.path || c.name === node.name || node.path.includes(c.id)
    );

    if (filterBadOnly && !isBad) {
      return null;
    }

    return (
      <div
        key={node.id}
        onClick={() => handleSelectFile(node)}
        style={{ paddingLeft: `${depth * 14 + 16}px` }}
        className={`group relative flex cursor-pointer items-center justify-between py-1.5 pr-2 rounded-md text-[12px] transition-all ${
          isSelected
            ? "bg-purple-500/20 text-purple-300 font-semibold shadow-xs ring-1 ring-purple-500/40"
            : isBad
            ? "text-rose-300 bg-rose-950/20 hover:bg-rose-900/30 border-l-2 border-rose-500"
            : isAffected
            ? "text-amber-300 bg-amber-950/20 hover:bg-amber-900/30 border-l-2 border-amber-500"
            : "text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)] hover:text-[var(--cd-ink)]"
        }`}
      >
        <div className="flex items-center gap-1.5 truncate">
          <FileCode
            className={`h-3.5 w-3.5 shrink-0 ${
              isBad
                ? "text-rose-400 animate-pulse"
                : isAffected
                ? "text-amber-400"
                : isSelected
                ? "text-purple-400"
                : "text-[var(--cd-ink-faint)]"
            }`}
          />
          <span className="font-mono text-[11.5px] truncate">{node.name}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isBad && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
          )}
          {isAffected && (
            <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[9px] font-bold text-amber-300 border border-amber-500/30">
              Blast Radius
            </span>
          )}
          {node.size ? (
            <span className="font-mono text-[10px] text-[var(--cd-ink-faint)]">
              {node.size > 1024 ? `${(node.size / 1024).toFixed(0)}KB` : `${node.size}B`}
            </span>
          ) : null}
        </div>
      </div>
    );
  };

  const filteredComponents = (data?.affected_components || []).filter(
    (c) =>
      c.name.toLowerCase().includes(componentSearch.toLowerCase()) ||
      c.id.toLowerCase().includes(componentSearch.toLowerCase()) ||
      (c.team && c.team.toLowerCase().includes(componentSearch.toLowerCase()))
  );

  const currentOption = (data?.recommended_design?.alternative_patterns || []).find(
    (opt) => opt.id === selectedOptionId
  ) || data?.recommended_design?.alternative_patterns?.[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative flex flex-col w-full max-w-5xl max-h-[92vh] rounded-2xl border border-[var(--cd-border)] bg-[var(--cd-surface)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--cd-border-soft)] px-6 py-4 bg-[var(--cd-sunken)]/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[17px] font-bold text-[var(--cd-ink)]">
                  Architectural Impact &amp; Consequence Simulation
                </h3>
                <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 text-[11px] font-bold text-purple-700 dark:text-purple-300 border border-purple-500/30">
                  Pillar 6: What-If Blast Radius
                </span>
              </div>
              <p className="text-[12px] text-[var(--cd-ink-soft)]">
                Predict downstream structural blast radius, boundary crossings, team impact, and ADR invariant violations before code changes.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-2 text-[var(--cd-ink-faint)] hover:bg-[var(--cd-sunken)] hover:text-[var(--cd-ink)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Component Selector & Scenario Bar */}
        <div className="px-6 py-3 border-b border-[var(--cd-border-soft)] bg-[var(--cd-surface)] flex flex-wrap items-center gap-4 text-[12px]">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span className="font-bold text-[var(--cd-ink-soft)]">Target Component:</span>
            <select
              value={selectedComponentId}
              onChange={(e) => setSelectedComponentId(e.target.value)}
              className="rounded-lg border border-[var(--cd-border)] bg-[var(--cd-sunken)] px-3 py-1.5 font-mono text-[12px] font-semibold text-[var(--cd-ink)] focus:border-purple-500 focus:outline-none max-w-[280px] truncate"
            >
              <option value="">-- Choose Component to Simulate --</option>
              {availableComponents.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.subsystem})
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[240px]">
            <input
              type="text"
              value={proposedChange}
              onChange={(e) => setProposedChange(e.target.value)}
              placeholder="Proposed modification description (e.g. direct storage access)..."
              className="w-full rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)] px-3 py-1.5 text-[12px] text-[var(--cd-ink)] placeholder-[var(--cd-ink-faint)] focus:border-purple-500 focus:outline-none"
            />
          </div>

          <button
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)] px-3 py-1.5 text-[11.5px] font-semibold text-[var(--cd-ink-soft)] hover:text-[var(--cd-ink)] hover:border-purple-500 transition-colors"
          >
            {copiedSummary ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedSummary ? "Copied Brief" : "Copy Brief"}</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[var(--cd-border-soft)] px-6 bg-[var(--cd-surface)] text-[12.5px] font-medium overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`cursor-pointer py-3 font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "overview"
                ? "border-purple-600 text-purple-600 dark:text-purple-400"
                : "border-transparent text-[var(--cd-ink-soft)] hover:text-[var(--cd-ink)]"
            }`}
          >
            ✨ Consequence Overview
          </button>

          <button
            onClick={() => setActiveTab("tree")}
            className={`ml-6 cursor-pointer py-3 font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "tree"
                ? "border-purple-600 text-purple-600 dark:text-purple-400"
                : "border-transparent text-[var(--cd-ink-soft)] hover:text-[var(--cd-ink)]"
            }`}
          >
            <FolderTree className="h-4 w-4" />
            <span>Complete Repo &amp; Real Code</span>
          </button>

          <button
            onClick={() => setActiveTab("recommendation")}
            className={`ml-6 cursor-pointer py-3 font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "recommendation"
                ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-[var(--cd-ink-soft)] hover:text-[var(--cd-ink)]"
            }`}
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>Recommended Design (Deep Dive)</span>
          </button>

          <button
            onClick={() => setActiveTab("components")}
            className={`ml-6 cursor-pointer py-3 font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "components"
                ? "border-purple-600 text-purple-600 dark:text-purple-400"
                : "border-transparent text-[var(--cd-ink-soft)] hover:text-[var(--cd-ink)]"
            }`}
          >
            <Box className="h-4 w-4" />
            <span>Affected Components ({data?.affected_components_count ?? 0})</span>
          </button>

          <button
            onClick={() => setActiveTab("boundaries")}
            className={`ml-6 cursor-pointer py-3 font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "boundaries"
                ? "border-purple-600 text-purple-600 dark:text-purple-400"
                : "border-transparent text-[var(--cd-ink-soft)] hover:text-[var(--cd-ink)]"
            }`}
          >
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            <span>Boundaries Crossed ({data?.boundaries_crossed_count ?? 0})</span>
          </button>

          <button
            onClick={() => setActiveTab("teams")}
            className={`ml-6 cursor-pointer py-3 font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "teams"
                ? "border-purple-600 text-purple-600 dark:text-purple-400"
                : "border-transparent text-[var(--cd-ink-soft)] hover:text-[var(--cd-ink)]"
            }`}
          >
            <Users className="h-4 w-4 text-blue-500" />
            <span>Impacted Teams ({data?.teams_impacted_count ?? 0})</span>
          </button>

          <button
            onClick={() => setActiveTab("coupling")}
            className={`ml-6 cursor-pointer py-3 font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "coupling"
                ? "border-purple-600 text-purple-600 dark:text-purple-400"
                : "border-transparent text-[var(--cd-ink-soft)] hover:text-[var(--cd-ink)]"
            }`}
          >
            <Flame className="h-4 w-4 text-rose-500" />
            <span>Coupling &amp; ADR Invariants</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* GitHub-style Complete Repo Tree & Real Code Explorer Tab */}
          {activeTab === "tree" && (
            <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 h-[580px] border border-[var(--cd-border-soft)] rounded-xl overflow-hidden bg-[var(--cd-surface)]">
              {/* Left: Complete Directory Tree */}
              <div className="flex flex-col border-r border-[var(--cd-border-soft)] bg-[var(--cd-sunken)]/40 overflow-hidden">
                <div className="p-3 border-b border-[var(--cd-border-soft)] space-y-2">
                  <div className="flex items-center justify-between text-[11.5px] font-bold text-[var(--cd-ink)]">
                    <span>Repository File Tree</span>
                    <span className="text-[10px] text-[var(--cd-ink-faint)]">Complete Structure</span>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[var(--cd-ink-faint)]" />
                    <input
                      type="text"
                      placeholder="Filter files..."
                      value={treeSearchQuery}
                      onChange={(e) => setTreeSearchQuery(e.target.value)}
                      className="w-full rounded-md border border-[var(--cd-border-soft)] bg-[var(--cd-surface)] pl-8 pr-2.5 py-1 text-[11px] text-[var(--cd-ink)] focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <button
                    onClick={() => setFilterBadOnly((v) => !v)}
                    className={`w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded-md text-[10.5px] font-semibold transition-all cursor-pointer ${
                      filterBadOnly
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                        : "bg-[var(--cd-surface)] text-[var(--cd-ink-soft)] border border-[var(--cd-border-soft)] hover:bg-[var(--cd-sunken)]"
                    }`}
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                    <span>{filterBadOnly ? "Showing Smells Only" : "Show All (Highlight Smells)"}</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-0.5 font-mono text-[11.5px]">
                  {treeLoading ? (
                    <div className="py-8 text-center text-[var(--cd-ink-faint)]">
                      <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-purple-500" />
                      Scanning repository files...
                    </div>
                  ) : fileTree ? (
                    renderExplorerTree(fileTree, 0)
                  ) : (
                    <div className="py-8 text-center text-[var(--cd-ink-faint)]">
                      No repository files found.
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Exact Real Code Viewer */}
              <div className="flex flex-col overflow-hidden bg-[var(--cd-surface)]">
                {selectedFile ? (
                  <>
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--cd-border-soft)] bg-[var(--cd-sunken)]/60 text-[12px]">
                      <div className="flex items-center gap-2 truncate">
                        <FileCode className="h-4 w-4 text-purple-600 shrink-0" />
                        <span className="font-mono font-bold text-[var(--cd-ink)] truncate">
                          {selectedFile.path}
                        </span>
                        <span className="rounded bg-[var(--cd-surface)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--cd-ink-faint)] border border-[var(--cd-border-soft)]">
                          {getLanguageFromPath(selectedFile.path)}
                        </span>
                        {selectedFile.has_bad_architecture && (
                          <span className="flex items-center gap-1 rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-500/30">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                            </span>
                            Architectural Smell
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setSelectedComponentId(selectedFile.path);
                            setActiveTab("overview");
                          }}
                          className="cursor-pointer rounded-md bg-purple-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-purple-700 transition-colors shadow-xs"
                        >
                          Simulate Blast Radius for this File
                        </button>
                      </div>
                    </div>

                    {selectedFile.violations && selectedFile.violations.length > 0 && (
                      <div className="p-3 bg-rose-500/10 border-b border-rose-500/20 text-[11.5px] text-rose-300 space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                          <span>Detected Architectural Smells / Violations ({selectedFile.violations.length}):</span>
                        </div>
                        {selectedFile.violations.map((v, i) => (
                          <div key={i} className="pl-5 text-[11px] text-rose-200/90 font-mono">
                            • [{v.category || "Violation"}] {v.description || v.title}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex-1 overflow-auto p-4 font-mono text-[12px] leading-relaxed bg-[#0d1117] text-[#c9d1d9]">
                      {fileCodeLoading ? (
                        <div className="py-12 text-center text-[#8b949e]">
                          <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-purple-400" />
                          Loading exact source code...
                        </div>
                      ) : (
                        <pre className="overflow-x-auto whitespace-pre">
                          {fileCode ? (
                            fileCode.split("\n").map((line, idx) => (
                              <div key={idx} className="table-row hover:bg-white/5">
                                <span className="table-cell pr-4 text-right select-none text-[#484f58] w-10 text-[11px]">
                                  {idx + 1}
                                </span>
                                <span className="table-cell">{line || " "}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-[#8b949e]">// Empty file</span>
                          )}
                        </pre>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8 text-[var(--cd-ink-faint)]">
                    <FileCode className="h-10 w-10 opacity-30 text-purple-500 mb-2" />
                    <p className="text-[13px] font-semibold text-[var(--cd-ink)]">Select a file to view exact code</p>
                    <p className="text-[11.5px] mt-1 max-w-sm">
                      Browse the complete repository tree on the left. Files with blinking red indicators contain architectural violations or anti-patterns.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab !== "tree" && loading ? (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <RefreshCw className="h-7 w-7 animate-spin text-purple-600 dark:text-purple-400" />
              <p className="mt-3 text-[13px] font-semibold text-[var(--cd-ink)]">
                Simulating architectural cascade & boundary crossings...
              </p>
              <p className="mt-1 text-[11.5px] text-[var(--cd-ink-faint)]">
                Evaluating dependency graph traversal, layer isolation rules, and ADR invariants
              </p>
            </div>
          ) : activeTab === "tree" ? null : !selectedComponentId || !data ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center max-w-lg mx-auto">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 mb-4 shadow-sm">
                <Sliders className="h-7 w-7" />
              </div>
              <h4 className="text-[16px] font-bold text-[var(--cd-ink)] mb-1">
                Select a Component to Simulate Architectural Impact
              </h4>
              <p className="text-[12.5px] leading-relaxed text-[var(--cd-ink-soft)] mb-5">
                Choose a target module from the dropdown above, or browse the complete repository tree to run a deterministic What-If blast radius simulation without modifying live code.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => setActiveTab("tree")}
                  className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-[12px] font-bold text-white hover:bg-purple-700 transition-colors shadow-xs cursor-pointer"
                >
                  <FolderTree className="h-4 w-4" />
                  <span>Browse Repository File Tree</span>
                </button>
                {availableComponents.length > 0 && (
                  <button
                    onClick={() => {
                      const smelly = availableComponents.find((c) => c.subsystem?.toLowerCase().includes("smell")) || availableComponents[0];
                      if (smelly) setSelectedComponentId(smelly.id);
                    }}
                    className="flex items-center gap-2 rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] px-4 py-2 text-[12px] font-semibold text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)] transition-colors cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    <span>Simulate First Flagged Component</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW & THE 5 CONSEQUENCE BULLETS */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Primary Architectural Consequence Card */}
                  <div className="rounded-2xl border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-[var(--cd-surface)] to-[var(--cd-sunken)] p-5 shadow-sm space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-mono font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                          Change Consequence Intelligence
                        </span>
                        {data.normalized_intervention && (
                          <span className="rounded bg-purple-500/20 px-2 py-0.5 font-mono text-[10.5px] font-bold text-purple-700 dark:text-purple-300 border border-purple-500/30">
                            Intervention: {data.normalized_intervention}
                          </span>
                        )}
                      </div>
                      <span className="rounded-full bg-rose-500/20 px-3 py-0.5 text-[11px] font-bold text-rose-700 dark:text-rose-300 border border-rose-500/30">
                        ⚠️ High Architectural Risk
                      </span>
                    </div>

                    {/* Headline Prompt */}
                    <div className="text-[18px] font-extrabold text-[var(--cd-ink)]">
                      {data.headline}
                    </div>

                    {/* The 5 Exact Consequence Bullet Points */}
                    <div className="rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-surface)]/80 p-4 font-mono text-[13.5px] leading-relaxed space-y-2.5">
                      {data.consequence_bullets.map((bullet, idx) => {
                        let colorClass = "text-rose-600 dark:text-rose-400";
                        if (bullet.includes("boundaries")) colorClass = "text-amber-600 dark:text-amber-400";
                        if (bullet.includes("teams")) colorClass = "text-blue-600 dark:text-blue-400";
                        if (bullet.includes("coupling")) colorClass = "text-rose-600 dark:text-rose-400";
                        if (bullet.includes("ADR")) colorClass = "text-purple-600 dark:text-purple-400 font-bold";

                        return (
                          <div key={idx} className={`flex items-start gap-2 font-semibold ${colorClass}`}>
                            <span>{bullet}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Multi-Dimensional Confidence Breakdown Card */}
                  <div className="rounded-2xl border border-[var(--cd-border-soft)] bg-[var(--cd-surface)] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-purple-500" />
                        <span className="text-[12.5px] font-bold text-[var(--cd-ink)]">
                          Multi-Dimensional Confidence Assessment
                        </span>
                      </div>
                      <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10.5px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                        Overall Confidence: {data.confidence?.overall || "HIGH"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-[11.5px]">
                      <div className="p-3 rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)]/50 space-y-1">
                        <div className="text-[10px] text-[var(--cd-ink-faint)] uppercase font-semibold">Structural Confidence</div>
                        <div className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400">
                          {data.confidence?.structural_confidence || "HIGH"}
                        </div>
                        <p className="text-[10.5px] text-[var(--cd-ink-soft)] font-sans">
                          Deterministic graph topology parsed from repository AST imports.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)]/50 space-y-1">
                        <div className="text-[10px] text-[var(--cd-ink-faint)] uppercase font-semibold">Evidence Confidence</div>
                        <div className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400">
                          {data.confidence?.evidence_confidence || "HIGH"}
                        </div>
                        <p className="text-[10.5px] text-[var(--cd-ink-soft)] font-sans">
                          Validated against concrete call sites, file references, and ADR invariant rules.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)]/50 space-y-1">
                        <div className="text-[10px] text-[var(--cd-ink-faint)] uppercase font-semibold">Runtime Confidence</div>
                        <div className="text-[13px] font-bold text-slate-500 dark:text-slate-400">
                          {data.confidence?.runtime_confidence || "UNKNOWN"}
                        </div>
                        <p className="text-[10.5px] text-[var(--cd-ink-soft)] font-sans">
                          Static analysis only; no dynamic traces or production traffic.
                        </p>
                      </div>
                    </div>

                    {data.confidence?.rationale && (
                      <p className="text-[11.5px] text-[var(--cd-ink-soft)] italic pt-1 border-t border-[var(--cd-border-soft)]">
                        {data.confidence.rationale}
                      </p>
                    )}
                  </div>

                  {/* Deterministic Blast Radius & Impact Counter Matrix (No Arbitrary %) */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-center font-mono text-[11.5px]">
                    <div className="rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-surface)] p-3">
                      <div className="text-[10px] text-[var(--cd-ink-faint)] uppercase font-semibold">Direct Impact</div>
                      <div className="text-[18px] font-bold text-rose-600">
                        {data.direct_impact_count ?? data.affected_components.filter((c) => c.relationship === "direct").length}
                      </div>
                      <div className="text-[9.5px] text-[var(--cd-ink-faint)]">Immediate Deps</div>
                    </div>

                    <div className="rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-surface)] p-3">
                      <div className="text-[10px] text-[var(--cd-ink-faint)] uppercase font-semibold">Transitive Impact</div>
                      <div className="text-[18px] font-bold text-amber-600">
                        {data.indirect_impact_count ?? data.affected_components.filter((c) => c.relationship === "transitive").length}
                      </div>
                      <div className="text-[9.5px] text-[var(--cd-ink-faint)]">Multi-hop Cascade</div>
                    </div>

                    <div className="rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-surface)] p-3">
                      <div className="text-[10px] text-[var(--cd-ink-faint)] uppercase font-semibold">BFS Paths</div>
                      <div className="text-[18px] font-bold text-purple-600">
                        {data.propagation_paths_count ?? (data.propagation_paths?.length ?? 0)}
                      </div>
                      <div className="text-[9.5px] text-[var(--cd-ink-faint)]">Unweighted Routes</div>
                    </div>

                    <div className="rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-surface)] p-3">
                      <div className="text-[10px] text-[var(--cd-ink-faint)] uppercase font-semibold">Boundaries</div>
                      <div className="text-[18px] font-bold text-amber-600">
                        {data.boundaries_crossed_count}
                      </div>
                      <div className="text-[9.5px] text-[var(--cd-ink-faint)]">Cross-Tier Breaches</div>
                    </div>

                    <div className="rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-surface)] p-3">
                      <div className="text-[10px] text-[var(--cd-ink-faint)] uppercase font-semibold">Teams Impacted</div>
                      <div className="text-[18px] font-bold text-blue-600">
                        {data.teams_impacted_count}
                      </div>
                      <div className="text-[9.5px] text-[var(--cd-ink-faint)]">Domain Owners</div>
                    </div>

                    <div className="rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-surface)] p-3">
                      <div className="text-[10px] text-[var(--cd-ink-faint)] uppercase font-semibold">ADR Invariants</div>
                      <div className="text-[18px] font-bold text-rose-600">
                        {data.constraints_affected_count ?? (data.adr_violations?.length ?? 0)}
                      </div>
                      <div className="text-[9.5px] text-[var(--cd-ink-faint)]">Violations Flagged</div>
                    </div>
                  </div>

                  {/* Empirical Evidence Ledger */}
                  {data.evidence && data.evidence.length > 0 && (
                    <div className="rounded-2xl border border-[var(--cd-border-soft)] bg-[var(--cd-surface)] p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-purple-500" />
                          <span className="text-[12.5px] font-bold text-[var(--cd-ink)]">
                            Empirical Evidence Ledger ({data.evidence.length} items)
                          </span>
                        </div>
                        <span className="text-[10.5px] text-[var(--cd-ink-faint)] font-mono">
                          Deterministic AST Provenance
                        </span>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {data.evidence.map((ev, idx) => (
                          <div
                            key={idx}
                            className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 p-2.5 rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)]/40 font-mono text-[11px]"
                          >
                            <div className="space-y-0.5 truncate max-w-xl">
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-600 dark:text-purple-300 font-bold uppercase text-[9px]">
                                  {ev.source_type}
                                </span>
                                <span className="font-bold text-[var(--cd-ink)] truncate">
                                  {ev.repository_path || ev.entity_id}
                                </span>
                              </div>
                              <div className="text-[10.5px] text-[var(--cd-ink-soft)] font-sans">
                                {ev.relation_to_claim}: <code className="text-purple-600 dark:text-purple-400 font-mono">{ev.excerpt_or_reference}</code>
                              </div>
                            </div>
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                              {ev.evidence_strength}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Recommended Design Box */}
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-[14px] text-emerald-800 dark:text-emerald-200">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        <span>Recommended design:</span>
                      </div>
                      <button
                        onClick={() => setActiveTab("recommendation")}
                        className="cursor-pointer rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors flex items-center gap-1"
                      >
                        <span>Open Full Design Blueprint</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="text-[14px] font-bold text-[var(--cd-ink)]">
                      {data.recommended_design.pattern_name}
                    </div>

                    <p className="text-[13px] leading-relaxed text-[var(--cd-ink-soft)] font-medium">
                      {data.recommended_design.summary}
                    </p>

                    {/* Why This Resolves All 5 Issues Matrix */}
                    {data.recommended_design.why_this_resolves_all_issues && (
                      <div className="space-y-2 pt-2 border-t border-emerald-500/20">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--cd-ink-faint)]">
                          How this resolves the 5 architectural consequences:
                        </div>
                        <div className="space-y-1.5 text-[12px] text-[var(--cd-ink-soft)]">
                          {data.recommended_design.why_this_resolves_all_issues.map((r, idx) => (
                            <div key={idx} className="flex items-start gap-2 bg-[var(--cd-surface)] p-2.5 rounded-lg border border-[var(--cd-border-soft)]">
                              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                              <span>{r}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: DEEP DIVE RECOMMENDED DESIGN & OPTIONS */}
              {activeTab === "recommendation" && (
                <div className="space-y-6">
                  {/* Pattern Header & Options Selector */}
                  <div className="space-y-3">
                    <div className="text-[12px] font-bold uppercase tracking-wider text-[var(--cd-ink-faint)]">
                      Architectural Recommendation Options
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {(data.recommended_design.alternative_patterns || []).map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setSelectedOptionId(opt.id)}
                          className={`cursor-pointer rounded-xl border p-3.5 text-left transition-all ${
                            selectedOptionId === opt.id
                              ? "border-emerald-500 bg-emerald-500/10 shadow-sm"
                              : "border-[var(--cd-border-soft)] bg-[var(--cd-surface)] hover:bg-[var(--cd-sunken)]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-[13px] text-[var(--cd-ink)] truncate">{opt.name}</span>
                            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300">
                              Fit {opt.fit_score}%
                            </span>
                          </div>
                          <div className="mt-1 text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-300">
                            {opt.tag}
                          </div>
                          <p className="mt-1.5 text-[11.5px] line-clamp-2 text-[var(--cd-ink-soft)]">
                            {opt.summary}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selected Option Details */}
                  {currentOption && (
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-[16px] font-bold text-[var(--cd-ink)]">{currentOption.name}</h4>
                            <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10.5px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                              {currentOption.tag}
                            </span>
                          </div>
                          <p className="mt-1 text-[12.5px] text-[var(--cd-ink-soft)]">
                            {currentOption.summary}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="rounded bg-[var(--cd-surface)] px-2.5 py-1 border border-[var(--cd-border-soft)] text-emerald-600 font-bold">
                            {currentOption.boundary_violations_resolved} Boundaries Resolved
                          </span>
                          <span className="rounded bg-[var(--cd-surface)] px-2.5 py-1 border border-[var(--cd-border-soft)] text-purple-600 font-bold">
                            {currentOption.coupling_impact}
                          </span>
                        </div>
                      </div>

                      {/* Before (Antipattern) vs After (Clean) Code Diffs */}
                      <div className="space-y-3 pt-2 border-t border-emerald-500/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setCodeViewTab("after")}
                              className={`cursor-pointer px-3 py-1 rounded-lg text-[11.5px] font-bold transition-all flex items-center gap-1.5 ${
                                codeViewTab === "after"
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "bg-[var(--cd-sunken)] text-[var(--cd-ink-soft)] hover:text-[var(--cd-ink)]"
                              }`}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>✅ Recommended Architecture</span>
                            </button>
                            <button
                              onClick={() => setCodeViewTab("before")}
                              className={`cursor-pointer px-3 py-1 rounded-lg text-[11.5px] font-bold transition-all flex items-center gap-1.5 ${
                                codeViewTab === "before"
                                  ? "bg-rose-600 text-white shadow-xs"
                                  : "bg-[var(--cd-sunken)] text-[var(--cd-ink-soft)] hover:text-[var(--cd-ink)]"
                              }`}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              <span>❌ Violating Antipattern</span>
                            </button>
                          </div>

                          <button
                            onClick={() =>
                              handleCopyCode(
                                codeViewTab === "after"
                                  ? currentOption.code_snippet || data.recommended_design.after_code || ""
                                  : data.recommended_design.before_code || ""
                              )
                            }
                            className="flex items-center gap-1 text-[11.5px] text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                          >
                            {copiedCode ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            <span>{copiedCode ? "Copied" : "Copy Code"}</span>
                          </button>
                        </div>

                        <pre className="rounded-xl border border-[var(--cd-border-soft)] bg-slate-950 p-4 font-mono text-[11.5px] overflow-x-auto">
                          <code className={codeViewTab === "after" ? "text-emerald-400" : "text-rose-400"}>
                            {codeViewTab === "after"
                              ? currentOption.code_snippet || data.recommended_design.after_code
                              : data.recommended_design.before_code}
                          </code>
                        </pre>
                      </div>

                      {/* Architectural Blueprint Flow */}
                      <div className="space-y-2 pt-2 border-t border-emerald-500/20">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--cd-ink-faint)]">
                          Decoupled Structural Flow Blueprint
                        </div>
                        <div className="rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)] p-4 font-mono text-[11.5px] text-[var(--cd-ink)] overflow-x-auto whitespace-pre">
                          {data.recommended_design.architectural_blueprint}
                        </div>
                      </div>

                      {/* Step by step implementation guidance */}
                      <div className="space-y-2 pt-2 border-t border-emerald-500/20">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--cd-ink-faint)]">
                          Step-by-Step Implementation Roadmap
                        </div>
                        <ul className="space-y-1.5 text-[12px] text-[var(--cd-ink-soft)]">
                          {data.recommended_design.step_by_step_guidance.map((step, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                {idx + 1}
                              </span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Trade-offs */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-emerald-500/20 text-[11.5px]">
                        {data.recommended_design.tradeoffs.map((t, idx) => (
                          <div key={idx} className="rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-surface)] p-2.5 text-[var(--cd-ink-soft)]">
                            {t}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: 17 AFFECTED COMPONENTS */}
              {activeTab === "components" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--cd-ink-faint)]" />
                      <input
                        type="text"
                        value={componentSearch}
                        onChange={(e) => setComponentSearch(e.target.value)}
                        placeholder="Search affected components, depth, or team..."
                        className="w-full rounded-xl border border-[var(--cd-border)] bg-[var(--cd-sunken)] pl-9 pr-4 py-2 text-[12.5px] text-[var(--cd-ink)] placeholder-[var(--cd-ink-faint)] focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                    <div className="text-[12px] font-bold text-[var(--cd-ink-soft)]">
                      Showing {filteredComponents.length} of {data.affected_components.length} components
                    </div>
                  </div>

                  <div className="space-y-2">
                    {filteredComponents.map((c) => {
                      const propPath = (data.propagation_paths || []).find(
                        (p) => p.target_id === c.id || p.target_name === c.name
                      );
                      const matchedNode = findNodeByPath(fileTree, c.id);

                      return (
                        <div
                          key={c.id}
                          className="rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-surface)] p-3.5 hover:bg-[var(--cd-sunken)] transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[13px] text-[var(--cd-ink)]">{c.name}</span>
                              <span className="font-mono text-[10.5px] text-[var(--cd-ink-faint)]">({c.id})</span>
                              <span className="rounded bg-[var(--cd-sunken)] px-2 py-0.5 text-[10px] font-bold text-[var(--cd-ink-soft)]">
                                Depth {c.impact_depth} ({c.relationship})
                              </span>
                            </div>
                            <p className="text-[11.5px] text-[var(--cd-ink-soft)]">{c.reason}</p>

                            {propPath && propPath.path_nodes && propPath.path_nodes.length > 1 && (
                              <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[10.5px] text-[var(--cd-ink-soft)] bg-[var(--cd-sunken)]/60 px-2.5 py-1 rounded-lg border border-[var(--cd-border-soft)]">
                                <GitBranch className="h-3 w-3 text-purple-500 shrink-0" />
                                <span className="text-[var(--cd-ink-faint)]">BFS Route ({propPath.hops} {propPath.hops === 1 ? "hop" : "hops"}):</span>
                                <span className="truncate text-purple-600 dark:text-purple-300 font-semibold">
                                  {propPath.path_nodes.join(" → ")}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center gap-3 text-[11px] text-[var(--cd-ink-faint)]">
                              <span>Subsystem: <strong className="text-[var(--cd-ink-soft)]">{c.subsystem}</strong></span>
                              <span>•</span>
                              <span>Team: <strong className="text-[var(--cd-ink-soft)]">{c.team}</strong></span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {matchedNode && (
                              <button
                                onClick={() => {
                                  handleSelectFile(matchedNode);
                                  setActiveTab("tree");
                                }}
                                className="flex items-center gap-1 rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)] px-2.5 py-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:border-purple-500 transition-colors cursor-pointer"
                              >
                                <FolderTree className="h-3 w-3" />
                                <span>Inspect in Tree</span>
                              </button>
                            )}

                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                                c.impact_level === "high"
                                  ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30"
                                  : c.impact_level === "medium"
                                  ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                  : "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30"
                              }`}
                            >
                              {c.impact_level} impact
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 4: BOUNDARIES CROSSED */}
              {activeTab === "boundaries" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-[12.5px] text-amber-900 dark:text-amber-200">
                    Modifying <strong>{data.component_name}</strong> in the proposed way crosses{" "}
                    <strong>{data.boundaries_crossed_count} strict architectural {data.boundaries_crossed_count === 1 ? "boundary" : "boundaries"}</strong>.
                    Direct cross-tier calls introduce tight coupling and bypass domain invariants.
                  </div>

                  <div className="space-y-3">
                    {data.boundaries_crossed.map((b) => (
                      <div
                        key={b.boundary_id}
                        className="rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-surface)] p-4 space-y-2.5 shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-rose-500/20 px-2 py-0.5 font-mono text-[10.5px] font-bold text-rose-700 dark:text-rose-300">
                              {b.boundary_id}
                            </span>
                            <h4 className="font-bold text-[13.5px] text-[var(--cd-ink)]">{b.boundary_name}</h4>
                          </div>
                          <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase text-rose-700 dark:text-rose-300 border border-rose-500/30">
                            {b.severity} breach
                          </span>
                        </div>

                        <div className="flex items-center gap-2 font-mono text-[11.5px] text-[var(--cd-ink-soft)] bg-[var(--cd-sunken)] p-2 rounded-lg">
                          <span className="text-blue-600 dark:text-blue-400 font-semibold">{b.from_layer}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-rose-500" />
                          <span className="text-rose-600 dark:text-rose-400 font-semibold">{b.to_layer}</span>
                        </div>

                        <div className="text-[12px] text-[var(--cd-ink-soft)] leading-relaxed">
                          <strong>Rule Violated:</strong> {b.rule_violated}
                        </div>

                        <div className="text-[11.5px] text-[var(--cd-ink-faint)] leading-relaxed pt-1 border-t border-[var(--cd-border-soft)]">
                          <strong>Consequence:</strong> {b.impact_explanation}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: TEAMS IMPACTED */}
              {activeTab === "teams" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-[12.5px] text-blue-900 dark:text-blue-200">
                    This change impacts <strong>{data.teams_impacted_count} separate engineering {data.teams_impacted_count === 1 ? "team" : "teams"}</strong>.
                    Changes require mandatory architectural review and sign-off before deployment to avoid cross-domain regressions.
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.teams_impacted.map((team, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-surface)] p-4 space-y-3 shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <h4 className="font-bold text-[13.5px] text-[var(--cd-ink)]">{team.team_name}</h4>
                          </div>
                          {team.review_required && (
                            <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 border border-amber-500/30">
                              Review Required
                            </span>
                          )}
                        </div>

                        <p className="text-[12px] leading-relaxed text-[var(--cd-ink-soft)] font-medium">
                          {team.impact_summary}
                        </p>

                        <div className="text-[11px] text-[var(--cd-ink-faint)] space-y-1 pt-2 border-t border-[var(--cd-border-soft)]">
                          <div>Subsystems Owned: <strong className="text-[var(--cd-ink-soft)] font-mono">{team.subsystems_owned.join(", ")}</strong></div>
                          <div>Lead Contact: <strong className="text-purple-600 dark:text-purple-400">{team.lead_contact}</strong></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 6: COUPLING TELEMETRY & ADR-12 INVARIANT */}
              {activeTab === "coupling" && (
                <div className="space-y-6">
                  {/* Coupling Telemetry Shift */}
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-[14px] text-rose-800 dark:text-rose-200">
                        <Flame className="h-5 w-5 text-rose-600 animate-pulse" />
                        <span>Coupling Telemetry: This increases coupling</span>
                      </div>
                      <span className="rounded bg-rose-500/20 px-2.5 py-0.5 font-mono text-[11px] font-bold text-rose-800 dark:text-rose-200">
                        Velocity: +36% Δ/commit
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center font-mono text-[11.5px]">
                      <div className="rounded-lg border border-rose-500/20 bg-[var(--cd-surface)] p-2.5">
                        <div className="text-[10px] text-[var(--cd-ink-faint)]">Instability (I) Before</div>
                        <div className="font-bold text-emerald-600 text-[14px]">I = {data.coupling_shift.current_instability}</div>
                        <div className="text-[9.5px] text-[var(--cd-ink-faint)]">Stable Domain</div>
                      </div>
                      <div className="rounded-lg border border-rose-500/20 bg-[var(--cd-surface)] p-2.5">
                        <div className="text-[10px] text-[var(--cd-ink-faint)]">Instability (I) After</div>
                        <div className="font-bold text-rose-600 text-[14px]">I = {data.coupling_shift.projected_instability}</div>
                        <div className="text-[9.5px] text-[var(--cd-ink-faint)]">Volatile & Coupled</div>
                      </div>
                      <div className="rounded-lg border border-rose-500/20 bg-[var(--cd-surface)] p-2.5">
                        <div className="text-[10px] text-[var(--cd-ink-faint)]">Efferent Fan-Out (Ce)</div>
                        <div className="font-bold text-amber-600 text-[14px]">{data.coupling_shift.fan_out_before} → {data.coupling_shift.fan_out_after}</div>
                        <div className="text-[9.5px] text-[var(--cd-ink-faint)]">+4 Outward Deps</div>
                      </div>
                      <div className="rounded-lg border border-rose-500/20 bg-[var(--cd-surface)] p-2.5">
                        <div className="text-[10px] text-[var(--cd-ink-faint)]">Coupling Shift Δ</div>
                        <div className="font-bold text-rose-600 text-[14px]">+{data.coupling_shift.delta_instability}</div>
                        <div className="text-[9.5px] text-[var(--cd-ink-faint)]">Elevated Risk</div>
                      </div>
                    </div>

                    <p className="text-[12px] leading-relaxed text-[var(--cd-ink-soft)]">
                      {data.coupling_shift.explanation}
                    </p>
                  </div>

                  {/* ADR-12 Violation Detail */}
                  <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-[14px] text-purple-800 dark:text-purple-200">
                        <FileText className="h-5 w-5 text-purple-600" />
                        <span>Violates Architectural Decision: {data.adr_violations[0]?.adr_id}</span>
                      </div>
                      <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[10.5px] font-bold text-rose-700 dark:text-rose-300 border border-rose-500/30">
                        Critical Invariant Breach
                      </span>
                    </div>

                    <h4 className="font-bold text-[13px] text-[var(--cd-ink)]">
                      {data.adr_violations[0]?.adr_title}
                    </h4>

                    <p className="text-[12px] leading-relaxed text-[var(--cd-ink-soft)]">
                      {data.adr_violations[0]?.violation_reason}
                    </p>

                    <div className="rounded-lg bg-[var(--cd-sunken)] p-3 text-[11.5px] text-[var(--cd-ink-soft)] font-mono">
                      <strong>Prescribed Architecture Invariant:</strong> {data.adr_violations[0]?.prescribed_pattern}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-[var(--cd-border-soft)] px-6 py-4 bg-[var(--cd-sunken)]/50">
          <div className="text-[11.5px] text-[var(--cd-ink-faint)]">
            Coodara Architecture Intelligence Engine • Pillar 6 Blast Radius
          </div>

          <div className="flex items-center gap-3">
            {onOpenAgentSpec && data && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAgentSpec(
                    `Implement ${data.recommended_design.pattern_name} for ${data.component_name} to satisfy boundary invariants and decouple dependencies.`
                  );
                }}
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-[12.5px] font-bold text-white shadow-xs hover:bg-purple-700 transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                <span>🤖 Send Recommended Design Spec to Agent</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="cursor-pointer rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] px-4 py-2 text-[12.5px] font-semibold text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)] transition-colors"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
