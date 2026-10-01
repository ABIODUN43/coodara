import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardOverviewData } from "@/hooks/useDashboardOverview";

interface CoodaraFindingCardProps {
  issues: DashboardOverviewData["allIssues"];
  recommendations: DashboardOverviewData["allRecommendations"];
  organizationId: number | string;
}

export function CoodaraFindingCard({
  issues,
  recommendations,
}: CoodaraFindingCardProps) {
  const navigate = useNavigate();

  // Pick the most critical real issue
  const topIssue = issues?.find((i) => i.issue.severity === "critical") || issues?.[0];
  const topRec = recommendations?.[0];

  if (!topIssue && !topRec) {
    return (
      <div className="rounded-[12px] border border-[var(--cd-border)] bg-[var(--cd-surface)] p-5 shadow-2xs">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--cd-good)] font-heading">
          <ShieldCheck className="h-4 w-4" />
          <span>System Integrity Verified</span>
        </div>

        <h3 className="mt-2 text-base font-bold text-[var(--cd-ink)]">
          No Critical Architectural Violations
        </h3>

        <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--cd-ink-soft)]">
          All analyzed modules satisfy boundary separation rules. In-degree and out-degree
          coupling remain within configured architectural limits.
        </p>

        <div className="mt-4 flex items-center gap-2 text-[11.5px] text-[var(--cd-ink-faint)]">
          <CheckCircle2 className="h-3.5 w-3.5 text-[var(--cd-good)]" />
          <span>Continuous AST rule verification active</span>
        </div>
      </div>
    );
  }

  const title = topIssue?.issue.title || topRec?.recommendation || "Architectural Smells Detected";
  const repoName = topIssue?.repoName || topRec?.repoName || "Primary System";
  const description = topIssue?.issue.description || topRec?.action_plan || "Coupling bounds exceeded.";
  const isCritical = topIssue?.issue.severity === "critical";

  return (
    <div className="rounded-[12px] border border-[var(--cd-border)] bg-[var(--cd-surface)] p-5 shadow-2xs">
      {/* Badge & Confidence Header */}
      <div className="flex items-center justify-between border-b border-[var(--cd-border-soft)] pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-[5px] bg-[var(--cd-accent-soft)] text-[var(--cd-accent)]">
            <Sparkles className="h-3 w-3" />
          </span>
          <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--cd-ink)] font-heading">
            Coodara Architectural Finding
          </span>
        </div>

        <div className="flex items-center gap-1.5 rounded-full bg-[var(--cd-sunken)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--cd-ink-soft)]">
          <span>Confidence</span>
          <span className="text-[var(--cd-accent)] font-bold">HIGH (AST)</span>
        </div>
      </div>

      {/* Finding Subject */}
      <div className="mt-3.5">
        <div className="flex items-center gap-2">
          <span
            className={`rounded px-1.5 py-0.5 text-[10.5px] font-bold uppercase ${
              isCritical
                ? "bg-[var(--cd-risk-bg)] text-[var(--cd-risk)]"
                : "bg-[var(--cd-warn-bg)] text-[var(--cd-warn)]"
            }`}
          >
            {isCritical ? "Critical Boundary" : "Warning"}
          </span>
          <span className="text-[12px] font-medium text-[var(--cd-ink-faint)]">{repoName}</span>
        </div>

        <h3 className="mt-1.5 text-[15px] font-bold text-[var(--cd-ink)] leading-snug">
          {title}
        </h3>
      </div>

      {/* Evidence Block */}
      <div className="mt-3 rounded-[8px] border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)]/50 p-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--cd-ink-faint)]">
          Syntactic Evidence
        </div>
        <p className="mt-1 font-mono text-[11.5px] text-[var(--cd-ink-soft)] leading-relaxed">
          {description}
        </p>
      </div>

      {/* Why It Matters */}
      <div className="mt-3">
        <div className="text-[11px] font-semibold text-[var(--cd-ink-faint)] uppercase tracking-wider">
          Why It Matters
        </div>
        <p className="mt-0.5 text-[12px] text-[var(--cd-ink-soft)] leading-relaxed">
          Uncontrolled coupling across this boundary causes ripples: downstream changes
          propagate unintended regression risk into connected services.
        </p>
      </div>

      {/* Action Triggers */}
      <div className="mt-4 flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--cd-border-soft)]">
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            if (topIssue) {
              navigate(`/findings?finding=${topIssue.issue.id}`);
            } else {
              navigate(`/findings`);
            }
          }}
          className="gap-1 text-[11.5px]"
        >
          <span>Inspect Evidence</span>
          <ArrowRight className="h-3 w-3" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            navigate(`/dashboard/chat?query=${encodeURIComponent(`Explain risk: ${title}`)}`);
          }}
          className="gap-1 text-[11.5px]"
        >
          <Sparkles className="h-3 w-3 text-[var(--cd-accent)]" />
          <span>Ask Coodara</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/dashboard/simulation`)}
          className="gap-1 text-[11.5px] text-[var(--cd-ink-soft)]"
        >
          <span>Run What-If</span>
        </Button>
      </div>
    </div>
  );
}
