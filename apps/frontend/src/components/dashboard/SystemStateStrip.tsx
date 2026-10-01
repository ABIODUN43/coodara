import {
  FolderGit2,
  FileCode2,
  ChevronRight,
} from "lucide-react";
import type { MetricType } from "@/components/architecture/MetricEvidenceModal";

interface SystemStateStripProps {
  healthScore: number;
  healthLabel: "Healthy" | "Watch" | "At risk";
  riskLevel: "Low" | "Medium" | "High";
  criticalFindingsCount: number;
  warningFindingsCount: number;
  totalLoc: number;
  totalFiles: number;
  totalClasses: number;
  analyzedReposCount: number;
  totalRepos: number;
  lastSnapshotIso: string | null;
  onInspectEvidence: (type: MetricType, value: string | number, label?: string) => void;
}

export function SystemStateStrip({
  healthScore,
  healthLabel,
  riskLevel,
  criticalFindingsCount,
  warningFindingsCount,
  totalLoc,
  totalFiles,
  totalClasses,
  analyzedReposCount,
  totalRepos,
  lastSnapshotIso,
  onInspectEvidence,
}: SystemStateStripProps) {
  const isAnalyzed = analyzedReposCount > 0;

  const healthColor =
    healthLabel === "Healthy"
      ? "var(--cd-good)"
      : healthLabel === "Watch"
      ? "var(--cd-warn)"
      : "var(--cd-risk)";

  const riskColor =
    riskLevel === "Low"
      ? "var(--cd-good)"
      : riskLevel === "Medium"
      ? "var(--cd-warn)"
      : "var(--cd-risk)";

  return (
    <div className="mb-6 rounded-[12px] border border-[var(--cd-border)] bg-[var(--cd-surface)] shadow-2xs">
      <div className="grid grid-cols-2 divide-y divide-[var(--cd-border-soft)] sm:divide-y-0 sm:divide-x sm:grid-cols-4">
        {/* 1. Architecture Health */}
        <button
          type="button"
          onClick={() => onInspectEvidence("health", `${healthScore}/100`, "Architecture Health Index")}
          className="group relative flex flex-col justify-between p-4 text-left transition-colors hover:bg-[var(--cd-sunken)]/60 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-medium text-[var(--cd-ink-faint)]">
              Architecture Health
            </span>
            <span
              className="h-2 w-2 rounded-full transition-transform group-hover:scale-125"
              style={{ backgroundColor: healthColor }}
            />
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold tracking-tight text-[var(--cd-ink)] sm:text-2xl">
              {isAnalyzed ? `${healthScore}` : "—"}
            </span>
            {isAnalyzed && (
              <span className="text-xs font-medium text-[var(--cd-ink-faint)]">/ 100</span>
            )}
            <span
              className="rounded px-1.5 py-0.5 text-[10.5px] font-semibold"
              style={{
                backgroundColor: isAnalyzed ? `${healthColor}15` : "var(--cd-sunken)",
                color: isAnalyzed ? healthColor : "var(--cd-ink-faint)",
              }}
            >
              {isAnalyzed ? healthLabel : "Unanalyzed"}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--cd-ink-faint)]">
            <span>{isAnalyzed ? "AST telemetry active" : "Awaiting scan"}</span>
            <span className="flex items-center text-[var(--cd-accent)] opacity-0 group-hover:opacity-100 transition-opacity">
              Formula <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </button>

        {/* 2. Risk Level & Findings */}
        <button
          type="button"
          onClick={() => onInspectEvidence("issues", criticalFindingsCount, "Architectural Findings")}
          className="group relative flex flex-col justify-between p-4 text-left transition-colors hover:bg-[var(--cd-sunken)]/60 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-medium text-[var(--cd-ink-faint)]">
              System Risk
            </span>
            <span
              className="h-2 w-2 rounded-full transition-transform group-hover:scale-125"
              style={{ backgroundColor: riskColor }}
            />
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            <span
              className="text-xl font-bold tracking-tight sm:text-2xl"
              style={{ color: isAnalyzed ? riskColor : "var(--cd-ink)" }}
            >
              {isAnalyzed ? riskLevel : "—"}
            </span>
            <span className="text-xs text-[var(--cd-ink-soft)]">
              {criticalFindingsCount > 0
                ? `${criticalFindingsCount} critical finding${criticalFindingsCount > 1 ? "s" : ""}`
                : "No critical debt"}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--cd-ink-faint)]">
            <span>
              {warningFindingsCount > 0
                ? `${warningFindingsCount} warning${warningFindingsCount > 1 ? "s" : ""}`
                : "Optimal posture"}
            </span>
            <span className="flex items-center text-[var(--cd-accent)] opacity-0 group-hover:opacity-100 transition-opacity">
              Inspect <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </button>

        {/* 3. Code & Structural Scope */}
        <button
          type="button"
          onClick={() => onInspectEvidence("components", totalFiles, "System Scope")}
          className="group relative flex flex-col justify-between p-4 text-left transition-colors hover:bg-[var(--cd-sunken)]/60 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-medium text-[var(--cd-ink-faint)]">
              Scope &amp; Entities
            </span>
            <FileCode2 className="h-3.5 w-3.5 text-[var(--cd-ink-faint)]" />
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold tracking-tight text-[var(--cd-ink)] sm:text-2xl">
              {totalFiles > 0 ? totalFiles.toLocaleString() : "—"}
            </span>
            <span className="text-xs text-[var(--cd-ink-faint)]">modules / files</span>
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--cd-ink-faint)]">
            <span>
              {totalClasses > 0
                ? `${(totalLoc / 1000).toFixed(1)}k LOC · ${totalClasses} classes`
                : totalLoc > 0
                ? `${(totalLoc / 1000).toFixed(1)}k lines of code`
                : "0 lines scanned"}
            </span>
            <span className="flex items-center text-[var(--cd-accent)] opacity-0 group-hover:opacity-100 transition-opacity">
              Breakdown <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </button>

        {/* 4. Repository Coverage */}
        <div className="flex flex-col justify-between p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-medium text-[var(--cd-ink-faint)]">
              Repository Coverage
            </span>
            <FolderGit2 className="h-3.5 w-3.5 text-[var(--cd-ink-faint)]" />
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold tracking-tight text-[var(--cd-ink)] sm:text-2xl">
              {analyzedReposCount}
            </span>
            <span className="text-xs text-[var(--cd-ink-faint)]">/ {totalRepos} scanned</span>
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--cd-ink-faint)]">
            <span>
              {analyzedReposCount === totalRepos && totalRepos > 0
                ? "100% telemetry coverage"
                : `${totalRepos - analyzedReposCount} awaiting scan`}
            </span>
            <span className="text-[10.5px] font-medium text-[var(--cd-good)]">
              {lastSnapshotIso ? "● Captured" : isAnalyzed ? "● Verified" : "○ Idle"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
