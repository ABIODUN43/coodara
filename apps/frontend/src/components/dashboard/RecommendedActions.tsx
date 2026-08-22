import { Play } from "lucide-react";

const BAND = {
  good: "var(--cd-good)",
  warn: "var(--cd-warn)",
  risk: "var(--cd-risk)",
};

const actions = [
  {
    title: "Remove circular dependency",
    priorityLabel: "High",
    impactLevel: "High",
    effort: "Medium",
    expectedImpact: "Eliminate auth ↔ user cyclic risk",
    fix: "Extract shared logic from auth-service and user-service into a new identity-core module.",
    priority: "P0",
    band: "risk" as const,
  },
  {
    title: "Split notification-service",
    priorityLabel: "Medium",
    impactLevel: "Medium",
    effort: "High",
    expectedImpact: "Reduce service size by ~60%",
    fix: "Break out email, SMS, and push channels into independently deployable services.",
    priority: "P1",
    band: "warn" as const,
  },
  {
    title: "Reduce payment ↔ billing coupling",
    priorityLabel: "High",
    impactLevel: "High",
    effort: "Medium",
    expectedImpact: "Reduce coupling by 23%",
    fix: "Introduce an event contract instead of direct synchronous calls.",
    priority: "P0",
    band: "risk" as const,
  },
];

export function RecommendedActions() {
  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-[var(--cd-border)] bg-[var(--cd-border)] sm:grid-cols-2 lg:grid-cols-3">
      {actions.map((a) => (
        <div key={a.title} className="bg-[var(--cd-surface)] p-4">
          <div className="mb-2.5 flex items-center justify-between">
            <span
              className="rounded-md px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-white"
              style={{ background: BAND[a.band] }}
            >
              {a.priority}
            </span>
          </div>

          <h4 className="mb-2 text-[13px] font-semibold leading-tight text-[var(--cd-ink)]">
            {a.title}
          </h4>

          <div className="mb-2.5 flex gap-3.5">
            <span className="flex flex-col gap-0.5 text-[10.5px] text-[var(--cd-ink-faint)]">
              Priority
              <b className="text-[12px] font-semibold text-[var(--cd-ink)]">{a.priorityLabel}</b>
            </span>
            <span className="flex flex-col gap-0.5 text-[10.5px] text-[var(--cd-ink-faint)]">
              Impact
              <b className="text-[12px] font-semibold text-[var(--cd-ink)]">{a.impactLevel}</b>
            </span>
            <span className="flex flex-col gap-0.5 text-[10.5px] text-[var(--cd-ink-faint)]">
              Effort
              <b className="text-[12px] font-semibold text-[var(--cd-ink)]">{a.effort}</b>
            </span>
          </div>

          <p className="mb-2.5 text-[12px] leading-relaxed text-[var(--cd-ink-soft)]">{a.fix}</p>

          <div className="border-t border-[var(--cd-border-soft,var(--cd-border))] pt-2.5 text-[11.5px] text-[var(--cd-ink-faint)]">
            Expected impact:
            <b className="mt-0.5 block text-[12.5px] font-semibold text-[var(--cd-ink)]">
              {a.expectedImpact}
            </b>
          </div>

          <button className="mt-3 flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-[var(--cd-accent)] transition-colors hover:text-[var(--cd-accent-hover)]">
            <Play className="h-3 w-3" fill="currentColor" />
            Run fix plan
          </button>
        </div>
      ))}
    </div>
  );
}