import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X, ChevronRight } from "lucide-react";
import {
  initialOrganizations,
  type Organization,
  BAND,
} from "@/data/MockDashboard";

export function OrganizationsPage() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>(initialOrganizations);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");

  const totalMembers = organizations.reduce((sum, o) => sum + o.members, 0);
  const totalRepos = organizations.reduce((sum, o) => sum + o.repos, 0);
  const avgHealth = organizations.length
    ? Math.round(organizations.reduce((sum, o) => sum + o.health, 0) / organizations.length)
    : 0;

  const kpis = [
    { label: "Organizations", value: organizations.length },
    { label: "Total repositories", value: totalRepos },
    { label: "Total members", value: totalMembers },
    { label: "Avg. architecture health", value: avgHealth, sub: "out of 100" },
  ];

  const handleCreate = () => {
    const name = newOrgName.trim();
    if (!name) return;
    const newOrg: Organization = {
      id: name.toLowerCase().replace(/\s+/g, "-"),
      name,
      role: "owner",
      members: 1,
      repos: 0,
      health: 0,
      band: "good",
    };
    setOrganizations((prev) => [newOrg, ...prev]);
    setIsModalOpen(false);
    setNewOrgName("");
  };

  return (
    <div className="px-4 pb-10 pt-4 sm:px-6">
      <div className="mb-4 text-[12px] text-[var(--cd-ink-faint)]">Workspace</div>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight text-[var(--cd-ink)]">
            Organizations
          </h1>
          <p className="mt-1 max-w-[520px] text-[12.5px] text-[var(--cd-ink-soft)]">
            Teams and companies using Coodara. Each organization has its own members, repositories, and architecture data.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-3 py-1.5 text-[12.5px] font-medium text-white hover:bg-[var(--cd-accent-hover)]"
        >
          <Plus className="h-3.5 w-3.5" />
          Create organization
        </button>
      </div>

      {/* KPI strip */}
      <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-[var(--cd-border)] bg-[var(--cd-border)] sm:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-[var(--cd-surface)] p-4">
            <div className="text-[11px] font-medium text-[var(--cd-ink-faint)]">{k.label}</div>
            <div className="mt-1.5 font-mono text-[21px] font-semibold tracking-tight text-[var(--cd-ink)]">
              {k.value}
            </div>
            {k.sub && <div className="mt-0.5 text-[11.5px] text-[var(--cd-ink-faint)]">{k.sub}</div>}
          </div>
        ))}
      </div>

      <div className="mb-3 flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--cd-ink-faint)]">
          Your organizations
        </span>
        <div className="h-px flex-1 bg-[var(--cd-border-soft)]" />
      </div>

      {/* Org grid */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {organizations.map((org) => (
          <button
            key={org.id}
            onClick={() => navigate(`/dashboard/organizations/${org.id}`)}
            className="flex cursor-pointer flex-col gap-3.5 rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-[18px] text-left transition-all hover:border-[#D2D3DA] hover:shadow-[0_6px_20px_rgba(20,20,30,0.06)]"
          >
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[9px] bg-[var(--cd-accent)] text-[14px] font-bold text-white">
                  {org.name[0]}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[14.5px] font-semibold text-[var(--cd-ink)]">
                    {org.name}
                  </div>
                  <div className="mt-0.5 text-[10.5px] uppercase tracking-wide text-[var(--cd-ink-faint)]">
                    {org.role}
                  </div>
                </div>
              </div>
              <span
                className={`flex-shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-semibold capitalize ${
                  org.role === "owner"
                    ? "bg-[var(--cd-accent-soft)] text-[var(--cd-accent)]"
                    : "bg-[var(--cd-sunken)] text-[var(--cd-ink-soft)]"
                }`}
              >
                {org.role}
              </span>
            </div>

            <div className="flex gap-[18px]">
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[15px] font-semibold text-[var(--cd-ink)]">{org.members}</span>
                <span className="text-[10.5px] text-[var(--cd-ink-faint)]">Members</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[15px] font-semibold text-[var(--cd-ink)]">{org.repos}</span>
                <span className="text-[10.5px] text-[var(--cd-ink-faint)]">Repositories</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[15px] font-semibold text-[var(--cd-ink)]">{org.health}</span>
                <span className="text-[10.5px] text-[var(--cd-ink-faint)]">Health score</span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--cd-border-soft)] pt-3">
              <span
                className="inline-flex items-center gap-1 rounded-[5px] px-[7px] py-[3px] text-[10.5px] font-semibold"
                style={{ background: BAND[org.band].bg, color: BAND[org.band].color }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "currentColor" }} />
                {BAND[org.band].label}
              </span>
              <span className="flex items-center gap-0.5 text-[11.5px] font-medium text-[var(--cd-accent)]">
                Open <ChevronRight className="h-3 w-3" />
              </span>
            </div>
          </button>
        ))}

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex min-h-[168px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--cd-border)] text-[var(--cd-ink-faint)] hover:border-[var(--cd-accent)] hover:bg-[var(--cd-accent-soft)] hover:text-[var(--cd-accent)]"
        >
          <Plus className="h-5 w-5" />
          <span className="text-[12.5px] font-medium">Create organization</span>
        </button>
      </div>

      {/* Create org modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-[400px] rounded-[14px] border border-[var(--cd-border)] bg-[var(--cd-surface)] p-[22px] shadow-[0_16px_40px_rgba(20,20,30,0.16)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-[var(--cd-ink)]">Create organization</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                aria-label="Close"
                className="cursor-pointer text-[var(--cd-ink-faint)] hover:text-[var(--cd-ink)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-3 flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-[var(--cd-ink-soft)]">Organization name</span>
              <input
                type="text"
                autoFocus
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="e.g. Northbridge Analytics"
                className="rounded-lg border border-[var(--cd-border)] bg-[var(--cd-sunken)] px-[11px] py-[9px] text-[13px] text-[var(--cd-ink)] outline-none focus:border-[var(--cd-accent)] focus:bg-[var(--cd-surface)]"
              />
            </div>
            <div className="mt-[18px] flex justify-end gap-2.5">
              <button
                onClick={() => setIsModalOpen(false)}
                className="cursor-pointer rounded-lg px-3.5 py-2 text-[12.5px] font-medium text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="cursor-pointer rounded-lg bg-[var(--cd-accent)] px-3.5 py-2 text-[12.5px] font-medium text-white hover:bg-[var(--cd-accent-hover)]"
              >
                Create organization
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}