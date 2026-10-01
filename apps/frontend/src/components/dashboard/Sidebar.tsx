import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Logo } from "@/components/common/Logo";
import { Avatar } from "@heroui/react";
import {
  LayoutGrid,
  Building2,
  GitBranch,
  Network,
  AlertTriangle,
  Sparkles,
  GitCompare,
  Code2,
  MessageSquare,
  Brain,
  History,
  FileText,
  Settings,
  ChevronDown,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { useAuthContext } from "@/context/AuthContext";
import { useProject } from "@/context/ProjectContext";
import { useDashboardOverview } from "@/hooks/useDashboardOverview";

interface SidebarProps {
  isMobileOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutGrid;
  count?: number;
  badgeVariant?: "default" | "warning" | "risk";
  matchExact?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function Sidebar({
  isMobileOpen,
  onClose,
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const location = useLocation();
  const { user } = useAuthContext();
  const { organizations, activeProject, setActiveProject, loading: orgsLoading } = useProject();
  const dashboardData = useDashboardOverview();

  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    return localStorage.getItem("coodara_sidebar_collapsed") === "true";
  });

  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  function toggleCollapse() {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed((prev) => {
        const next = !prev;
        localStorage.setItem("coodara_sidebar_collapsed", String(next));
        return next;
      });
    }
  }

  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);

  // Close menus when route changes
  useEffect(() => {
    setIsProjectMenuOpen(false);
  }, [location.pathname]);

  const displayName = user?.username || "Developer";
  const initials = displayName.slice(0, 2).toUpperCase();
  const avatarUrl = user?.avatar_url || undefined;
  const userRole = user?.email || "Member";

  const repoCount = dashboardData.totalRepos;
  const riskCount = dashboardData.criticalFindingsCount + dashboardData.warningFindingsCount;
  const recCount = dashboardData.allRecommendations?.length ?? 0;
  const analyzedCount = dashboardData.analyzedReposCount;
  const maxQuota = 500;
  const quotaPct = Math.min(100, Math.max(3, (analyzedCount / maxQuota) * 100));

  const sections: NavSection[] = [
    {
      title: "Workspace",
      items: [
        {
          label: "Overview",
          href: "/dashboard",
          icon: LayoutGrid,
          matchExact: true,
        },
        {
          label: "Repositories",
          href: activeProject
            ? `/dashboard/organizations/${activeProject.id}/repositories`
            : "/dashboard/organizations",
          icon: GitBranch,
          count: repoCount > 0 ? repoCount : undefined,
        },
        {
          label: "Organizations",
          href: "/dashboard/organizations",
          icon: Building2,
          matchExact: true,
        },
      ],
    },
    {
      title: "Architecture",
      items: [
        {
          label: "Architecture",
          href: "/dashboard",
          icon: Network,
        },
        {
          label: "Risks",
          href: "/dashboard/risks",
          icon: AlertTriangle,
          count: riskCount > 0 ? riskCount : undefined,
          badgeVariant: riskCount > 0 ? "risk" : "default",
        },
        {
          label: "Recommendations",
          href: "/dashboard/recommendations",
          icon: Sparkles,
          count: recCount > 0 ? recCount : undefined,
          badgeVariant: "default",
        },
        {
          label: "What-if Simulation",
          href: activeProject
            ? `/dashboard/organizations/${activeProject.id}/repositories`
            : "/dashboard",
          icon: GitCompare,
        },
      ],
    },
    {
      title: "Engineering",
      items: [
        {
          label: "Code Studio",
          href: "/dashboard/chat",
          icon: Code2,
        },
        {
          label: "Chat",
          href: "/dashboard/chat",
          icon: MessageSquare,
        },
        {
          label: "Memory",
          href: "/dashboard/memory",
          icon: Brain,
        },
        {
          label: "History",
          href: "/dashboard/history",
          icon: History,
        },
        {
          label: "Reports",
          href: "/dashboard/reports",
          icon: FileText,
        },
      ],
    },
    {
      title: "System",
      items: [
        {
          label: "Settings",
          href: "/dashboard/settings",
          icon: Settings,
        },
      ],
    },
  ];

  function isItemActive(item: NavItem): boolean {
    if (item.matchExact) {
      return location.pathname === item.href;
    }
    if (item.label === "Repositories") {
      return location.pathname.includes("/repositories");
    }
    if (item.label === "Architecture") {
      return location.pathname.includes("/architecture");
    }
    if (item.label === "Code Studio") {
      return location.pathname.includes("/code") || location.pathname.includes("/studio");
    }
    if (item.label === "Chat") {
      return location.pathname.includes("/chat") || location.pathname.includes("/ai-assistant");
    }
    if (item.label === "Risks") {
      return location.pathname.includes("/risks");
    }
    if (item.label === "Recommendations") {
      return location.pathname.includes("/recommendations");
    }
    if (item.label === "Memory") {
      return location.pathname.includes("/memory");
    }
    if (item.label === "History") {
      return location.pathname.includes("/history");
    }
    if (item.label === "Reports") {
      return location.pathname.includes("/reports");
    }
    if (item.label === "Settings") {
      return location.pathname.includes("/settings");
    }
    return location.pathname.startsWith(item.href);
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Aside */}
      <aside
        className={`fixed z-50 flex h-screen flex-shrink-0 flex-col border-r border-[var(--cd-border)] bg-[var(--cd-sidebar)] transition-all duration-200 ease-in-out md:sticky md:top-0 ${
          isMobileOpen ? "translate-x-0 w-[248px]" : "-translate-x-full md:translate-x-0"
        } ${isCollapsed ? "md:w-[60px]" : "md:w-[240px]"}`}
        aria-label="Application Navigation"
      >
        {/* Header: Logo & Collapse Button */}
        <div className="flex h-[52px] items-center justify-between border-b border-[var(--cd-border-soft)] px-3">
          <Link
            to="/dashboard"
            onClick={onClose}
            className="flex items-center gap-2 overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-[var(--cd-accent)] rounded"
          >
            <Logo collapsed={isCollapsed} />
          </Link>

          {/* Desktop collapse toggle */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="hidden md:flex h-7 w-7 cursor-pointer items-center justify-center rounded-[6px] text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)] hover:text-[var(--cd-ink)] transition-colors"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={onClose}
            className="flex md:hidden h-7 w-7 cursor-pointer items-center justify-center rounded-[6px] text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)]"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Workspace / Organization Switcher */}
        <div className="relative mx-2 my-2">
          {isCollapsed ? (
            <div className="group relative flex justify-center py-1">
              <button
                type="button"
                onClick={toggleCollapse}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[6px] border border-[var(--cd-border)] bg-[var(--cd-surface)] text-[12px] font-semibold text-[var(--cd-ink)] shadow-2xs hover:bg-[var(--cd-sunken)]"
                aria-label="Select organization"
              >
                {(activeProject?.name || "O").charAt(0).toUpperCase()}
              </button>
              {/* Tooltip */}
              <div className="pointer-events-none absolute left-full ml-2 hidden z-50 whitespace-nowrap rounded-[6px] bg-[var(--cd-ink)] px-2 py-1 text-[11px] font-medium text-[var(--cd-surface)] shadow-md group-hover:block">
                {activeProject?.name ?? "Select organization"}
              </div>
            </div>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => setIsProjectMenuOpen((v) => !v)}
                className="flex w-full cursor-pointer items-center justify-between rounded-[7px] border border-[var(--cd-border)] bg-[var(--cd-surface)] px-2.5 py-1.5 text-left shadow-2xs hover:bg-[var(--cd-sunken)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cd-accent)]"
                aria-expanded={isProjectMenuOpen}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[4px] bg-[var(--cd-sunken)] border border-[var(--cd-border)] text-[11px] font-bold text-[var(--cd-ink)]">
                    {(activeProject?.name || "O").charAt(0).toUpperCase()}
                  </span>
                  <span className="truncate text-[12.5px] font-medium text-[var(--cd-ink)]">
                    {activeProject?.name ?? "Select organization"}
                  </span>
                </div>
                <ChevronDown
                  className={`h-3.5 w-3.5 flex-shrink-0 text-[var(--cd-ink-faint)] transition-transform duration-150 ${
                    isProjectMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Workspace dropdown menu */}
              {isProjectMenuOpen && (
                <div className="absolute left-0 top-full z-40 mt-1 w-full rounded-[8px] border border-[var(--cd-border)] bg-[var(--cd-surface)] p-1 shadow-lg animate-in fade-in-0 duration-100">
                  <div className="px-2 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--cd-ink-faint)]">
                    Organizations
                  </div>
                  {orgsLoading ? (
                    <div className="px-2 py-1.5 text-xs text-[var(--cd-ink-faint)]">
                      Loading...
                    </div>
                  ) : (
                    organizations.map((org) => {
                      const isSelected = org.id === activeProject?.id;
                      return (
                        <button
                          key={org.id}
                          type="button"
                          onClick={() => {
                            setActiveProject(org);
                            setIsProjectMenuOpen(false);
                          }}
                          className={`flex w-full cursor-pointer items-center justify-between rounded-[6px] px-2 py-1.5 text-left text-xs transition-colors ${
                            isSelected
                              ? "bg-[var(--cd-accent-soft)] font-medium text-[var(--cd-accent)]"
                              : "text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)]"
                          }`}
                        >
                          <span className="truncate">{org.name}</span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-[var(--cd-accent)]" />}
                        </button>
                      );
                    })
                  )}
                  <div className="mt-1 border-t border-[var(--cd-border-soft)] pt-1">
                    <Link
                      to="/dashboard/organizations"
                      onClick={() => setIsProjectMenuOpen(false)}
                      className="flex w-full items-center gap-1.5 rounded-[6px] px-2 py-1 text-xs text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)] hover:text-[var(--cd-ink)]"
                    >
                      <Building2 className="h-3 w-3" />
                      <span>Manage organizations</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-4">
          {sections.map((section) => (
            <div key={section.title}>
              {!isCollapsed && (
                <div className="px-2.5 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--cd-ink-faint)] select-none">
                  {section.title}
                </div>
              )}

              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isItemActive(item);
                  const Icon = item.icon;

                  return (
                    <div key={item.label} className="group relative">
                      <Link
                        to={item.href}
                        onClick={onClose}
                        className={`flex items-center rounded-[7px] text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cd-accent)] ${
                          isCollapsed
                            ? "h-8 w-8 mx-auto justify-center"
                            : "gap-2.5 px-2.5 py-1.5"
                        } ${
                          active
                            ? "bg-[var(--cd-accent-soft)] font-medium text-[var(--cd-accent)]"
                            : "text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)] hover:text-[var(--cd-ink)]"
                        }`}
                        aria-current={active ? "page" : undefined}
                      >
                        <Icon className={`h-4 w-4 flex-shrink-0 ${active ? "text-[var(--cd-accent)]" : "text-[var(--cd-ink-soft)]"}`} />

                        {!isCollapsed && (
                          <>
                            <span className="truncate">{item.label}</span>

                            {item.count !== undefined && (
                              <span
                                className={`ml-auto rounded-full px-1.5 py-0.2 font-mono text-[10.5px] font-medium ${
                                  item.badgeVariant === "risk"
                                    ? "bg-[var(--cd-risk-bg)] text-[var(--cd-risk)]"
                                    : "bg-[var(--cd-sunken)] text-[var(--cd-ink-faint)]"
                                }`}
                              >
                                {item.count}
                              </span>
                            )}
                          </>
                        )}
                      </Link>

                      {/* Tooltip for collapsed mode */}
                      {isCollapsed && (
                        <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden z-50 whitespace-nowrap rounded-[6px] bg-[var(--cd-ink)] px-2.5 py-1 text-xs font-medium text-[var(--cd-surface)] shadow-md group-hover:block">
                          <div className="flex items-center gap-1.5">
                            <span>{item.label}</span>
                            {item.count !== undefined && (
                              <span className="rounded-full bg-white/20 px-1 text-[10px] font-mono">
                                {item.count}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer: Analysis Usage & User Account */}
        <div className="mt-auto border-t border-[var(--cd-border-soft)] p-2">
          {/* Analysis Quota (Hidden when collapsed) */}
          {!isCollapsed && (
            <div className="mb-3 rounded-[8px] bg-[var(--cd-sunken)] p-2.5">
              <div className="mb-1.5 flex items-center justify-between text-[11px] text-[var(--cd-ink-soft)]">
                <span className="font-medium">Analysis Quota</span>
                <span className="font-mono text-[10.5px] text-[var(--cd-ink-faint)]">
                  {analyzedCount}/{maxQuota}
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--cd-border)]">
                <div
                  className="h-full rounded-full bg-[var(--cd-accent)] transition-all duration-300"
                  style={{ width: `${quotaPct}%` }}
                />
              </div>
            </div>
          )}

          {/* User Account Strip */}
          <div
            className={`flex items-center rounded-[8px] p-1.5 text-left hover:bg-[var(--cd-sunken)] transition-colors ${
              isCollapsed ? "justify-center" : "gap-2.5"
            }`}
          >
            <Avatar className="h-7 w-7 flex-shrink-0">
              {avatarUrl ? <Avatar.Image src={avatarUrl} alt={displayName} /> : null}
              <Avatar.Fallback delayMs={0}>{initials}</Avatar.Fallback>
            </Avatar>

            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium leading-tight text-[var(--cd-ink)]">
                  {displayName}
                </div>
                <div className="text-[10.5px] text-[var(--cd-ink-faint)] capitalize">
                  {userRole}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}