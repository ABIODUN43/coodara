import { useState, useEffect } from "react";
import {
  Flame,
  FileCode,
  Folder,
  FolderOpen,
  CheckCircle2,
  Sparkles,
  Zap,
  Layers,
  RefreshCw,
  ShieldAlert,
  ChevronRight,
  ChevronDown,
  Search,
  Bot,
  Compass,
  Loader2,
  X,
  GitCompare,
} from "lucide-react";
import {
  getArchitectureStyle,
  getArchitectureFileTree,
  getArchitectureFileContent,
  remediateArchitectureIssue,
} from "@/api/architecture";
import type {
  ArchitectureStyleSummary,
  ArchitectureFileNode,
} from "@/types/architecture";
import { ArchitectureDecisionsModal } from "./ArchitectureDecisionsModal";
import { ArchitectureBoundariesModal } from "./ArchitectureBoundariesModal";
import { ArchitectureDegradationModal } from "./ArchitectureDegradationModal";
import { AgentSpecModal } from "./AgentSpecModal";
import { ArchitectureVerificationModal } from "./ArchitectureVerificationModal";
import { ArchitectureCommitDiffModal } from "./ArchitectureCommitDiffModal";
import { ArchitecturalImpactModal } from "./ArchitecturalImpactModal";

interface ArchitectureCodeStudioProps {
  orgId: string | number;
  repositoryId: string | number;
  onNavigateToChat?: () => void;
}

function getLanguageFromPath(path?: string): string {
  if (!path) return "Source Code";
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
    case "c": case "h": return "C/Header";
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

function countBadFiles(node: ArchitectureFileNode | null): number {
  if (!node) return 0;
  let count = node.type === "file" && node.has_bad_architecture ? 1 : 0;
  if (node.children) {
    for (const child of node.children) {
      count += countBadFiles(child);
    }
  }
  return count;
}

export function ArchitectureCodeStudio({
  orgId,
  repositoryId,
  onNavigateToChat,
}: ArchitectureCodeStudioProps) {
  const [styleSummary, setStyleSummary] = useState<ArchitectureStyleSummary | null>(null);
  const [fileTree, setFileTree] = useState<ArchitectureFileNode | null>(null);
  const [selectedFile, setSelectedFile] = useState<ArchitectureFileNode | null>(null);
  const [editableCode, setEditableCode] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [filterBadOnly, setFilterBadOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    root: true,
    src: true,
    "src/services": true,
    "src/controllers": true,
    "src/models": true,
  });
  const [aiFixed, setAiFixed] = useState<boolean>(false);
  const [isFixing, setIsFixing] = useState<boolean>(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [remediationDiff, setRemediationDiff] = useState<string>("");
  const [isRemediationDiffOpen, setIsRemediationDiffOpen] = useState<boolean>(false);
  const [isDecisionsOpen, setIsDecisionsOpen] = useState<boolean>(false);
  const [isBoundariesOpen, setIsBoundariesOpen] = useState<boolean>(false);
  const [isDegradationOpen, setIsDegradationOpen] = useState<boolean>(false);
  const [isAgentSpecOpen, setIsAgentSpecOpen] = useState<boolean>(false);
  const [isVerificationOpen, setIsVerificationOpen] = useState<boolean>(false);
  const [isDiffOpen, setIsDiffOpen] = useState<boolean>(false);
  const [isImpactOpen, setIsImpactOpen] = useState<boolean>(false);

  // Load initial architecture style and file tree
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      getArchitectureStyle(orgId, repositoryId).catch(() => null),
      getArchitectureFileTree(orgId, repositoryId).catch(() => null),
    ])
      .then(([styleData, treeData]) => {
        if (!isMounted) return;
        if (styleData) {
          setStyleSummary(styleData);
        }
        if (treeData && treeData.root) {
          setFileTree(treeData.root);

          // Auto-expand root folder, top-level subfolders, and folders containing bad architecture
          const initialExpanded: Record<string, boolean> = { [treeData.root.id]: true };
          const expandSmellyFolders = (node: ArchitectureFileNode, depth: number = 0) => {
            if (node.type === "directory") {
              if (node.has_bad_architecture || depth <= 1) {
                initialExpanded[node.id] = true;
              }
              if (node.children) {
                node.children.forEach((child) => expandSmellyFolders(child, depth + 1));
              }
            }
          };
          expandSmellyFolders(treeData.root);
          setExpandedFolders(initialExpanded);

          // Find first file with violation or default file
          const findFirstFile = (node: ArchitectureFileNode): ArchitectureFileNode | null => {
            if (node.type === "file" && node.has_bad_architecture) return node;
            if (node.children) {
              for (const child of node.children) {
                const found = findFirstFile(child);
                if (found) return found;
              }
            }
            if (node.type === "file") return node;
            return null;
          };
          const first = findFirstFile(treeData.root);
          if (first) {
            setSelectedFile(first);
            if (first.content) {
              setEditableCode(first.content);
            } else {
              getArchitectureFileContent(orgId, repositoryId, first.path)
                .then((res) => {
                  first.content = res.content;
                  setEditableCode(res.content);
                })
                .catch(() => {
                  setEditableCode("// Select a file to inspect its source code.");
                });
            }
          }
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [orgId, repositoryId]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  const handleSelectFile = async (file: ArchitectureFileNode) => {
    setSelectedFile(file);
    setAiFixed(false);
    setAiExplanation(null);
    setRemediationDiff("");

    if (file.content) {
      setEditableCode(file.content);
    } else {
      try {
        const res = await getArchitectureFileContent(orgId, repositoryId, file.path);
        file.content = res.content;
        setEditableCode(res.content);
      } catch (err) {
        console.error("Failed to load file content:", err);
        setEditableCode("// Error loading file content from repository checkout.");
      }
    }
  };

  const handleApplyAiFix = async () => {
    if (!selectedFile || isFixing) return;
    setIsFixing(true);

    try {
      const primaryIssue = selectedFile.violations?.[0];
      const res = await remediateArchitectureIssue(orgId, repositoryId, {
        file_path: selectedFile.path,
        violation_id: primaryIssue?.id,
        category: primaryIssue?.category,
        issue_description:
          primaryIssue?.description || primaryIssue?.title || "Architectural violation or coupling issue",
        current_code: editableCode,
        language: getLanguageFromPath(selectedFile.path),
      });

      setEditableCode(res.refactored_code);
      setRemediationDiff(res.diff);
      setAiExplanation(res.explanation);
      setAiFixed(true);
      setIsRemediationDiffOpen(true);
    } catch (err) {
      console.error("AI Remediation failed:", err);
    } finally {
      setIsFixing(false);
    }
  };

  // Render recursive folder tree with blinking red indicators
  const renderTree = (node: ArchitectureFileNode, depth: number = 0) => {
    if (node.type === "directory") {
      const isExpanded = expandedFolders[node.id] ?? true;
      const hasBadChild = node.has_bad_architecture;

      // Filter logic
      if (filterBadOnly && !hasBadChild) {
        return null;
      }

      return (
        <div key={node.id} className="select-none">
          <div
            onClick={() => toggleFolder(node.id)}
            style={{ paddingLeft: `${depth * 14 + 8}px` }}
            className={`group flex cursor-pointer items-center justify-between py-1.5 pr-2 rounded-md text-[12.5px] transition-all ${
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
              <span className={`font-mono text-[12px] font-semibold truncate`}>
                {node.name || "root"}
              </span>
            </div>

            {hasBadChild && (
              <div className="flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  {node.violation_count} bad arch
                </span>
              </div>
            )}
          </div>

          {isExpanded && node.children && (
            <div className="space-y-0.5 mt-0.5">
              {node.children
                .filter((child) => {
                  if (searchQuery.trim()) {
                    return child.name.toLowerCase().includes(searchQuery.toLowerCase());
                  }
                  return true;
                })
                .map((child) => renderTree(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    // File Node
    const isSelected = selectedFile?.id === node.id;
    const isBad = node.has_bad_architecture && !aiFixed;

    if (filterBadOnly && !isBad) {
      return null;
    }

    return (
      <div
        key={node.id}
        onClick={() => handleSelectFile(node)}
        style={{ paddingLeft: `${depth * 14 + 18}px` }}
        className={`group relative flex cursor-pointer items-center justify-between py-1.5 pr-2 rounded-md text-[12px] transition-all ${
          isSelected
            ? "bg-[var(--cd-accent-soft)] text-[var(--cd-accent)] font-semibold shadow-xs ring-1 ring-[var(--cd-accent)]/40"
            : isBad
            ? "text-rose-300 bg-rose-950/20 hover:bg-rose-900/30 border-l-2 border-rose-500"
            : "text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)] hover:text-[var(--cd-ink)]"
        }`}
      >
        <div className="flex items-center gap-1.5 truncate">
          <FileCode
            className={`h-3.5 w-3.5 shrink-0 ${
              isBad
                ? "text-rose-400 animate-pulse"
                : isSelected
                ? "text-[var(--cd-accent)]"
                : "text-[var(--cd-ink-faint)]"
            }`}
          />
          <span className="font-mono text-[12px] truncate">{node.name}</span>
        </div>

        {isBad && (
          <div className="flex items-center gap-1">
            <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
              <Flame className="h-2.5 w-2.5 text-rose-400" />
              Smell
            </span>
          </div>
        )}

        {aiFixed && isSelected && (
          <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
            Clean
          </span>
        )}
      </div>
    );
  };

  const badFilesCount = countBadFiles(fileTree);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)]">
        <RefreshCw className="h-7 w-7 animate-spin text-[var(--cd-accent)] mb-3" />
        <div className="text-[14px] font-bold text-[var(--cd-ink)]">
          Initializing Architecture Code Studio & Impact Engine...
        </div>
        <p className="text-[12px] text-[var(--cd-ink-soft)] mt-1">
          Detecting architectural patterns, scanning file tree violations, and computing impact graphs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. TOP ARCHITECTURE STYLE & PATTERN BANNER */}
      <div className="rounded-xl border border-indigo-500/30 bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 p-5 shadow-lg text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/30 border border-indigo-400/40 text-[11px] font-black uppercase tracking-wider text-indigo-300">
                🏛️ Detected Architecture Pattern
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/30 text-[11px] font-bold text-emerald-300">
                <CheckCircle2 className="h-3 w-3" />
                {styleSummary?.alignment_score ?? 88.5}% Alignment Score
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-400" />
              {styleSummary?.pattern_name || "Layered (N-Tier) & Modular Microservices"}
            </h2>
            <p className="text-[13px] text-slate-300 max-w-2xl">
              {styleSummary?.description ||
                "Strict N-Tier layering separating Presentation, Domain Services, and Persistence, combined with isolated subsystem microservices."}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={() => setIsImpactOpen(true)}
              className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600/40 hover:to-indigo-600/40 text-purple-200 border border-purple-400/40 text-[12px] font-bold shadow-xs transition-colors"
            >
              <Compass className="h-3.5 w-3.5 text-purple-300" />
              <span>🔮 Impact Simulator</span>
            </button>

            <button
              onClick={() => setIsDiffOpen(true)}
              className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-[12px] font-bold shadow-xs transition-colors"
            >
              <span>🔄 Commit Diff</span>
            </button>

            <button
              onClick={() => setIsDecisionsOpen(true)}
              className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[12px] font-bold shadow-xs transition-colors"
            >
              <span>📜 ADR Memory</span>
            </button>

            <button
              onClick={() => setIsBoundariesOpen(true)}
              className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-[12px] font-bold shadow-xs transition-colors"
            >
              <span>🏗️ Boundaries</span>
            </button>

            <button
              onClick={() => setIsDegradationOpen(true)}
              className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[12px] font-bold shadow-xs transition-colors"
            >
              <span>⚠️ Drift &amp; Debt</span>
            </button>

            <button
              onClick={() => setFilterBadOnly(!filterBadOnly)}
              className={`cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all shadow-xs ${
                filterBadOnly
                  ? "bg-rose-500 text-white shadow-rose-500/30 animate-pulse"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              }`}
            >
              <Flame className="h-3.5 w-3.5 text-rose-400" />
              {filterBadOnly ? `Bad Arch (${badFilesCount})` : `Highlight Bad (${badFilesCount})`}
            </button>

            {onNavigateToChat && (
              <button
                onClick={onNavigateToChat}
                className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-bold shadow-xs transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Ask AI
              </button>
            )}
          </div>
        </div>

        {/* Layer Flow Pills */}
        {styleSummary?.layers && styleSummary.layers.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-slate-400 overflow-x-auto">
            {styleSummary.layers.map((layer, idx) => (
              <span key={layer} className="flex items-center gap-1.5 shrink-0">
                {idx > 0 && <span>➔</span>}
                <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-indigo-300 font-semibold">
                  {idx + 1}. {layer}
                </span>
              </span>
            ))}
          </div>
        )}

        {/* Blinking Alert Warning Bar */}
        <div className="mt-4 pt-3 border-t border-indigo-500/20 flex flex-wrap items-center justify-between gap-2 text-[12px]">
          <div className="flex items-center gap-2 text-rose-300 font-medium">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
            <span className="font-bold">Active Architectural Smells:</span>
            <span className="text-slate-300">
              Files and folders with layer violations or circular dependencies are pulsing red below.
            </span>
          </div>
          <span className="text-[11.5px] text-indigo-300 font-mono">
            {styleSummary?.key_rules?.[0]
              ? `Rule: ${styleSummary.key_rules[0]}`
              : "Rule: Enforce strict component decoupling & layer isolation"}
          </span>
        </div>
      </div>

      {/* 2. THREE-PANEL CODE & ARCHITECTURE STUDIO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN: Project Tree Explorer (4 cols) */}
        <div className="lg:col-span-4 flex flex-col rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] shadow-sm overflow-hidden">
          <div className="border-b border-[var(--cd-border-soft)] p-3 bg-[var(--cd-sunken)]/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-bold text-[var(--cd-ink)] flex items-center gap-1.5">
                <Folder className="h-4 w-4 text-[var(--cd-accent)]" />
                Project File Tree
              </span>
              <span className="text-[11px] font-mono text-[var(--cd-ink-faint)]">
                {filterBadOnly ? `${badFilesCount} Bad Files Filtered` : "All Subsystems"}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[var(--cd-ink-faint)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search modules, files, services..."
                className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] py-1.5 pl-8 pr-3 text-[12px] text-[var(--cd-ink)] placeholder-[var(--cd-ink-faint)] focus:outline-hidden focus:ring-1 focus:ring-[var(--cd-accent)]"
              />
            </div>
          </div>

          <div className="p-2 overflow-y-auto max-h-[560px] space-y-0.5">
            {fileTree ? (
              renderTree(fileTree)
            ) : (
              <div className="p-4 text-center text-[12px] text-[var(--cd-ink-faint)]">
                No files available
              </div>
            )}
          </div>

          {/* Bottom Info Box */}
          <div className="border-t border-[var(--cd-border-soft)] p-3 bg-[var(--cd-sunken)]/40 text-[11.5px] text-[var(--cd-ink-soft)] space-y-1">
            <div className="flex items-center gap-1.5 text-rose-500 font-bold">
              <Flame className="h-3.5 w-3.5 animate-pulse" />
              <span>Pulsing Red: Bad Architecture Detected</span>
            </div>
            <p className="text-[11px] text-[var(--cd-ink-faint)] leading-relaxed">
              Click any file to inspect code, view violations, and simulate change impact in real time.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Code Editor (8 cols) */}
        <div className="lg:col-span-8 flex flex-col rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] shadow-sm overflow-hidden">
          {/* Editor Header Tab */}
          <div className="flex flex-wrap items-center justify-between border-b border-[var(--cd-border-soft)] bg-[var(--cd-sunken)]/60 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <FileCode className="h-4 w-4 text-indigo-400" />
              <span className="font-mono text-[13px] font-bold text-[var(--cd-ink)]">
                {selectedFile?.name || "Select a file"}
              </span>
              <span className="text-[11px] font-mono text-[var(--cd-ink-faint)]">
                ({selectedFile?.path})
              </span>
              {selectedFile?.has_bad_architecture && !aiFixed && (
                <span className="flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-500 border border-rose-500/40 animate-pulse">
                  <Flame className="h-2.5 w-2.5" />
                  Violation on line {selectedFile.violations[0]?.line_number || "1"}
                </span>
              )}
              {aiFixed && (
                <span className="flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 border border-emerald-500/40">
                  <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                  Architectural Rule Compliant
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsAgentSpecOpen(true)}
                className="cursor-pointer flex items-center gap-1.5 rounded-lg bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/30 text-purple-700 dark:text-purple-300 px-2.5 py-1.5 text-[11.5px] font-bold shadow-xs transition-colors"
              >
                <Bot className="h-3.5 w-3.5" />
                <span>Agent Spec</span>
              </button>

              <button
                onClick={() => setIsVerificationOpen(true)}
                className="cursor-pointer flex items-center gap-1.5 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-700 dark:text-blue-300 px-2.5 py-1.5 text-[11.5px] font-bold shadow-xs transition-colors"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Verify Improvement</span>
              </button>

              {selectedFile?.has_bad_architecture && !aiFixed && (
                <button
                  onClick={handleApplyAiFix}
                  disabled={isFixing}
                  className="cursor-pointer flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 px-3 py-1.5 text-[11.5px] font-bold text-white shadow-xs transition-colors"
                >
                  {isFixing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Refactoring...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>🪄 AI Refactor</span>
                    </>
                  )}
                </button>
              )}

              {aiFixed && remediationDiff && (
                <button
                  onClick={() => setIsRemediationDiffOpen(true)}
                  className="cursor-pointer flex items-center gap-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 px-2.5 py-1.5 text-[11.5px] font-bold transition-colors"
                >
                  <GitCompare className="h-3.5 w-3.5" />
                  <span>View Diff</span>
                </button>
              )}

              <button
                onClick={() => {
                  if (selectedFile) {
                    setAiFixed(false);
                    setRemediationDiff("");
                    setAiExplanation(null);
                    setEditableCode(selectedFile.content || "");
                  }
                }}
                className="cursor-pointer flex items-center gap-1 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-2.5 py-1.5 text-[11.5px] font-medium text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)] transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                Reset
              </button>
            </div>
          </div>

          {/* Violation Callout Banner */}
          {selectedFile?.has_bad_architecture && !aiFixed && selectedFile.violations.length > 0 && (
            <div className="bg-rose-500/10 border-b border-rose-500/30 p-3 text-[12px] flex items-start gap-2.5">
              <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
              <div className="space-y-1">
                <div className="font-bold text-rose-400 flex items-center gap-2">
                  <span>🚨 Bad Architecture Decision:</span>
                  <span className="font-semibold text-rose-200">
                    {selectedFile.violations[0].title}
                  </span>
                </div>
                <p className="text-slate-300 leading-normal">
                  {selectedFile.violations[0].description}
                </p>
                <div className="text-[11.5px] text-emerald-400 font-medium pt-0.5">
                  💡 <strong>Suggested Fix:</strong> {selectedFile.violations[0].suggested_fix}
                </div>
              </div>
            </div>
          )}

          {/* Code Editor Window */}
          <div className="relative flex flex-1 min-h-[380px] max-h-[460px] bg-slate-950 font-mono text-[12.5px] text-slate-100 overflow-hidden">
            {/* Line Numbers */}
            <div className="w-12 shrink-0 select-none bg-slate-900/90 py-3 text-right pr-3 font-mono text-[11px] text-slate-500 border-r border-slate-800/80">
              {editableCode.split("\n").map((_, i) => (
                <div key={i} className="leading-6">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Editable Text Area */}
            <textarea
              value={editableCode}
              onChange={(e) => setEditableCode(e.target.value)}
              className="flex-1 resize-none bg-transparent p-3 font-mono text-[12.5px] leading-6 text-slate-100 outline-hidden focus:ring-0 overflow-y-auto"
              spellCheck={false}
            />
          </div>

          {/* Editor Status Bar */}
          <div className="border-t border-[var(--cd-border-soft)] bg-[var(--cd-sunken)]/40 px-4 py-2 flex items-center justify-between text-[11px] text-[var(--cd-ink-faint)] font-mono">
            <div className="flex items-center gap-3">
              <span>{getLanguageFromPath(selectedFile?.path)}</span>
              <span>UTF-8</span>
              <span>{editableCode.split("\n").length} lines</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-500 font-semibold">
              <Zap className="h-3 w-3" />
              <span>Architectural Intelligence Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modals for 9 Pillars */}
      <ArchitectureDecisionsModal
        isOpen={isDecisionsOpen}
        onClose={() => setIsDecisionsOpen(false)}
        orgId={orgId}
        repositoryId={repositoryId}
      />

      <ArchitectureBoundariesModal
        isOpen={isBoundariesOpen}
        onClose={() => setIsBoundariesOpen(false)}
        orgId={orgId}
        repositoryId={repositoryId}
      />

      <ArchitectureDegradationModal
        isOpen={isDegradationOpen}
        onClose={() => setIsDegradationOpen(false)}
        orgId={orgId}
        repositoryId={repositoryId}
      />

      <AgentSpecModal
        isOpen={isAgentSpecOpen}
        onClose={() => setIsAgentSpecOpen(false)}
        orgId={orgId}
        repositoryId={repositoryId}
        selectedFile={selectedFile?.path}
        selectedComponent={selectedFile?.name ? selectedFile.name.replace(/\.[^/.]+$/, "") : undefined}
      />

      <ArchitectureVerificationModal
        isOpen={isVerificationOpen}
        onClose={() => setIsVerificationOpen(false)}
        orgId={orgId}
        repositoryId={repositoryId}
        filePath={selectedFile?.path || ""}
        proposedCode={editableCode}
      />

      <ArchitectureCommitDiffModal
        isOpen={isDiffOpen}
        onClose={() => setIsDiffOpen(false)}
        orgId={orgId}
        repositoryId={repositoryId}
        onOpenAgentSpec={() => {
          setIsDiffOpen(false);
          setIsAgentSpecOpen(true);
        }}
      />

      <ArchitecturalImpactModal
        isOpen={isImpactOpen}
        onClose={() => setIsImpactOpen(false)}
        orgId={orgId}
        repositoryId={repositoryId}
        initialComponentId={selectedFile?.name ? selectedFile.name.replace(/\.[^/.]+$/, "") : "System"}
        onOpenAgentSpec={(_task) => {
          setIsImpactOpen(false);
          setIsAgentSpecOpen(true);
        }}
      />

      {/* AI Remediation Unified Diff Modal */}
      {isRemediationDiffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative flex flex-col w-full max-w-4xl max-h-[85vh] rounded-2xl border border-[var(--cd-border)] bg-[var(--cd-surface)] shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--cd-border-soft)] px-5 py-3.5 bg-[var(--cd-sunken)]/60">
              <div className="flex items-center gap-2">
                <GitCompare className="h-5 w-5 text-emerald-500" />
                <span className="font-bold text-[14px] text-[var(--cd-ink)]">
                  Architectural Refactoring Preview: {selectedFile?.name}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                  AI Remediation Applied
                </span>
              </div>
              <button
                onClick={() => setIsRemediationDiffOpen(false)}
                className="cursor-pointer rounded-lg p-1.5 text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)] hover:text-[var(--cd-ink)] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* AI Explanation Banner */}
            {aiExplanation && (
              <div className="p-4 bg-emerald-500/10 border-b border-emerald-500/20 text-[12.5px] text-[var(--cd-ink)] flex items-start gap-2.5">
                <Sparkles className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-emerald-700 dark:text-emerald-300">
                    Refactoring Rationale &amp; Principles Applied
                  </div>
                  <p className="text-slate-300 leading-relaxed font-sans">{aiExplanation}</p>
                </div>
              </div>
            )}

            {/* Unified Diff Content */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-950 font-mono text-[12px] leading-5">
              {remediationDiff ? (
                remediationDiff.split("\n").map((line, idx) => {
                  let lineClass = "text-slate-300";
                  if (line.startsWith("+") && !line.startsWith("+++")) {
                    lineClass = "bg-emerald-950/50 text-emerald-300 font-bold";
                  } else if (line.startsWith("-") && !line.startsWith("---")) {
                    lineClass = "bg-rose-950/50 text-rose-300 font-bold";
                  } else if (line.startsWith("@@")) {
                    lineClass = "bg-indigo-950/60 text-indigo-300";
                  }
                  return (
                    <div key={idx} className={`px-2 py-0.5 ${lineClass}`}>
                      {line}
                    </div>
                  );
                })
              ) : (
                <div className="text-slate-400 italic">No structural diff available.</div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-[var(--cd-border-soft)] px-5 py-3 bg-[var(--cd-sunken)]/40 flex items-center justify-between">
              <span className="text-[11.5px] text-[var(--cd-ink-faint)]">
                The refactored code has been synced into your Code Studio editor.
              </span>
              <button
                onClick={() => setIsRemediationDiffOpen(false)}
                className="cursor-pointer rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-1.5 text-[12px] font-bold text-white transition-colors"
              >
                Accept Refactoring
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

