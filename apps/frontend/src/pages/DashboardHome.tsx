import { useState } from "react";
import { Dropdown, Label } from "@heroui/react";
import { Clock, ChevronDown, Zap, Check, GitCompare  } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { useProject } from "@/context/ProjectContext";
import { ArchitectureSection } from "@/components/dashboard/ArchitectureSection";
import { ArchitectureTimeline } from "@/components/dashboard/ArchitectureTimeline";
import { CodeHealthHotspots } from "@/components/dashboard/CodeHealthHotspots";
import { RiskActivitySection } from "@/components/dashboard/RiskActivitySection";
import { RecommendedActions } from "@/components/dashboard/RecommendedActions";
import { RepositoriesSection } from "@/components/dashboard/RepositoriesSection";

const dateRanges = ["Last 7 days", "Last 30 days", "Last 90 days", "All time"];
type Tab = "overview" | "hotspots" | "risks";

const kpis = [
  { label: "Architecture health", value: "Healthy", sub: "92/100", delta: "↑ 4 pts vs last 30d", dot: "var(--cd-good)", deltaColor: "var(--cd-good)" },
  { label: "Risk level", value: "Medium", delta: "↓ 8% vs last 30d", dot: "var(--cd-warn)", deltaColor: "var(--cd-good)" },
  { label: "Critical findings", value: "3", delta: "1 new this week", dot: "var(--cd-risk)", deltaColor: "var(--cd-risk)" },
  { label: "Repositories", value: "12", delta: "2 added this week", deltaColor: "var(--cd-ink-faint)" },
];

const healthBreakdown = [
  { label: "Maintainability", value: 91 },
  { label: "Complexity", value: 84 },
  { label: "Coupling", value: 73 },
  { label: "Modularity", value: 88 },
];

const trendHistory = [79, 82, 81, 85, 88, 92].map((v, i) => ({ i, v }));

export function DashboardHome() {
  const { activeProject, loading: orgsLoading } = useProject();
  const [dateRange, setDateRange] = useState(dateRanges[1]);
  const [tab, setTab] = useState<Tab>("overview");

  if (orgsLoading) {
    return (
      <div className="px-4 pb-10 pt-4 sm:px-6 text-[13px] text-[var(--cd-ink-soft)]">
        Loading...
      </div>
    );
  }
  if (!activeProject) {
    return (
      <div className="px-4 pb-10 pt-4 sm:px-6 text-[13px] text-[var(--cd-ink-soft)]">
        No organization selected — create one to get started.
      </div>
    );
  }

  return (
    <div className="px-4 pb-10 pt-4 sm:px-6">
      {/* Page head */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5 text-[12px] text-[var(--cd-ink-soft)]">
        <span className="flex items-center gap-1.5 font-semibold text-[var(--cd-ink)]">
          <span className="flex h-4 w-4 items-center justify-center rounded-[5px] bg-[var(--cd-accent)] text-white">
            <Zap className="h-2.5 w-2.5" />
          </span>
          {activeProject.name}
        </span>
        <span className="text-[var(--cd-ink-faint)]">/</span>
        {activeProject.description && (
          <span className="rounded-full bg-[var(--cd-sunken)] px-2 py-0.5 text-[11px] text-[var(--cd-ink-faint)]">
            {activeProject.description}
          </span>
        )}
        <span className="text-[var(--cd-ink-faint)]">/</span>
        <span className="font-medium text-[var(--cd-ink-soft)]">Architecture</span>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[18px] font-semibold tracking-tight text-[var(--cd-ink)]">
          Architecture Command Center
        </h1>

        <div className="flex flex-wrap items-center gap-2">
          <Dropdown>
            <Dropdown.Trigger className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)]">
              <Clock className="h-3 w-3" />
              {dateRange}
              <ChevronDown className="h-3 w-3" />
            </Dropdown.Trigger>
            <Dropdown.Popover className="w-[160px]">
              <Dropdown.Menu>
                {dateRanges.map((range) => (
                  <Dropdown.Item
                    key={range}
                    id={range}
                    textValue={range}
                    onAction={() => setDateRange(range)}
                    className="cursor-pointer"
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <Label>{range}</Label>
                      {range === dateRange && <Check className="h-3.5 w-3.5 text-[var(--cd-accent)]" />}
                    </div>
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>

          <div className="flex overflow-hidden rounded-lg border border-[var(--cd-border)]">
            {(["overview", "hotspots", "risks"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`cursor-pointer px-2.5 py-1.5 text-[12px] font-medium capitalize ${
                  tab === t
                    ? "bg-[var(--cd-accent-soft)] text-[var(--cd-accent)]"
                    : "text-[var(--cd-ink-faint)] hover:bg-[var(--cd-sunken)]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tab === "overview" && (
        <>
          <div className="mb-5 flex gap-2.5 rounded-xl border border-[var(--cd-accent-soft)] bg-[var(--cd-accent-soft)] p-3">
            <Zap className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--cd-accent)]" />
            <p className="text-[13px] leading-relaxed text-[var(--cd-ink-soft)]">
              Your architecture <b className="text-[var(--cd-ink)]">gained 2 services and 1 new dependency</b> this
              month. A <b className="text-[var(--cd-ink)]">circular dependency is emerging</b> between auth-service
              and user-service, and coupling between payment and billing is trending up.{" "}
              <b className="text-[var(--cd-ink)]">3 actions</b> would resolve the highest-risk pattern.
            </p>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[12px] text-[var(--cd-ink-faint)]">{k.label}</span>
                  {k.dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: k.dot }} />}
                </div>
                <div
                  className="text-[19px] font-semibold"
                  style={{ color: k.label === "Architecture health" ? k.dot : "var(--cd-ink)" }}
                >
                  {k.value}
                </div>
                {k.sub && <div className="mt-0.5 text-[11px] text-[var(--cd-ink-faint)]">{k.sub}</div>}
                <div className="mt-1.5 text-[11px]" style={{ color: k.deltaColor }}>
                  {k.delta}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-4">
              <h3 className="mb-3 text-[13px] font-semibold text-[var(--cd-ink)]">Last snapshot</h3>
              <div className="font-mono text-[18px] font-bold text-[var(--cd-ink)]">Today, 11:43 AM</div>
              <div className="mt-1 text-[11.5px] text-[var(--cd-ink-faint)]">
                Auto-captured after every analysis
              </div>
              <button className="mt-3 flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-[var(--cd-border)] px-2.5 py-1.5 text-[11.5px] text-[var(--cd-ink-faint)]">
                <GitCompare className="h-3.5 w-3.5" />
                Compare snapshot — coming soon
              </button>
            </div>

            <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-4">
              <h3 className="mb-3 text-[13px] font-semibold text-[var(--cd-ink)]">Most at risk</h3>
              <div className="font-mono text-[18px] font-bold text-[var(--cd-ink)]">payment-service</div>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="rounded-full bg-[var(--cd-risk-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--cd-risk)]">
                  High risk
                </span>
                <span className="text-[11.5px] text-[var(--cd-ink-faint)]">Coupling +22% this month</span>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-4">
              <h3 className="mb-3 text-[13px] font-semibold text-[var(--cd-ink)]">Health breakdown</h3>
              <div className="flex flex-col gap-2">
                {healthBreakdown.map((h) => (
                  <div key={h.label} className="flex items-center gap-2">
                    <span className="w-[88px] flex-shrink-0 text-[11.5px] text-[var(--cd-ink-soft)]">
                      {h.label}
                    </span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--cd-sunken)]">
                      <div
                        className="h-full rounded-full bg-[var(--cd-accent)]"
                        style={{ width: `${h.value}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-[11.5px] text-[var(--cd-ink-faint)]">{h.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-4">
              <h3 className="text-[13px] font-semibold text-[var(--cd-ink)]">Architecture trend</h3>
              <div className="mt-1 text-[11px] text-[var(--cd-ink-faint)]">Architecture health</div>
              <div className="mt-1 flex items-end justify-between">
                <div className="text-[24px] font-semibold text-[var(--cd-ink)]">92</div>
                <div className="h-10 w-20">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendHistory}>
                      <Line
                        type="monotone"
                        dataKey="v"
                        stroke="var(--cd-good)"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="mt-1 text-[11px] text-[var(--cd-good)]">↑ +7 this month</div>
            </div>
          </div>
          <div className="mt-7">
          <ArchitectureSection />
          </div>

<div className="mt-7">
  <ArchitectureTimeline />
</div>

<div className="mt-7">
  <div className="mb-3 flex items-center gap-2">
    <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--cd-ink-faint)]">
      Code health &amp; hotspots
    </span>
    <div className="h-px flex-1 bg-[var(--cd-border)]" />
  </div>
  <CodeHealthHotspots />
</div>

<div className="mt-7">
  <div className="mb-3 flex items-center gap-2">
    <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--cd-ink-faint)]">
      Risk &amp; activity
    </span>
    <div className="h-px flex-1 bg-[var(--cd-border)]" />
  </div>
  <RiskActivitySection />
</div>

<div className="mt-7">
  <div className="mb-3 flex items-center gap-2">
    <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--cd-ink-faint)]">
      Recommended actions
    </span>
    <div className="h-px flex-1 bg-[var(--cd-border)]" />
  </div>
  <RecommendedActions />
</div>

<div className="mt-7">
  <div className="mb-3 flex items-center gap-2">
    <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--cd-ink-faint)]">
      Repositories
    </span>
    <div className="h-px flex-1 bg-[var(--cd-border)]" />
  </div>
  <RepositoriesSection />
</div>
        </>
      )}

      {tab === "hotspots" && (
        <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-6 text-[13px] text-[var(--cd-ink-soft)]">
          Hotspots view — complexity × change frequency breakdown coming here.
        </div>
      )}

      {tab === "risks" && (
        <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-6 text-[13px] text-[var(--cd-ink-soft)]">
          Risks view — full risk list coming here.
        </div>
      )}
    </div>
  );
}