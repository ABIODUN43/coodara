import type { ArchitectureSummary as SummaryData } from "@/types/architecture";

export function ArchitectureSummary({ summary }: { summary: SummaryData }) {
  const cards = [
    {
      label: "Health Score",
      // Contract §5: never invent a value — if backend returns null, show "Not available".
      value: summary.health_score == null ? "Not available" : summary.health_score,
    },
    { label: "Components", value: summary.components },
    { label: "Dependencies", value: summary.dependencies },
    { label: "Issues", value: summary.issues },
  ];

  return (
    <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-[var(--cd-border)] bg-[var(--cd-border)] sm:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-[var(--cd-surface)] p-4">
          <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--cd-ink-faint)]">
            {c.label}
          </div>
          <div className="mt-1.5 font-mono text-[21px] font-semibold tracking-tight text-[var(--cd-ink)]">
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}