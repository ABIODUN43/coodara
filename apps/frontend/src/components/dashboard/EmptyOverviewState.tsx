import {
  FolderGit2,
  Plus,
  Network,
  Binary,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyOverviewStateProps {
  onOpenImport: () => void;
  organizationName: string;
}

export function EmptyOverviewState({
  onOpenImport,
  organizationName,
}: EmptyOverviewStateProps) {
  const pipelineStages = [
    {
      step: "01",
      name: "Source Ingestion",
      desc: "AST parsing of imports, functions, and cross-file symbol bindings.",
      icon: FolderGit2,
    },
    {
      step: "02",
      name: "Call & Type Resolution",
      desc: "Resolves dynamic routes, database invocations, and caller-callee hierarchies.",
      icon: Binary,
    },
    {
      step: "03",
      name: "Topological Synthesis",
      desc: "Constructs directed graph G=(V,E) of services, modules, and domain boundaries.",
      icon: Network,
    },
    {
      step: "04",
      name: "Debt & Risk Verification",
      desc: "Detects circular dependencies, coupling violations, and architectural decay.",
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="py-8">
      {/* Hero technical banner */}
      <div className="rounded-[16px] border border-[var(--cd-border)] bg-[var(--cd-surface)] p-8 sm:p-10 shadow-xs text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[12px] bg-[var(--cd-accent-soft)] text-[var(--cd-accent)]">
          <Network className="h-7 w-7" />
        </div>

        <h2 className="mt-4 text-xl font-bold tracking-tight text-[var(--cd-ink)] sm:text-2xl font-heading">
          Your Architecture Starts Here
        </h2>

        <p className="mx-auto mt-2 max-w-xl text-[13.5px] leading-relaxed text-[var(--cd-ink-soft)]">
          Connect a repository to <b className="text-[var(--cd-ink)] font-semibold">{organizationName}</b> and
          Coodara will automatically reconstruct your software dependency topology, component
          boundaries, and structural risks.
        </p>

        {/* Primary Action Button */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="primary"
            size="lg"
            onClick={onOpenImport}
            className="gap-2 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Import First Repository</span>
          </Button>
        </div>

        {/* Pipeline Architecture Process Preview */}
        <div className="mt-12 border-t border-[var(--cd-border-soft)] pt-8 text-left">
          <div className="mb-4 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--cd-ink-faint)]">
              Continuous Architecture Reconstruction Pipeline
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pipelineStages.map((stage) => {
              const Icon = stage.icon;
              return (
                <div
                  key={stage.step}
                  className="rounded-[10px] border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)]/40 p-4 transition-colors hover:border-[var(--cd-border)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-[var(--cd-accent)]">
                      {stage.step}
                    </span>
                    <Icon className="h-4 w-4 text-[var(--cd-ink-faint)]" />
                  </div>

                  <h3 className="mt-2.5 text-[13px] font-bold text-[var(--cd-ink)]">
                    {stage.name}
                  </h3>

                  <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--cd-ink-soft)]">
                    {stage.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
