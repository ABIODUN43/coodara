import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Kbd,
  Drawer,
  Dropdown,
  Avatar,
  Label,
} from "@heroui/react";
import {
  Menu,
  Search,
  HelpCircle,
  Bell,
  Plus,
  LogOut,
  User as UserIcon,
  X,
  ArrowLeft,
  Check,
  Building2,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "./ThemeToggle";
import { DISPLAY_NAME } from "@/components/dashboard/user";
import { useDashboardActionContext } from "@/context/DashboardActionContext";
import { useProject } from "@/context/ProjectContext";
import { useDashboardOverview } from "@/hooks/useDashboardOverview";
import { CommandPalette } from "./CommandPalette";

interface Notification {
  id: string;
  title: string;
  detail: string;
  time: string;
  tag: "good" | "warn" | "risk";
  read: boolean;
}

const tagColor: Record<Notification["tag"], string> = {
  good: "var(--cd-good)",
  warn: "var(--cd-warn)",
  risk: "var(--cd-risk)",
};

interface TopNavbarProps {
  onOpenSidebar: () => void;
}

export function TopNavbar({ onOpenSidebar }: TopNavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { activeProject } = useProject();
  const dashboardData = useDashboardOverview();
  const { action, openRepositoryImport } = useDashboardActionContext();

  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch {
      navigate("/login");
    }
  };

  const notifications: Notification[] = (dashboardData.allIssues || []).slice(0, 6).map((item, idx) => ({
    id: `notif-${item.issue.id || idx}`,
    title: item.issue.title || "Architectural Risk Detected",
    detail: `${item.repoName}: ${item.issue.description}`,
    time: "Live telemetry",
    tag: (item.issue.severity === "critical" ? "risk" : "warn") as Notification["tag"],
    read: readIds.has(`notif-${item.issue.id || idx}`),
  }));

  function openNotification(notification: Notification) {
    setSelectedNotif(notification);
    setReadIds((prev) => new Set([...prev, notification.id]));
  }

  function markAllRead() {
    setReadIds(new Set(notifications.map((n) => n.id)));
  }

  function handleNotifOpenChange(open: boolean) {
    setIsNotifOpen(open);
    if (!open) {
      setSelectedNotif(null);
    }
  }

  const displayName = user?.username || DISPLAY_NAME;
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Dynamic context breadcrumb calculation
  const path = location.pathname;
  let currentSection = "Dashboard";
  if (path.startsWith("/lab")) currentSection = "Architecture Lab";
  else if (path.startsWith("/findings") || path.startsWith("/risks") || path.startsWith("/recommendations")) currentSection = "Findings";
  else if (path.startsWith("/repositories")) currentSection = "Repositories";
  else if (path.startsWith("/architecture")) currentSection = "Architecture Map";
  else if (path.startsWith("/explorer")) currentSection = "Codebase Explorer";
  else if (path.startsWith("/chat") || path.startsWith("/ai-assistant")) currentSection = "Architecture Chat";
  else if (path.startsWith("/activity") || path.startsWith("/history") || path.startsWith("/memory")) currentSection = "Activity & Decisions";
  else if (path.startsWith("/reports")) currentSection = "Reports";
  else if (path.startsWith("/integrations")) currentSection = "Integrations";
  else if (path.startsWith("/settings/workspace")) currentSection = "Workspace Settings";
  else if (path.startsWith("/settings/project")) currentSection = "Project Settings";
  else if (path.startsWith("/settings")) currentSection = "Settings";
  else if (path === "/dashboard") currentSection = "Overview";

  const ActionIcon = action?.icon ?? Plus;

  return (
    <>
      <header className="sticky top-0 z-30 flex h-[52px] flex-shrink-0 items-center justify-between border-b border-[var(--cd-border)] bg-[var(--cd-surface)] px-3 sm:px-4">
        {/* Left: Mobile trigger & Context Breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-[6px] text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)] hover:text-[var(--cd-ink)] md:hidden transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="h-4 w-4" />
          </button>

          {/* Context Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[var(--cd-ink-soft)] min-w-0">
            {activeProject ? (
              <Link
                to={`/dashboard/organizations/${activeProject.id}`}
                className="flex items-center gap-1 font-medium text-[var(--cd-ink)] hover:text-[var(--cd-accent)] transition-colors truncate max-w-[130px] sm:max-w-[180px]"
              >
                <Building2 className="h-3 w-3 flex-shrink-0 text-[var(--cd-ink-faint)]" />
                <span className="truncate">{activeProject.name}</span>
              </Link>
            ) : (
              <span className="font-medium text-[var(--cd-ink)]">Coodara</span>
            )}
            <ChevronRight className="h-3 w-3 flex-shrink-0 text-[var(--cd-ink-faint)]" />
            <span className="font-medium text-[var(--cd-ink-soft)] truncate select-none">
              {currentSection}
            </span>
          </nav>
        </div>

        {/* Center / Left-Center: Global Command Search */}
        <div className="mx-2 sm:mx-4 flex-1 max-w-[380px] hidden sm:block">
          <button
            type="button"
            onClick={() => setIsCommandOpen(true)}
            className="group flex w-full cursor-pointer items-center justify-between rounded-[7px] border border-[var(--cd-border)] bg-[var(--cd-sunken)] px-2.5 py-1.5 text-left text-xs text-[var(--cd-ink-faint)] shadow-2xs hover:border-[var(--cd-border-strong)] hover:bg-[var(--cd-surface)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cd-accent)]"
            aria-label="Search or type command"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Search className="h-3.5 w-3.5 flex-shrink-0 text-[var(--cd-ink-faint)] group-hover:text-[var(--cd-ink-soft)] transition-colors" />
              <span className="truncate text-[12px] text-[var(--cd-ink-faint)] group-hover:text-[var(--cd-ink-soft)]">
                Search repositories, risks, or ask Coodara...
              </span>
            </div>
            <Kbd className="ml-1.5 flex-shrink-0 [&_*]:!border-[var(--cd-border)] [&_*]:!text-[var(--cd-ink-faint)] [&_*]:!bg-[var(--cd-surface)]">
              <Kbd.Abbr keyValue="command" />
              <Kbd.Content>K</Kbd.Content>
            </Kbd>
          </button>
        </div>

        {/* Right: Controls & User Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Mobile search button */}
          <button
            type="button"
            onClick={() => setIsCommandOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)] sm:hidden transition-colors"
            aria-label="Open search"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Help button */}
          <a
            href="https://github.com/ABIODUN43/coodara"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)] hover:text-[var(--cd-ink)] transition-colors"
            aria-label="Documentation and help"
            title="Documentation & help"
          >
            <HelpCircle className="h-4 w-4" />
          </a>

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Notifications button */}
          <button
            type="button"
            onClick={() => setIsNotifOpen(true)}
            className="relative flex h-8 w-8 items-center justify-center rounded-[6px] text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)] hover:text-[var(--cd-ink)] transition-colors cursor-pointer"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            {notifications.some((notification) => !notification.read) && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border border-[var(--cd-surface)] bg-[var(--cd-risk)]" />
            )}
          </button>

          {/* Primary Action Button (Import Repository) */}
          {action ? (
            <button
              type="button"
              onClick={action.onClick}
              className={
                action.variant === "outline"
                  ? "flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-[7px] border border-[var(--cd-border)] bg-[var(--cd-surface)] px-2.5 sm:px-3 text-xs font-medium text-[var(--cd-ink)] shadow-2xs hover:bg-[var(--cd-sunken)] transition-colors"
                  : "flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-[7px] bg-[var(--cd-accent)] px-2.5 sm:px-3 text-xs font-medium text-white shadow-xs hover:bg-[var(--cd-accent-hover)] transition-colors"
              }
            >
              <ActionIcon className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="hidden md:inline">{action.label}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={openRepositoryImport}
              className="flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-[7px] bg-[var(--cd-accent)] px-2.5 sm:px-3 text-xs font-medium text-white shadow-xs hover:bg-[var(--cd-accent-hover)] active:scale-[0.99] transition-all"
            >
              <Plus className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="hidden md:inline">Import repository</span>
            </button>
          )}

          {/* User Profile Dropdown */}
          <Dropdown>
            <Dropdown.Trigger className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--cd-accent)]">
              <Avatar className="h-7 w-7 border border-[var(--cd-border)]">
                <Avatar.Fallback delayMs={0} className="text-[11px] font-semibold">
                  {initials}
                </Avatar.Fallback>
              </Avatar>
            </Dropdown.Trigger>

            <Dropdown.Popover className="w-[220px] overflow-hidden rounded-[10px] border border-[var(--cd-border)] bg-[var(--cd-surface)] p-1 shadow-lg">
              <div className="border-b border-[var(--cd-border-soft)] px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Avatar size="sm" className="h-7 w-7">
                    <Avatar.Fallback delayMs={0} className="text-[11px] font-semibold">
                      {initials}
                    </Avatar.Fallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold leading-tight text-[var(--cd-ink)]">
                      {displayName}
                    </p>
                    <p className="truncate text-[11px] text-[var(--cd-ink-faint)] mt-0.5">
                      {user?.email ?? ""}
                    </p>
                  </div>
                </div>
              </div>

              <Dropdown.Menu className="p-1 space-y-0.5">
                <Dropdown.Item
                  id="settings"
                  textValue="Settings"
                  onAction={() => navigate("/dashboard/settings")}
                  className="cursor-pointer rounded-[6px] px-2 py-1.5 text-xs text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)]"
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <Label className="cursor-pointer">Settings</Label>
                    <UserIcon className="h-3.5 w-3.5 text-[var(--cd-ink-faint)]" />
                  </div>
                </Dropdown.Item>

                <Dropdown.Item
                  id="github"
                  textValue="GitHub Repository"
                  onAction={() => window.open("https://github.com/ABIODUN43/coodara", "_blank")}
                  className="cursor-pointer rounded-[6px] px-2 py-1.5 text-xs text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)]"
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <Label className="cursor-pointer">Coodara GitHub</Label>
                    <ExternalLink className="h-3.5 w-3.5 text-[var(--cd-ink-faint)]" />
                  </div>
                </Dropdown.Item>

                <Dropdown.Item
                  id="logout"
                  textValue="Logout"
                  variant="danger"
                  onAction={handleLogout}
                  className="cursor-pointer rounded-[6px] px-2 py-1.5 text-xs text-[var(--cd-risk)] hover:bg-[var(--cd-risk-bg)]"
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <Label className="cursor-pointer text-[var(--cd-risk)]">Log Out</Label>
                    <LogOut className="h-3.5 w-3.5 text-[var(--cd-risk)]" />
                  </div>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>
      </header>

      {/* Notifications Drawer */}
      <Drawer isOpen={isNotifOpen} onOpenChange={handleNotifOpenChange}>
        <Drawer.Backdrop className="p-0 bg-black/40 backdrop-blur-xs">
          <Drawer.Content placement="right" className="!m-0 h-full w-full sm:w-[380px] sm:max-w-[380px] border-l border-[var(--cd-border)] bg-[var(--cd-surface)]">
            <Drawer.Dialog>
              <Drawer.Header className="relative border-b border-[var(--cd-border-soft)] px-4 py-3 pr-10">
                <button
                  type="button"
                  onClick={() => setIsNotifOpen(false)}
                  className="absolute right-3 top-3 cursor-pointer rounded-[6px] p-1 text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)]"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {selectedNotif && (
                      <button
                        type="button"
                        onClick={() => setSelectedNotif(null)}
                        className="cursor-pointer rounded-[6px] p-1 text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)]"
                        aria-label="Back"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                    )}
                    <Drawer.Heading className="text-[13px] font-semibold text-[var(--cd-ink)]">
                      {selectedNotif ? "Notification Details" : "Notifications"}
                    </Drawer.Heading>
                  </div>

                  {!selectedNotif && (
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="flex cursor-pointer items-center gap-1 rounded-[6px] px-2 py-0.5 text-[11.5px] font-medium text-[var(--cd-accent)] hover:bg-[var(--cd-accent-soft)] transition-colors"
                    >
                      <Check className="h-3 w-3" />
                      Mark all as read
                    </button>
                  )}
                </div>
              </Drawer.Header>

              <Drawer.Body className="flex flex-col gap-1 p-2 overflow-y-auto">
                {selectedNotif ? (
                  <div className="p-3">
                    <span
                      className="mb-2 inline-block h-2 w-2 rounded-full"
                      style={{ background: tagColor[selectedNotif.tag] }}
                    />
                    <div className="text-[14px] font-semibold text-[var(--cd-ink)]">
                      {selectedNotif.title}
                    </div>
                    <div className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--cd-ink-soft)]">
                      {selectedNotif.detail}
                    </div>
                    <div className="mt-3 font-mono text-[10.5px] text-[var(--cd-ink-faint)]">
                      {selectedNotif.time}
                    </div>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[var(--cd-ink-faint)]">
                    No new notifications.
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => openNotification(notification)}
                      className="flex cursor-pointer gap-2.5 rounded-[8px] p-2.5 text-left hover:bg-[var(--cd-sunken)] transition-colors"
                    >
                      <span
                        className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full"
                        style={{
                          background: notification.read
                            ? "var(--cd-border)"
                            : tagColor[notification.tag],
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-medium text-[var(--cd-ink)] truncate">
                          {notification.title}
                        </div>
                        <div className="text-[11.5px] text-[var(--cd-ink-soft)] line-clamp-2 mt-0.5">
                          {notification.detail}
                        </div>
                        <div className="mt-1 text-[10.5px] font-mono text-[var(--cd-ink-faint)]">
                          {notification.time}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>

      {/* Global Command Palette (Cmd+K) */}
      <CommandPalette isOpen={isCommandOpen} onClose={() => setIsCommandOpen(false)} />
    </>
  );
}