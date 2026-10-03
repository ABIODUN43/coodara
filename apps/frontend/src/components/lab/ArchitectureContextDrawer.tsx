import { useState } from "react";
import {
  X,
  Layers,
  AlertTriangle,
  Cpu,
  ArrowRight,
  Search,
} from "lucide-react";

interface ArchitectureContextDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  repoName: string;
  components: Array<{
    id: string;
    name: string;
    type?: string;
    technology?: string | null;
    health_score?: number | null;
  }>;
  issues: Array<{
    id: string;
    title: string;
    severity: string;
    type?: string;
    primaryComponent?: string;
  }>;
  healthScore?: number | null;
  architecturePattern?: string | null;
  onFormulateHypothesisFromFinding?: (issue: {
    id: string;
    title: string;
    severity: string;
    primaryComponent?: string;
  }) => void;
}

export function ArchitectureContextDrawer({
  isOpen,
  onClose,
  repoName,
  components,
  issues,
  healthScore,
  architecturePattern,
  onFormulateHypulateFromFinding: onFormulateHypothesisFromFinding,
}: ArchitectureContextDrawerProps & {
  onFormulateHypulateFromFinding?: (issue: {
    id: string;
    title: string;
    severity: string;
    primaryComponent?: string;
  }) => void;
}) {
  const [activeTab, setActiveTab] = useState<"findings" | "components">("findings");
  const [query, setQuery] = useState("");

  if (!isOpen) return null;

  const filteredIssues = issues.filter(
    (iss) =>
      iss.title.toLowerCase().includes(query.toLowerCase()) ||
      iss.severity.toLowerCase().includes(query.toLowerCase()) ||
      (iss.primaryComponent && iss.primaryComponent.toLowerCase().includes(query.toLowerCase()))
  );

  const filteredComponents = components.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      (c.technology && c.technology.toLowerCase().includes(query.toLowerCase())) ||
      (c.type && c.type.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Architecture Context</h3>
              <p className="text-[11px] text-slate-400 truncate max-w-[240px]">{repoName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Architecture Metrics Bar */}
        <div className="grid grid-cols-2 gap-2 p-4 bg-slate-950/60 border-b border-slate-800 text-xs">
          <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/80">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
              Pattern
            </span>
            <span className="font-medium text-slate-200 truncate block">
              {architecturePattern || "Modular Monolith"}
            </span>
          </div>

          <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/80">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
              Health Score
            </span>
            <span
              className={`font-semibold ${
                healthScore !== null && healthScore !== undefined
                  ? healthScore >= 80
                    ? "text-emerald-400"
                    : healthScore >= 60
                    ? "text-amber-400"
                    : "text-rose-400"
                  : "text-slate-400"
              }`}
            >
              {healthScore !== null && healthScore !== undefined ? `${healthScore}%` : "Analyzed"}
            </span>
          </div>
        </div>

        {/* Tab switcher & Search */}
        <div className="p-3 border-b border-slate-800/80 space-y-2 bg-slate-900/40">
          <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs font-medium">
            <button
              onClick={() => setActiveTab("findings")}
              className={`flex-1 py-1.5 rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === "findings"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Findings ({issues.length})
            </button>
            <button
              onClick={() => setActiveTab("components")}
              className={`flex-1 py-1.5 rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === "components"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Components ({components.length})
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Filter ${activeTab}...`}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === "findings" ? (
            filteredIssues.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No architectural findings match.
              </div>
            ) : (
              filteredIssues.map((iss) => (
                <div
                  key={iss.id}
                  className="p-3 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-lg space-y-2 transition-colors text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        iss.severity === "critical"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : iss.severity === "warning"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      }`}
                    >
                      {iss.severity}
                    </span>
                    {iss.primaryComponent && (
                      <span className="font-mono text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded">
                        {iss.primaryComponent}
                      </span>
                    )}
                  </div>

                  <div className="font-medium text-slate-200 line-clamp-2">{iss.title}</div>

                  {onFormulateHypothesisFromFinding && (
                    <button
                      onClick={() => {
                        onFormulateHypothesisFromFinding(iss);
                        onClose();
                      }}
                      className="w-full mt-2 py-1.5 px-2 bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/60 rounded text-indigo-300 hover:text-white flex items-center justify-center gap-1.5 text-[11px] font-medium transition-colors"
                    >
                      <span>Formulate Hypothesis</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))
            )
          ) : filteredComponents.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No architectural components match.
            </div>
          ) : (
            filteredComponents.map((c) => (
              <div
                key={c.id}
                className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-medium text-slate-200 truncate">{c.name}</div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                    {c.type && <span>Type: {c.type}</span>}
                    {c.technology && <span>• {c.technology}</span>}
                  </div>
                </div>
                {c.health_score !== null && c.health_score !== undefined && (
                  <span
                    className={`font-semibold font-mono text-xs ${
                      c.health_score >= 80 ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {c.health_score}%
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
