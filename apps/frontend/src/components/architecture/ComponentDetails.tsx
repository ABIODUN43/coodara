import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { getArchitectureComponent } from "@/api/architecture";
import { getMockComponent } from "@/data/MockArchitecture";
import { USE_MOCK_ARCHITECTURE_DATA } from "@/dev/devFlags";
import type { ArchitectureComponent } from "@/types/architecture";

interface ComponentDetailsProps {
  repositoryId: string;
  componentId: string | null;
  onAskAi: (componentId: string) => void;
}

export function ComponentDetails({
  repositoryId,
  componentId,
  onAskAi,
}: ComponentDetailsProps) {
  const [component, setComponent] = useState<ArchitectureComponent | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!componentId) {
      setComponent(null);
      return;
    }

    // TEMP: same mock-data toggle as ArchitecturePage — see src/dev/devFlags.ts
    if (USE_MOCK_ARCHITECTURE_DATA) {
      setComponent(getMockComponent(componentId));
      return;
    }

    setLoading(true);
    getArchitectureComponent(repositoryId, componentId)
      .then(setComponent)
      .catch(() => setComponent(null))
      .finally(() => setLoading(false));
  }, [repositoryId, componentId]);

  if (!componentId) {
    return (
      <div className="px-5 py-10 text-center text-[12.5px] text-[var(--cd-ink-faint)]">
        Select a node in the graph to inspect its dependencies, dependents, and issues.
      </div>
    );
  }

  if (loading || !component) {
    return (
      <div className="px-5 py-10 text-center text-[12.5px] text-[var(--cd-ink-faint)]">
        Loading component...
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <span className="rounded-[5px] bg-[var(--cd-sunken)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--cd-ink-soft)]">
        {component.type}
      </span>
      <div className="mt-2 text-[15px] font-semibold text-[var(--cd-ink)]">{component.name}</div>
      {component.description && (
        <div className="mt-1.5 text-[12px] leading-relaxed text-[var(--cd-ink-soft)]">
          {component.description}
        </div>
      )}

      <div className="mt-3.5 flex gap-5">
        <div>
          <div className="font-mono text-[18px] font-bold text-[var(--cd-ink)]">
            {component.dependencies.length}
          </div>
          <div className="text-[10.5px] text-[var(--cd-ink-faint)]">Dependencies</div>
        </div>
        <div>
          <div className="font-mono text-[18px] font-bold text-[var(--cd-ink)]">
            {component.dependents.length}
          </div>
          <div className="text-[10.5px] text-[var(--cd-ink-faint)]">Dependents</div>
        </div>
      </div>

      {component.technology && (
        <>
          <div className="mb-1.5 mt-3.5 text-[10.5px] font-bold uppercase tracking-wide text-[var(--cd-ink-faint)]">
            Technology
          </div>
          <span className="rounded-full bg-[var(--cd-sunken)] px-2.5 py-1 text-[11px] font-medium text-[var(--cd-ink-soft)]">
            {component.technology}
          </span>
        </>
      )}

      {component.issues.length > 0 && (
        <>
          <div className="mb-1.5 mt-3.5 text-[10.5px] font-bold uppercase tracking-wide text-[var(--cd-ink-faint)]">
            Issues
          </div>
          <div className="flex flex-wrap gap-1.5">
            {component.issues.map((issue) => (
              <span
                key={issue.id}
                className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                  issue.severity === "critical"
                    ? "bg-[var(--cd-risk-bg)] text-[var(--cd-risk)]"
                    : issue.severity === "warning"
                    ? "bg-[var(--cd-warn-bg)] text-[var(--cd-warn)]"
                    : "bg-[var(--cd-sunken)] text-[var(--cd-ink-soft)]"
                }`}
              >
                {issue.title}
              </span>
            ))}
          </div>
        </>
      )}

      <div className="mb-1.5 mt-3.5 text-[10.5px] font-bold uppercase tracking-wide text-[var(--cd-ink-faint)]">
        Dependencies
      </div>
      <div className="flex flex-col gap-1">
        {component.dependencies.length ? (
          component.dependencies.map((d) => (
            <div key={d.id} className="font-mono text-[12px] text-[var(--cd-ink)]">
              → {d.name}
            </div>
          ))
        ) : (
          <div className="text-[12px] text-[var(--cd-ink-faint)]">None</div>
        )}
      </div>

      <div className="mb-1.5 mt-3.5 text-[10.5px] font-bold uppercase tracking-wide text-[var(--cd-ink-faint)]">
        Used by
      </div>
      <div className="flex flex-col gap-1">
        {component.dependents.length ? (
          component.dependents.map((d) => (
            <div key={d.id} className="font-mono text-[12px] text-[var(--cd-ink)]">
              ← {d.name}
            </div>
          ))
        ) : (
          <div className="text-[12px] text-[var(--cd-ink-faint)]">None</div>
        )}
      </div>

      <button
        onClick={() => onAskAi(component.id)}
        className="mt-4 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-3 py-2 text-[12.5px] font-medium text-white hover:bg-[var(--cd-accent-hover)]"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Ask AI about this component
      </button>
    </div>
  );
}