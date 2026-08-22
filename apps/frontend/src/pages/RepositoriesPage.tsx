import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Dropdown, Label } from "@heroui/react";
import { Search, GitBranch as RepoIcon, ChevronRight, ChevronDown, Check } from "lucide-react";
import { useProject } from "@/context/ProjectContext";
import { repos as allRepos, BAND, bandFor, type Band } from "@/data/MockDashboard";

type SortMode = "health-desc" | "health-asc" | "name" | "updated";

const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: "health-desc", label: "Health (high to low)" },
  { id: "health-asc", label: "Health (low to high)" },
  { id: "name", label: "Name (A–Z)" },
  { id: "updated", label: "Recently updated" },
];

function miniHeatmap(seed: number) {
  const cells: string[] = [];
  for (let i = 0; i < 12; i++) {
    const v = Math.abs(Math.sin(seed * 13.7 + i * 3.1));
    let color = "var(--cd-sunken)";
    if (v > 0.75) color = "var(--cd-accent)";
    else if (v > 0.5) color = "var(--cd-accent-soft)";
    else if (v > 0.3) color = "var(--cd-border)";
    cells.push(color);
  }
  return cells;
}

function highlight(text: string, term: string) {
  if (!term) return text;
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-[3px] bg-[var(--cd-accent-soft)] px-px text-[var(--cd-accent)]">
        {text.slice(idx, idx + term.length)}
      </mark>
      {text.slice(idx + term.length)}
    </>
  );
}

export function RepositoriesPage() {
  const { activeProject } = useProject();
  const [activeBand, setActiveBand] = useState<Band | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("health-desc");

  const counts = useMemo(
    () => ({
      all: allRepos.length,
      good: allRepos.filter((r) => bandFor(r.score) === "good").length,
      warn: allRepos.filter((r) => bandFor(r.score) === "warn").length,
      risk: allRepos.filter((r) => bandFor(r.score) === "risk").length,
    }),
    []
  );

  const list = useMemo(() => {
    let filtered = allRepos.filter((r) => {
      const matchesBand = activeBand === "all" || bandFor(r.score) === activeBand;
      const matchesSearch =
        !searchTerm ||
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.lang.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesBand && matchesSearch;
    });

    filtered = [...filtered];
    if (sortMode === "health-desc") filtered.sort((a, b) => b.score - a.score);
    else if (sortMode === "health-asc") filtered.sort((a, b) => a.score - b.score);
    else if (sortMode === "name") filtered.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortMode === "updated") filtered.sort((a, b) => a.updatedRank - b.updatedRank);

    return filtered;
  }, [activeBand, searchTerm, sortMode]);

  const filters: { id: Band | "all"; label: string; count: number; dot?: string }[] = [
    { id: "all", label: "All", count: counts.all },
    { id: "good", label: "Healthy", count: counts.good, dot: BAND.good.color },
    { id: "warn", label: "Watch", count: counts.warn, dot: BAND.warn.color },
    { id: "risk", label: "At risk", count: counts.risk, dot: BAND.risk.color },
  ];

  return (
    <div className="px-4 pb-10 pt-4 sm:px-6">
      <div className="mb-2.5 flex flex-wrap items-center gap-1.5 text-[12px] text-[var(--cd-ink-soft)]">
        <Link
          to={`/dashboard/organizations/${activeProject.id}`}
          className="flex items-center gap-1.5 font-semibold text-[var(--cd-ink)] hover:text-[var(--cd-accent)]"
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-[5px] bg-[var(--cd-accent)] text-white">
            <RepoIcon className="h-2.5 w-2.5" />
          </span>
          {activeProject.name}
        </Link>
        <ChevronRight className="h-3 w-3 text-[var(--cd-ink-faint)]" />
        <span className="font-medium text-[var(--cd-ink-soft)]">Repositories</span>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[18px] font-semibold tracking-tight text-[var(--cd-ink)]">Repositories</h1>
        <span className="text-[12px] text-[var(--cd-ink-faint)]">
          <span className="font-mono">{allRepos.length}</span> repositories
        </span>
      </div>

      <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)]">
        <div className="flex flex-wrap items-center gap-2.5 px-5 pb-0 pt-4">
          <div className="flex min-w-[200px] max-w-[340px] flex-1 items-center gap-1.5 rounded-lg border border-[var(--cd-border)] px-3 py-2 focus-within:border-[var(--cd-accent)]">
            <Search className="h-3.5 w-3.5 flex-shrink-0 text-[var(--cd-ink-faint)]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by name or language..."
              className="w-full bg-transparent text-[12.5px] text-[var(--cd-ink)] outline-none placeholder:text-[var(--cd-ink-faint)]"
            />
          </div>
          <Dropdown>
            <Dropdown.Trigger className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-2.5 py-[7px] text-[12px] font-medium text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)]">
              Sort: {SORT_OPTIONS.find((o) => o.id === sortMode)?.label}
              <ChevronDown className="h-3 w-3" />
            </Dropdown.Trigger>
            <Dropdown.Popover className="w-[220px]">
              <Dropdown.Menu>
                {SORT_OPTIONS.map((opt) => (
                  <Dropdown.Item
                    key={opt.id}
                    id={opt.id}
                    textValue={opt.label}
                    onAction={() => setSortMode(opt.id)}
                    className="cursor-pointer"
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <Label>{opt.label}</Label>
                      {opt.id === sortMode && <Check className="h-3.5 w-3.5 text-[var(--cd-accent)]" />}
                    </div>
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>

        <div className="flex flex-wrap gap-2 px-5 pb-1 pt-3">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveBand(f.id)}
              className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-[5px] text-[12px] font-medium ${
                activeBand === f.id
                  ? "border-transparent bg-[var(--cd-accent-soft)] text-[var(--cd-accent)]"
                  : "border-[var(--cd-border)] text-[var(--cd-ink-soft)]"
              }`}
            >
              {f.dot && <span className="h-[7px] w-[7px] rounded-full" style={{ background: f.dot }} />}
              {f.label}
              <span className={`font-mono text-[11px] ${activeBand === f.id ? "text-[var(--cd-accent)]" : "text-[var(--cd-ink-faint)]"}`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-2">
          {list.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-14 text-center text-[var(--cd-ink-faint)]">
              <Search className="mb-1 h-7 w-7" />
              <b className="text-[13px] font-semibold text-[var(--cd-ink-soft)]">No repositories match</b>
              <span className="max-w-[320px] text-[12px]">Try a different search term or clear the active filter.</span>
            </div>
          ) : (
            list.map((r, i) => {
              const band = bandFor(r.score);
              return (
                <div
                  key={r.id}
                  className="flex cursor-pointer items-center gap-3.5 border-b border-[var(--cd-border-soft)] px-5 py-3.5 last:border-b-0 hover:bg-[var(--cd-sunken)]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <RepoIcon className="h-3.5 w-3.5 flex-shrink-0 text-[var(--cd-ink-faint)]" />
                      <span className="truncate font-mono text-[13px] font-semibold text-[var(--cd-ink)]">
                        <span className="font-normal text-[var(--cd-ink-faint)]">{activeProject.id}/</span>
                        {highlight(r.name, searchTerm)}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-[12px] text-[var(--cd-ink-soft)]">{r.desc}</div>
                    <div className="mt-1.5 flex items-center gap-3.5 text-[11.5px] text-[var(--cd-ink-faint)]">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ background: r.langColor }} />
                        {r.lang}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 rounded-[5px] px-[7px] py-[3px] text-[10.5px] font-semibold"
                        style={{ background: BAND[band].bg, color: BAND[band].color }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: "currentColor" }} />
                        {BAND[band].label}
                      </span>
                    </div>
                  </div>

                  <div className="hidden flex-shrink-0 gap-[2px] sm:grid sm:h-6 sm:w-[70px] sm:grid-cols-6 sm:grid-rows-2 sm:[grid-auto-flow:column]">
                    {miniHeatmap(i + 1).map((color, idx) => (
                      <span key={idx} className="h-[5px] w-[5px] rounded-[1.5px]" style={{ background: color }} />
                    ))}
                  </div>

                  <div className="flex flex-shrink-0 items-center gap-4">
                    <div className="text-right">
                      <div className="font-mono text-[15px] font-semibold" style={{ color: BAND[band].color }}>
                        {r.score.toFixed(1)}
                        <span className="font-normal text-[var(--cd-ink-faint)]">/10</span>
                      </div>
                      <div className="mt-1.5 h-[7px] w-[88px] overflow-hidden rounded-full bg-[var(--cd-sunken)]">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${r.score * 10}%`, background: BAND[band].color }}
                        />
                      </div>
                    </div>
                    <div className="hidden w-16 text-right text-[11.5px] text-[var(--cd-ink-faint)] sm:block">
                      {r.updatedLabel}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}