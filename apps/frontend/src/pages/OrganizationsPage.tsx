import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X, ChevronRight, ChevronDown, Check } from "lucide-react";
import { Dropdown, Label } from "@heroui/react";
import { listOrganizations, createOrganization } from "@/api/organizations";
import { listRepositories } from "@/api/repositories";
import type { Organization } from "@/types/organization";
import { USE_MOCK_ORGANIZATIONS_DATA, USE_MOCK_REPOSITORIES_DATA } from "@/dev/devFlags";
import { MOCK_ORGANIZATIONS } from "@/data/mockOrganizations";
import { getMockRepositoriesForOrg } from "@/data/mockRepositories";
import { useDashboardAction } from "@/context/DashboardActionContext";

// role/members/health/band are extra fields present on the mock dataset
// for demo purposes — the real OrganizationResponse contract doesn't
// include them yet, so everything below treats them as optional and
// degrades gracefully (badge/health/status pill just don't render) once
// running against the real backend.
interface OrgWithExtras extends Organization {
  repoCount: number;
  role?: "owner" | "admin" | "member";
  membersCount?: number;
  healthScore?: number;
}

type Band = "good" | "warn" | "risk";

const BAND_STYLE: Record<Band, { dot: string; bg: string; text: string; label: string }> = {
  good: { dot: "bg-[var(--cd-good)]", bg: "bg-[var(--cd-good-bg)]", text: "text-[var(--cd-good)]", label: "Healthy" },
  warn: { dot: "bg-[var(--cd-warn)]", bg: "bg-[var(--cd-warn-bg)]", text: "text-[var(--cd-warn)]", label: "Watch" },
  risk: { dot: "bg-[var(--cd-risk)]", bg: "bg-[var(--cd-risk-bg)]", text: "text-[var(--cd-risk)]", label: "At risk" },
};

function bandFor(healthScore?: number): Band | undefined {
  if (healthScore == null) return undefined;
  if (healthScore >= 85) return "good";
  if (healthScore >= 70) return "warn";
  return "risk";
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const ROLE_FILTERS = ["All roles", "Owner", "Admin", "Member"] as const;

export function OrganizationsPage() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<OrgWithExtras[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<(typeof ROLE_FILTERS)[number]>("All roles");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgDescription, setNewOrgDescription] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // TopNavbar's primary action becomes "Create organization" while this
  // page is open, instead of the default "Import repository".
  useDashboardAction(
    { label: "Create organization", onClick: () => setIsModalOpen(true) },
    []
  );

  async function loadOrgs() {
    if (USE_MOCK_ORGANIZATIONS_DATA) {
      const withCounts = MOCK_ORGANIZATIONS.map((org: any) => ({
        ...org,
        repoCount: getMockRepositoriesForOrg(org.id).length,
        role: org.role,
        membersCount: org.members,
        healthScore: org.health,
      }));
      setOrganizations(withCounts);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const orgs = await listOrganizations();
      const withCounts = await Promise.all(
        orgs.map(async (org) => {
          try {
            const repos = await listRepositories(org.id, 1, 1);
            return { ...org, repoCount: repos.total };
          } catch {
            return { ...org, repoCount: 0 };
          }
        })
      );
      setOrganizations(withCounts);
    } catch {
      setLoadError("Couldn't load organizations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrgs();
  }, []);

  const filteredOrganizations = useMemo(() => {
    if (roleFilter === "All roles") return organizations;
    return organizations.filter(
      (o) => o.role?.toLowerCase() === roleFilter.toLowerCase()
    );
  }, [organizations, roleFilter]);

  const totalRepos = organizations.reduce((sum, o) => sum + o.repoCount, 0);
  const totalMembers = organizations.reduce((sum, o) => sum + (o.membersCount ?? 0), 0);
  const orgsWithHealth = organizations.filter((o) => o.healthScore != null);
  const avgHealth = orgsWithHealth.length
    ? Math.round(
        orgsWithHealth.reduce((sum, o) => sum + (o.healthScore ?? 0), 0) / orgsWithHealth.length
      )
    : null;

  const kpis: { label: string; value: number | string; sub?: string }[] = [
    { label: "Organizations", value: organizations.length },
    { label: "Total repositories", value: totalRepos },
    ...(totalMembers > 0 ? [{ label: "Total members", value: totalMembers }] : []),
    ...(avgHealth != null
      ? [{ label: "Avg. architecture health", value: avgHealth, sub: "out of 100" }]
      : []),
  ];

  async function handleCreate() {
    const name = newOrgName.trim();
    if (!name) return;
    if (USE_MOCK_ORGANIZATIONS_DATA) {
      setCreateError("Creating organizations is disabled while running on demo data.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await createOrganization({
        name,
        slug: slugify(name),
        description: newOrgDescription.trim() || null,
      });
      setIsModalOpen(false);
      setNewOrgName("");
      setNewOrgDescription("");
      await loadOrgs();
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setCreateError("An organization with that name already exists.");
      } else {
        setCreateError(err?.response?.data?.detail ?? "Couldn't create organization.");
      }
    } finally {
      setCreating(false);
    }
  }

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

        {/* Role filter — replaces the page-level Create button. Actual
            creation happens via the TopNavbar action (top of screen) or
            the dashed "Create organization" tile in the grid below. */}
        <Dropdown>
          <Dropdown.Trigger className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3 text-[12.5px] font-medium text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)]">
            <ChevronDown className="h-3.5 w-3.5" />
            {roleFilter}
          </Dropdown.Trigger>
          <Dropdown.Popover className="w-[160px]">
            <Dropdown.Menu>
              {ROLE_FILTERS.map((r) => (
                <Dropdown.Item
                  key={r}
                  id={r}
                  textValue={r}
                  onAction={() => setRoleFilter(r)}
                  className="cursor-pointer"
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <Label>{r}</Label>
                    {r === roleFilter && <Check className="h-3.5 w-3.5 text-[var(--cd-accent)]" />}
                  </div>
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>

      {!loading && kpis.length > 0 && (
        <div
          className="mb-6 grid gap-px overflow-hidden rounded-[10px] border border-[var(--cd-border)] bg-[var(--cd-border)]"
          style={{ gridTemplateColumns: `repeat(${kpis.length}, minmax(0, 1fr))` }}
        >
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
      )}

      <div className="mb-3 flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--cd-ink-faint)]">
          Your organizations
        </span>
        <div className="h-px flex-1 bg-[var(--cd-border-soft)]" />
      </div>

      {loading && (
        <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-8 text-center text-[13px] text-[var(--cd-ink-soft)]">
          Loading organizations...
        </div>
      )}

      {!loading && loadError && (
        <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-8 text-center text-[13px] text-[var(--cd-risk)]">
          {loadError}
        </div>
      )}

      {!loading && !loadError && organizations.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] px-6 py-16 text-center">
          <div className="text-[14px] font-semibold text-[var(--cd-ink)]">No organizations yet</div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-3.5 py-2 text-[12.5px] font-medium text-white hover:bg-[var(--cd-accent-hover)]"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Organization
          </button>
        </div>
      )}

      {!loading && !loadError && organizations.length > 0 && (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredOrganizations.map((org) => {
            const band = bandFor(org.healthScore);
            return (
              <button
                key={org.id}
                onClick={() => navigate(`/dashboard/organizations/${org.id}`)}
                className="flex cursor-pointer flex-col gap-3.5 rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-[18px] text-left transition-all hover:border-[#D2D3DA] hover:shadow-[0_6px_20px_rgba(20,20,30,0.06)]"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[9px] bg-[var(--cd-accent)] text-[14px] font-bold text-white">
                      {org.name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[14.5px] font-semibold text-[var(--cd-ink)]">
                        {org.name}
                      </div>
                      <div className="mt-0.5 truncate text-[10.5px] uppercase tracking-wide text-[var(--cd-ink-faint)]">
                        {org.role ?? org.description}
                      </div>
                    </div>
                  </div>
                  {org.role && (
                    <span
                      className={`flex-shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-semibold capitalize ${
                        org.role === "owner"
                          ? "bg-[var(--cd-accent-soft)] text-[var(--cd-accent)]"
                          : "bg-[var(--cd-sunken)] text-[var(--cd-ink-soft)]"
                      }`}
                    >
                      {org.role}
                    </span>
                  )}
                </div>

                <div className="flex gap-[18px]">
                  {org.membersCount != null && (
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-[15px] font-semibold text-[var(--cd-ink)]">
                        {org.membersCount}
                      </span>
                      <span className="text-[10.5px] text-[var(--cd-ink-faint)]">Members</span>
                    </div>
                  )}
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-[15px] font-semibold text-[var(--cd-ink)]">
                      {org.repoCount}
                    </span>
                    <span className="text-[10.5px] text-[var(--cd-ink-faint)]">Repositories</span>
                  </div>
                  {org.healthScore != null && (
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-[15px] font-semibold text-[var(--cd-ink)]">
                        {org.healthScore}
                      </span>
                      <span className="text-[10.5px] text-[var(--cd-ink-faint)]">Health score</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-[var(--cd-border-soft)] pt-3">
                  {band ? (
                    <span
                      className={`inline-flex items-center gap-1 rounded-[5px] px-[7px] py-[3px] text-[10.5px] font-semibold ${BAND_STYLE[band].bg} ${BAND_STYLE[band].text}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${BAND_STYLE[band].dot}`} />
                      {BAND_STYLE[band].label}
                    </span>
                  ) : (
                    <span />
                  )}
                  <span className="flex items-center gap-0.5 text-[11.5px] font-medium text-[var(--cd-accent)]">
                    Open <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </button>
            );
          })}

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--cd-border)] text-[var(--cd-ink-faint)] hover:border-[var(--cd-accent)] hover:bg-[var(--cd-accent-soft)] hover:text-[var(--cd-accent)]"
          >
            <Plus className="h-5 w-5" />
            <span className="text-[12.5px] font-medium">Create organization</span>
          </button>
        </div>
      )}

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

            {createError && (
              <div className="mb-3 rounded-lg bg-[var(--cd-risk-bg)] px-3 py-2 text-[12px] text-[var(--cd-risk)]">
                {createError}
              </div>
            )}

            <div className="mb-3 flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-[var(--cd-ink-soft)]">Organization name</span>
              <input
                type="text"
                autoFocus
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="e.g. Northbridge Analytics"
                className="rounded-lg border border-[var(--cd-border)] bg-[var(--cd-sunken)] px-[11px] py-[9px] text-[13px] text-[var(--cd-ink)] outline-none focus:border-[var(--cd-accent)] focus:bg-[var(--cd-surface)]"
              />
            </div>
            <div className="mb-3 flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-[var(--cd-ink-soft)]">Description (optional)</span>
              <input
                type="text"
                value={newOrgDescription}
                onChange={(e) => setNewOrgDescription(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="What does this organization do?"
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
                disabled={creating || !newOrgName.trim()}
                className="cursor-pointer rounded-lg bg-[var(--cd-accent)] px-3.5 py-2 text-[12.5px] font-medium text-white hover:bg-[var(--cd-accent-hover)] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {creating ? "Creating..." : "Create organization"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}