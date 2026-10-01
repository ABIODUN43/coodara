import { Link, useNavigate } from "react-router-dom";
import {
  GitBranch,
  Plus,
  Play,
  MessageSquare,
  HelpCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OverviewRepositoryItem } from "@/types/overview";

interface OverviewHeaderProps {
  organizationName: string;
  organizationId: number | string;
  primaryRepo: OverviewRepositoryItem | null;
  analyzedReposCount: number;
  totalRepos: number;
  lastSnapshotIso: string | null;
  onOpenImport: () => void;
  onOpenIntelligenceModal: () => void;
}

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return "Never";
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function OverviewHeader({
  organizationName,
  organizationId,
  primaryRepo,
  analyzedReposCount,
  totalRepos,
  lastSnapshotIso,
  onOpenImport,
  onOpenIntelligenceModal,
}: OverviewHeaderProps) {
  const navigate = useNavigate();

  const handleAskCoodara = () => {
    if (primaryRepo) {
      navigate(`/dashboard/chat?repoId=${primaryRepo.id}`);
    } else {
      navigate("/dashboard/chat");
    }
  };

  const handleAnalyze = () => {
    if (primaryRepo) {
      navigate(`/dashboard/organizations/${organizationId}/repositories/${primaryRepo.id}/analysis`);
    } else {
      onOpenImport();
    }
  };

  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-[var(--cd-border-soft)] pb-6 lg:flex-row lg:items-center lg:justify-between">
      {/* Title & System Narrative */}
      <div>
        <div className="flex items-center gap-2 text-xs text-[var(--cd-ink-faint)]">
          <span className="font-semibold text-[var(--cd-ink)]">{organizationName}</span>
          <span>/</span>
          <span className="font-medium text-[var(--cd-ink-soft)]">Architecture Intelligence</span>
        </div>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--cd-ink)] sm:text-[26px]">
          Architecture Command Center
        </h1>

        {/* Context metadata strip */}
        {primaryRepo ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[12px] text-[var(--cd-ink-soft)]">
            <span className="inline-flex items-center gap-1.5 font-medium text-[var(--cd-ink)]">
              <span className="h-2 w-2 rounded-full bg-[var(--cd-good)]" />
              {primaryRepo.name}
            </span>

            <span className="text-[var(--cd-ink-faint)]">·</span>

            <span className="inline-flex items-center gap-1 font-mono text-[11.5px] text-[var(--cd-ink-faint)]">
              <GitBranch className="h-3 w-3" />
              {primaryRepo.default_branch || "main"}
            </span>

            {primaryRepo.primary_language && (
              <>
                <span className="text-[var(--cd-ink-faint)]">·</span>
                <span className="rounded bg-[var(--cd-sunken)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--cd-ink-soft)]">
                  {primaryRepo.primary_language}
                </span>
              </>
            )}

            <span className="text-[var(--cd-ink-faint)]">·</span>

            <span className="inline-flex items-center gap-1 text-[11.5px] text-[var(--cd-ink-faint)]">
              <Clock className="h-3 w-3" />
              Last analyzed {formatRelativeTime(lastSnapshotIso)}
            </span>

            {totalRepos > 1 && (
              <>
                <span className="text-[var(--cd-ink-faint)]">·</span>
                <Link
                  to={`/dashboard/organizations/${organizationId}/repositories`}
                  className="text-[11.5px] text-[var(--cd-accent)] hover:underline"
                >
                  +{totalRepos - 1} more repo{totalRepos - 1 > 1 ? "s" : ""} ({analyzedReposCount} analyzed)
                </Link>
              </>
            )}
          </div>
        ) : (
          <p className="mt-1 text-[13px] text-[var(--cd-ink-soft)]">
            Understand the structure, health, and evolution of your software system.
          </p>
        )}
      </div>

      {/* Primary Engineering Actions */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={onOpenIntelligenceModal}
          className="inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-[12px] font-medium text-[var(--cd-ink-faint)] hover:bg-[var(--cd-sunken)] hover:text-[var(--cd-ink)] transition-colors cursor-pointer"
        >
          <HelpCircle className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
          <span>Why Architecture Intelligence?</span>
        </button>

        <Button
          variant="secondary"
          size="md"
          onClick={handleAskCoodara}
          className="gap-1.5"
        >
          <MessageSquare className="h-3.5 w-3.5 text-[var(--cd-accent)]" />
          <span>Ask Coodara</span>
        </Button>

        <Button
          variant="secondary"
          size="md"
          onClick={handleAnalyze}
          className="gap-1.5"
        >
          <Play className="h-3.5 w-3.5 text-[var(--cd-good)]" />
          <span>Analyze</span>
        </Button>

        <Button
          variant="primary"
          size="md"
          onClick={onOpenImport}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Import repository</span>
        </Button>
      </div>
    </div>
  );
}
