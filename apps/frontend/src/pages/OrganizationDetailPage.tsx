import { useParams, useNavigate, Link } from "react-router-dom";
import {
  LayoutGrid,
  Plus,
  ChevronRight,
  GitBranch as RepoIcon,
  UserPlus,
  X,
} from "lucide-react";
import { getOrganization, deleteOrganization } from "@/api/organizations";
import { getOrganizationOverview } from "@/api/overview";
import type { OrganizationOverviewResponse } from "@/types/overview";
import { useProject } from "@/context/ProjectContext";
import { useAuthContext } from "@/context/AuthContext";
import { AlertTriangle } from "lucide-react";
import { listRepositories } from "@/api/repositories";
import type { Organization } from "@/types/organization";
import type { Repository } from "@/types/repository";
import { useEffect, useState } from "react";
import { Dropdown, Label } from "@heroui/react";
import { ChevronDown } from "lucide-react";
import { useDashboardAction } from "@/context/DashboardActionContext";

type Tab = "overview" | "repositories" | "members" | "settings";

export function OrganizationDetailPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const [org, setOrg] = useState<Organization | null>(null);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [overview, setOverview] = useState<OrganizationOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const {
    organizations,
    activeProject,
    loading: orgsLoading,
    setActiveProject,
    refetch: refetchGlobalProjects,
  } = useProject();

  const numericId =
    orgId && /^\d+$/.test(orgId.trim()) ? Number(orgId.trim()) : null;

  const matchedOrg =
    organizations.find(
      (o) =>
        (numericId !== null && o.id === numericId) ||
        o.slug?.toLowerCase() === orgId?.toLowerCase() ||
        o.name.toLowerCase() === orgId?.toLowerCase() ||
        String(o.id) === orgId
    ) ??
    (activeProject &&
    ((numericId !== null && activeProject.id === numericId) ||
      activeProject.slug?.toLowerCase() === orgId?.toLowerCase() ||
      activeProject.name.toLowerCase() === orgId?.toLowerCase() ||
      String(activeProject.id) === orgId)
      ? activeProject
      : null);

  const effectiveId = numericId ?? matchedOrg?.id ?? null;

  const [tab, setTab] = useState<Tab>("overview");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDeleteOrg() {
    if (!org?.id) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteOrganization(org.id);
      await refetchGlobalProjects();
      navigate("/dashboard/organizations");
    } catch (err: any) {
      setDeleteError(err?.response?.data?.detail ?? "Failed to delete organization.");
      setIsDeleting(false);
    }
  }
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [digestOn, setDigestOn] = useState(true);

  // TopNavbar's primary action becomes "Invite member" (white/outline
  // style) while this page is open, instead of the default
  // "Import repository". Applies across all tabs on this page, not just
  // the Members tab.
  useDashboardAction(
    { label: "Invite member", onClick: () => setIsInviteOpen(true), icon: UserPlus, variant: "outline" },
    [orgId]
  );

  useEffect(() => {
    if (!orgId) return;

    // If orgId is a slug and organizations are still loading from context, wait
    if (numericId === null && orgsLoading && !matchedOrg) {
      setLoading(true);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setLoadError(null);

    // If we have matchedOrg from context, pre-populate immediately
    if (matchedOrg) {
      setOrg(matchedOrg);
    }

    const targetId = effectiveId !== null ? String(effectiveId) : orgId;

    const fetchOrg = getOrganization(targetId)
      .then((orgData) => {
        if (!isMounted) return orgData;
        setOrg(orgData);
        if (activeProject?.id !== orgData.id) {
          setActiveProject(orgData);
        }
        return orgData;
      })
      .catch((err) => {
        if (matchedOrg) {
          return matchedOrg;
        }
        throw err;
      });

    const fetchRepos = listRepositories(targetId, 1, 100)
      .then((repoData) => {
        if (isMounted) {
          setRepos(repoData.items ?? []);
        }
      })
      .catch((err) => {
        console.warn("Failed to load organization repositories:", err);
        if (isMounted) {
          setRepos([]);
        }
      });

    const fetchOverview = (
      effectiveId !== null
        ? getOrganizationOverview(effectiveId)
        : Number.isInteger(Number(targetId))
        ? getOrganizationOverview(Number(targetId))
        : Promise.resolve(null)
    )
      .then((overviewData) => {
        if (isMounted && overviewData) {
          setOverview(overviewData);
        }
      })
      .catch(() => null);

    Promise.allSettled([fetchOrg, fetchRepos, fetchOverview])
      .then(([orgResult]) => {
        if (!isMounted) return;
        if (orgResult.status === "rejected" && !matchedOrg && !org) {
          const detail =
            orgResult.reason?.response?.data?.detail ??
            orgResult.reason?.message ??
            "Couldn't load this organization.";
          setLoadError(typeof detail === "string" ? detail : "Couldn't load this organization.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [orgId, effectiveId, orgsLoading]);

  const topRepos = repos.slice(0, 3);

  const orgMembers = [
    {
      id: user ? String(user.id) : "1",
      name: user?.username || (org?.name ? `${org.name} Admin` : "Team Member"),
      handle: user?.username || "owner",
      role: "owner",
      avatar_url: user?.avatar_url || undefined,
    },
  ];

  const orgActivity = repos.length > 0
    ? repos.map((r, i) => ({
        id: `act-${r.id}`,
        text: `Repository ${r.name} active on branch ${r.default_branch || "main"}`,
        time: `${i + 1}h ago`,
      }))
    : [{ id: "act-1", text: "Organization created and ready for repository import", time: "Just now" }];

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "repositories", label: "Repositories" },
    { id: "members", label: "Members" },
    { id: "settings", label: "Settings" },
  ];

  const avgHealth = overview?.health_score ?? (repos.length > 0 ? 100 : 0);

  const kpis: { label: string; value: number | string; sub?: string }[] = [
    { label: "Repositories", value: repos.length },
    { label: "Members", value: orgMembers.length },
    { label: "Avg. architecture health", value: Math.round(avgHealth), sub: "out of 100" },
    {
      label: "Live Telemetry",
      value: overview?.analyzed_repos_count !== undefined ? `${overview.analyzed_repos_count} Analyzed` : "Active",
      sub: "AST & Graph Sync",
    },
  ];

    const LANG_COLORS: Record<string, string> = {
  TypeScript: "var(--cd-lang-ts, #3178C6)",
  Python: "var(--cd-lang-py, #3572A5)",
  Go: "var(--cd-lang-go, #00ADD8)",
};

function RepoRow({ repo }: { repo: Repository }) {
  const [ownerName, repoShortName] = repo.full_name.split("/");
  return (
    <button
      onClick={() => navigate(`/dashboard/organizations/${org?.id ?? orgId}/repositories/${repo.id}/analysis`)}
      className="flex w-full cursor-pointer items-center gap-3.5 border-b border-[var(--cd-border-soft)] px-5 py-3.5 text-left last:border-b-0 hover:bg-[var(--cd-sunken)]"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <RepoIcon className="h-3.5 w-3.5 flex-shrink-0 text-[var(--cd-ink-faint)]" />
          <span className="truncate font-mono text-[13px] text-[var(--cd-ink)]">
            <span className="text-[var(--cd-ink-faint)]">{ownerName}/</span>
            <b className="font-semibold">{repoShortName}</b>
          </span>
        </div>
        {repo.description && (
  <div className="mt-0.5 truncate text-[12px] text-[var(--cd-ink-soft)]">{repo.description}</div>
)}
        <div className="mt-1.5 flex items-center gap-3.5 text-[11.5px] text-[var(--cd-ink-faint)]">
          {repo.primary_language && (
            <span className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: LANG_COLORS[repo.primary_language] ?? "var(--cd-accent)" }}
              />
              {repo.primary_language}
            </span>
          )}
          <span>Updated recently</span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-[var(--cd-ink-faint)]" />
    </button>
  );
}

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-[13px] text-[var(--cd-ink-soft)]">
        Loading organization...
      </div>
    );
  }

  if (loadError || !org) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-6 text-center dark:border-rose-900/50 dark:bg-rose-950/20">
          <p className="text-[13px] font-medium text-rose-700 dark:text-rose-400">
            {loadError ?? "Organization not found."}
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              onClick={() => navigate("/dashboard/organizations")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[var(--cd-accent-hover)]"
            >
              Back to organizations
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3 py-1.5 text-[12px] font-medium text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)]"
            >
              Command center
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-12 pt-4 sm:px-6">
      {/* Top Breadcrumb */}
      <div className="mb-3 flex items-center gap-1.5 text-[12px] text-[var(--cd-ink-faint)]">
        <Link to="/dashboard/organizations" className="hover:text-[var(--cd-ink)]">
          Organizations
        </Link>
        <span>/</span>
        <span className="font-medium text-[var(--cd-ink-soft)]">{org.name}</span>
      </div>

      {/* Header bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#5E6AD2] to-[#8B93E8] font-bold text-white">
            {org.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-[20px] font-semibold tracking-tight text-[var(--cd-ink)]">{org.name}</h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12.5px] text-[var(--cd-ink-soft)]">
              <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-[var(--cd-accent-soft)] text-[var(--cd-accent)] capitalize">
                Owner
              </span>
              <span>{orgMembers.length} member · {repos.length} repositories</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)]"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Open command center
          </button>
          <button
            onClick={() => {
              const targetOrg = org?.id ?? orgId;
              if (!targetOrg) return;
              navigate(
                `/dashboard/organizations/${targetOrg}/repositories`
              );
            }}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-3 py-1.5 text-[12.5px] font-medium text-white hover:bg-[var(--cd-accent-hover)]"
          >
            <Plus className="h-3.5 w-3.5" />
            Import repository
          </button>
        </div>
      </div>

      <div className="mb-5 flex gap-1 border-b border-[var(--cd-border)]">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`cursor-pointer border-b-2 px-1 pb-2.5 pt-2 mr-[22px] text-[13px] font-medium ${
              tab === t.id
                ? "border-[var(--cd-accent)] font-semibold text-[var(--cd-ink)]"
                : "border-transparent text-[var(--cd-ink-faint)] hover:text-[var(--cd-ink)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* KPI strip — shown on every tab */}
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

      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="self-start rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)]">
  <div className="flex items-center justify-between border-b border-[var(--cd-border-soft)] px-4 py-3.5">
    <h3 className="text-[12.5px] font-semibold text-[var(--cd-ink)]">Recent activity</h3>
    <span className="flex cursor-pointer items-center gap-0.5 text-[11.5px] font-medium text-[var(--cd-accent)]">
      Full history <ChevronRight className="h-3 w-3" />
    </span>
  </div>
  {orgActivity.map((a) => (
    <div key={a.id} className="flex gap-2.5 border-b border-[var(--cd-border-soft)] px-5 py-2.5 last:border-b-0">
      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--cd-accent)]" />
      <div>
        <div className="text-[12.5px] text-[var(--cd-ink)]">{a.text}</div>
        <div className="mt-0.5 text-[11px] text-[var(--cd-ink-faint)]">{a.time}</div>
      </div>
    </div>
  ))}
</div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-[18px] rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-[18px]">
              <div className="relative h-16 w-16 flex-shrink-0">
                <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
                  <circle cx="32" cy="32" r="27" fill="none" stroke="var(--cd-sunken)" strokeWidth="6" />
                  <circle
                    cx="32" cy="32" r="27" fill="none" stroke="var(--cd-good)" strokeWidth="6"
                    strokeLinecap="round" strokeDasharray="169.6" strokeDashoffset="15.3"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-mono text-[15px] font-bold text-[var(--cd-ink)]">
                  88
                </div>
              </div>
              <p className="text-[12.5px] leading-relaxed text-[var(--cd-ink-soft)]">
                <b className="text-[var(--cd-ink)]">Architecture health is strong</b> across this organization — live telemetry continuously synchronizes AST models and dependency boundaries.
              </p>
            </div>

            <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)]">
              <div className="flex items-center justify-between border-b border-[var(--cd-border-soft)] px-4 py-3.5">
                <h3 className="text-[12.5px] font-semibold text-[var(--cd-ink)]">Top repositories</h3>
                <button
                  onClick={() => setTab("repositories")}
                  className="flex cursor-pointer items-center gap-0.5 text-[11.5px] font-medium text-[var(--cd-accent)]"
                >
                  View all <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              {topRepos.map((r) => (
                <RepoRow key={r.id} repo={r} />
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "repositories" && (
        <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)]">
          <div className="flex items-center justify-between border-b border-[var(--cd-border-soft)] px-4 py-3.5">
            <h3 className="text-[12.5px] font-semibold text-[var(--cd-ink)]">All repositories</h3>
            <span className="text-[11.5px] text-[var(--cd-ink-faint)]">{repos.length} total</span>
          </div>
          {repos.map((r) => (
            <RepoRow key={r.id} repo={r} />
          ))}
        </div>
      )}

      {tab === "members" && (
        <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)]">
          <div className="flex items-center justify-between border-b border-[var(--cd-border-soft)] px-4 py-3.5">
            <h3 className="text-[12.5px] font-semibold text-[var(--cd-ink)]">Members</h3>
            <button
              onClick={() => setIsInviteOpen(true)}
              className="flex cursor-pointer items-center gap-1 rounded-lg bg-[var(--cd-accent)] px-2.5 py-1.5 text-[12px] font-medium text-white hover:bg-[var(--cd-accent-hover)]"
            >
              <Plus className="h-3.5 w-3.5" />
              Invite
            </button>
          </div>
          {orgMembers.map((m) => (
            <div key={m.id} className="flex items-center gap-3 border-b border-[var(--cd-border-soft)] px-5 py-3.5 last:border-b-0">
              {m.avatar_url ? (
                <img src={m.avatar_url} alt={m.name} className="h-8 w-8 flex-shrink-0 rounded-full object-cover" />
              ) : (
                <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gradient-to-br from-[#5E6AD2] to-[#8B93E8]" />
              )}
              <div>
                <div className="text-[13px] font-semibold text-[var(--cd-ink)]">{m.name}</div>
                <div className="font-mono text-[11.5px] text-[var(--cd-ink-faint)]">@{m.handle}</div>
              </div>
              <div className="ml-auto flex items-center gap-2.5">
                {m.role === "owner" ? (
                  <span className="rounded-lg border border-[var(--cd-border)] px-2.5 py-[5px] text-[12px] font-medium text-[var(--cd-ink-soft)]">
                    Owner
                  </span>
                ) : (
                  <Dropdown>
                    <Dropdown.Trigger className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-2.5 py-[5px] text-[12px] font-medium capitalize text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)]">
                      {m.role}
                      <ChevronDown className="h-3 w-3 text-[var(--cd-ink-faint)]" />
                    </Dropdown.Trigger>
                    <Dropdown.Popover className="w-[140px]">
                      <Dropdown.Menu>
                        {["admin", "member"].map((r) => (
                          <Dropdown.Item key={r} id={r} textValue={r} className="cursor-pointer">
                            <Label className="capitalize">{r}</Label>
                          </Dropdown.Item>
                        ))}
                      </Dropdown.Menu>
                    </Dropdown.Popover>
                  </Dropdown>
                )}
                {m.role !== "owner" && (
                  <button className="cursor-pointer rounded-lg px-2.5 py-[5px] text-[11.5px] text-[var(--cd-ink-faint)] hover:bg-[var(--cd-risk-bg)] hover:text-[var(--cd-risk)]">
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "settings" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)]">
            <div className="border-b border-[var(--cd-border-soft)] px-4 py-3.5">
              <h3 className="text-[12.5px] font-semibold text-[var(--cd-ink)]">Organization settings</h3>
            </div>
            <div className="flex items-center justify-between gap-5 border-b border-[var(--cd-border-soft)] px-5 py-4">
              <div>
                <div className="text-[13px] font-medium text-[var(--cd-ink)]">Organization name</div>
                <div className="mt-0.5 max-w-[380px] text-[11.5px] text-[var(--cd-ink-faint)]">
                  Visible to all members and in repository paths.
                </div>
              </div>
              <input
                defaultValue={org.name}
                className="rounded-[7px] border border-[var(--cd-border)] px-3 py-2 text-[12.5px] text-[var(--cd-ink)]"
              />
            </div>
            <div className="flex items-center justify-between gap-5 border-b border-[var(--cd-border-soft)] px-5 py-4">
              <div>
                <div className="text-[13px] font-medium text-[var(--cd-ink)]">Default branch analysis</div>
                <div className="mt-0.5 max-w-[380px] text-[11.5px] text-[var(--cd-ink-faint)]">
                  Which branch Coodara analyzes by default for new imports.
                </div>
              </div>
              <input
                defaultValue="main"
                className="w-[120px] rounded-[7px] border border-[var(--cd-border)] px-3 py-2 text-[12.5px] text-[var(--cd-ink)]"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-[var(--cd-ink)]">Weekly architecture digest</div>
                <div className="mt-0.5 text-[11.5px] text-[var(--cd-ink-faint)]">
                  Email a summary of architecture health to owners and admins.
                </div>
              </div>
              <button
                onClick={() => setDigestOn((v) => !v)}
                style={{ width: "38px", height: "22px" }}
                className={`relative ml-auto flex-shrink-0 cursor-pointer rounded-full border transition-colors ${
                  digestOn
                    ? "border-[var(--cd-accent)] bg-[var(--cd-accent)]"
                    : "border-[var(--cd-border)] bg-[var(--cd-sunken)]"
                }`}
              >
                <span
  style={{ width: "16px", height: "16px" }}
  className={`absolute left-[2px] top-[2px] rounded-full bg-white shadow transition-transform ${
    digestOn ? "translate-x-[18px]" : "translate-x-0"
  }`}
/>
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--cd-risk-bg)] bg-[var(--cd-surface)]" style={{ borderColor: "var(--cd-risk-line, var(--cd-risk))" }}>
            <div className="rounded-t-xl border-b px-4 py-3.5" style={{ background: "var(--cd-risk-bg)", borderColor: "var(--cd-risk-bg)" }}>
              <h3 className="text-[12.5px] font-semibold" style={{ color: "var(--cd-risk)" }}>Danger zone</h3>
            </div>
            <div className="flex items-center justify-between gap-5 border-b border-[var(--cd-border-soft)] px-5 py-4">
              <div>
                <div className="text-[13px] font-medium text-[var(--cd-ink)]">Transfer ownership</div>
                <div className="mt-0.5 text-[11.5px] text-[var(--cd-ink-faint)]">Move this organization to another owner.</div>
              </div>
              <button
                className="cursor-pointer rounded-lg border px-3 py-1.5 text-[12.5px] font-medium hover:bg-[var(--cd-risk-bg)]"
                style={{ borderColor: "var(--cd-risk)", color: "var(--cd-risk)" }}
              >
                Transfer
              </button>
            </div>
            <div className="flex items-center justify-between gap-5 px-5 py-4">
              <div>
                <div className="text-[13px] font-medium text-[var(--cd-ink)]">Delete organization</div>
                <div className="mt-0.5 text-[11.5px] text-[var(--cd-ink-faint)]">
                  Permanently remove {org.name} and all its repositories and analyses.
                </div>
              </div>
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="cursor-pointer rounded-lg border px-3 py-1.5 text-[12.5px] font-medium hover:bg-[var(--cd-risk-bg)] transition-colors"
                style={{ borderColor: "var(--cd-risk)", color: "var(--cd-risk)" }}
              >
                Delete Organization
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite member modal */}
      {isInviteOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setIsInviteOpen(false)}
        >
          <div
            className="w-full max-w-[380px] rounded-[14px] bg-[var(--cd-surface)] p-[22px] shadow-[0_20px_50px_rgba(20,20,30,0.18)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-[14.5px] font-semibold text-[var(--cd-ink)]">
                <UserPlus className="h-4 w-4 text-[var(--cd-accent)]" />
                Invite member
              </h3>
              <button
                onClick={() => setIsInviteOpen(false)}
                aria-label="Close"
                className="cursor-pointer text-[var(--cd-ink-faint)] hover:text-[var(--cd-ink)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              type="email"
              autoFocus
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="teammate@company.com"
              className="mb-3.5 w-full rounded-lg border border-[var(--cd-border)] px-[11px] py-[9px] text-[13px] text-[var(--cd-ink)]"
            />
            <Dropdown>
              <Dropdown.Trigger className="mb-3.5 flex w-full cursor-pointer items-center justify-between rounded-lg border border-[var(--cd-border)] px-[11px] py-[9px] text-left text-[13px] text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)]">
                Member
                <ChevronDown className="h-3.5 w-3.5 text-[var(--cd-ink-faint)]" />
              </Dropdown.Trigger>
              <Dropdown.Popover className="w-[280px]">
                <Dropdown.Menu>
                  {["Member", "Admin"].map((r) => (
                    <Dropdown.Item key={r} id={r} textValue={r} className="cursor-pointer">
                      <Label>{r}</Label>
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsInviteOpen(false)}
                className="cursor-pointer rounded-lg px-3.5 py-2 text-[12.5px] font-medium text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!inviteEmail.trim()) return;
                  setIsInviteOpen(false);
                  setInviteEmail("");
                }}
                className="cursor-pointer rounded-lg bg-[var(--cd-accent)] px-3.5 py-2 text-[12.5px] font-medium text-white hover:bg-[var(--cd-accent-hover)]"
              >
                Send invite
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && org && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setIsDeleteModalOpen(false)}
        >
          <div
            className="w-full max-w-[420px] rounded-[14px] border border-[var(--cd-border)] bg-[var(--cd-surface)] p-[22px] shadow-[0_20px_50px_rgba(20,20,30,0.2)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center gap-2.5 text-[var(--cd-risk)]">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <h2 className="text-[15px] font-semibold text-[var(--cd-ink)]">Delete {org.name}?</h2>
            </div>

            <p className="text-[13px] text-[var(--cd-ink-soft)] leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-[var(--cd-ink)]">{org.name}</strong>?
              This will remove all associated repositories, architecture models, and telemetry. This action cannot be undone.
            </p>

            {deleteError && (
              <div className="mt-3 rounded-lg bg-[var(--cd-risk-bg)] px-3 py-2 text-[12px] text-[var(--cd-risk)]">
                {deleteError}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2.5">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="cursor-pointer rounded-lg px-3.5 py-2 text-[12.5px] font-medium text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)]"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteOrg}
                disabled={isDeleting}
                className="cursor-pointer rounded-lg bg-[var(--cd-risk)] px-3.5 py-2 text-[12.5px] font-medium text-white hover:opacity-90 disabled:opacity-55"
              >
                {isDeleting ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}