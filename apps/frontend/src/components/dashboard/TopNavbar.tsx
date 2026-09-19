import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Kbd,
  Drawer,
  Button,
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
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "./ThemeToggle";
import { DISPLAY_NAME } from "@/components/dashboard/user";
import {
  useDashboardActionContext,
} from "@/context/DashboardActionContext";

interface Notification {
  id: string;
  title: string;
  detail: string;
  time: string;
  tag: "good" | "warn" | "risk";
  read: boolean;
}

import { useDashboardOverview } from "@/hooks/useDashboardOverview";

const tagColor: Record<
  Notification["tag"],
  string
> = {
  good: "var(--cd-good)",
  warn: "var(--cd-warn)",
  risk: "var(--cd-risk)",
};

interface TopNavbarProps {
  onOpenSidebar: () => void;
}

export function TopNavbar({
  onOpenSidebar,
}: TopNavbarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const dashboardData = useDashboardOverview();
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch {
      navigate("/login");
    }
  };

  const {
    action,
    openRepositoryImport,
  } = useDashboardActionContext();

  const [
    isNotifOpen,
    setIsNotifOpen,
  ] = useState(false);

  const [
    selectedNotif,
    setSelectedNotif,
  ] = useState<Notification | null>(null);

  const notifications: Notification[] = (dashboardData.allIssues || []).slice(0, 6).map((item, idx) => ({
    id: `notif-${item.issue.id || idx}`,
    title: item.issue.title || "Architectural Risk Detected",
    detail: `${item.repoName}: ${item.issue.description}`,
    time: "Live telemetry",
    tag: (item.issue.severity === "critical" ? "risk" : "warn") as Notification["tag"],
    read: readIds.has(`notif-${item.issue.id || idx}`),
  }));

  function openNotification(
    notification: Notification,
  ) {
    setSelectedNotif(notification);
    setReadIds((prev) => new Set([...prev, notification.id]));
  }

  function markAllRead() {
    setReadIds(new Set(notifications.map((n) => n.id)));
  }

  function handleNotifOpenChange(
    open: boolean,
  ) {
    setIsNotifOpen(open);

    if (!open) {
      setSelectedNotif(null);
    }
  }

  const initials = DISPLAY_NAME
    .split(" ")
    .map((part) => part[0])
    .join("");

  const ActionIcon = action?.icon ?? Plus;

  return (
    <header className="sticky top-0 z-30 flex h-[52px] flex-shrink-0 items-center gap-2 border-b border-[var(--cd-border)] bg-[var(--cd-surface)] px-3 sm:gap-3 sm:px-5">
      {/* Mobile menu */}
      <button
        type="button"
        onClick={onOpenSidebar}
        className="flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg p-0 text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)] md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Search */}
      <div className="hidden max-w-[380px] flex-1 items-center gap-1.5 rounded-lg border border-transparent bg-[var(--cd-sunken)] px-2.5 py-1.5 focus-within:border-[var(--cd-accent)] focus-within:bg-[var(--cd-surface)] sm:flex">
        <Search className="h-3.5 w-3.5 flex-shrink-0 text-[var(--cd-ink-faint)]" />

        <input
          type="text"
          placeholder="Search repositories, architecture, analyses..."
          className="w-full bg-transparent text-[12.5px] text-[var(--cd-ink)] placeholder:text-[var(--cd-ink-faint)] focus:outline-none"
        />

        <Kbd className="ml-auto flex-shrink-0 [&_*]:!border-[var(--cd-border)] [&_*]:!text-[var(--cd-ink-soft)]">
          <Kbd.Abbr keyValue="command" />
          <Kbd.Content>K</Kbd.Content>
        </Kbd>
      </div>

      <div className="flex-1" />

      {/* Help */}
      <button
        type="button"
        className="flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg p-0 text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)]"
        aria-label="Help"
      >
        <HelpCircle className="h-4 w-4" />
      </button>

      {/* Theme */}
      <ThemeToggle />

      {/* Notifications */}
      <button
        type="button"
        onClick={() => setIsNotifOpen(true)}
        className="relative flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg p-0 text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)]"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />

        {notifications.some(
          (notification) => !notification.read,
        ) && (
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full border-[1.5px] border-[var(--cd-surface)] bg-[var(--cd-risk)]" />
        )}
      </button>

      {/* Notification drawer */}
      <Drawer
        isOpen={isNotifOpen}
        onOpenChange={handleNotifOpenChange}
      >
        <Drawer.Backdrop className="p-0">
          <Drawer.Content
            placement="right"
            className="!m-0 h-full w-full sm:w-[360px] sm:max-w-[360px]"
          >
            <Drawer.Dialog>
              <Drawer.Header className="relative border-b border-[var(--cd-border-soft)] px-4 py-3 pr-11">
                <button
                  type="button"
                  onClick={() =>
                    setIsNotifOpen(false)
                  }
                  className="absolute right-3 top-3 cursor-pointer rounded-md p-1 text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)]"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {selectedNotif && (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedNotif(null)
                        }
                        className="cursor-pointer rounded-md p-1 text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)]"
                        aria-label="Back to all notifications"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                    )}

                    <Drawer.Heading className="text-[13px] font-semibold text-[var(--cd-ink)]">
                      {selectedNotif
                        ? "Notification"
                        : "Notifications"}
                    </Drawer.Heading>
                  </div>

                  {!selectedNotif && (
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[11.5px] font-medium text-[var(--cd-accent)] hover:bg-[var(--cd-accent-soft)]"
                    >
                      <Check className="h-3 w-3" />
                      Mark all as read
                    </button>
                  )}
                </div>
              </Drawer.Header>

              <Drawer.Body className="flex flex-col gap-1 p-2">
                {selectedNotif ? (
                  <div className="p-2.5">
                    <span
                      className="mb-2 inline-block h-2 w-2 rounded-full"
                      style={{
                        background:
                          tagColor[
                            selectedNotif.tag
                          ],
                      }}
                    />

                    <div className="text-[14px] font-medium text-[var(--cd-ink)]">
                      {selectedNotif.title}
                    </div>

                    <div className="mt-1.5 text-[13px] leading-relaxed text-[var(--cd-ink-soft)]">
                      {selectedNotif.detail}
                    </div>

                    <div className="mt-3 text-[11px] text-[var(--cd-ink-faint)]">
                      {selectedNotif.time}
                    </div>
                  </div>
                ) : (
                  notifications.map(
                    (notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() =>
                          openNotification(
                            notification,
                          )
                        }
                        className="flex cursor-pointer gap-2.5 rounded-lg p-2.5 text-left hover:bg-[var(--cd-sunken)]"
                      >
                        <span
                          className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full"
                          style={{
                            background:
                              notification.read
                                ? "var(--cd-border)"
                                : tagColor[
                                    notification.tag
                                  ],
                          }}
                        />

                        <div className="min-w-0">
                          <div className="text-[12.5px] font-medium text-[var(--cd-ink)]">
                            {notification.title}
                          </div>

                          <div className="text-[12px] text-[var(--cd-ink-soft)]">
                            {notification.detail}
                          </div>

                          <div className="mt-0.5 text-[11px] text-[var(--cd-ink-faint)]">
                            {notification.time}
                          </div>
                        </div>
                      </button>
                    ),
                  )
                )}
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>

      {/* Primary dashboard action */}
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className={
            action.variant === "outline"
              ? "flex h-8 w-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] p-0 text-[12.5px] font-medium text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)] md:h-auto md:w-auto md:px-3 md:py-1.5"
              : "flex h-8 w-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[var(--cd-accent)] p-0 text-[12.5px] font-medium text-white hover:bg-[var(--cd-accent-hover)] md:h-auto md:w-auto md:px-3 md:py-1.5"
          }
        >
          <ActionIcon className="h-4 w-4 flex-shrink-0" />

          <span className="hidden md:inline">
            {action.label}
          </span>
        </button>
      ) : (
        <Button
          variant="secondary"
          onClick={openRepositoryImport}
          className="flex h-8 w-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[var(--cd-accent)] p-0 text-[12.5px] font-medium text-white hover:bg-[var(--cd-accent-hover)] md:h-auto md:w-auto md:px-3 md:py-1.5"
        >
          <Plus className="h-4 w-4 flex-shrink-0" />

          <span className="hidden md:inline">
            Import repository
          </span>
        </Button>
      )}

      {/* User */}
      <Dropdown>
        <Dropdown.Trigger className="cursor-pointer rounded-full">
          <Avatar className="h-8 w-8">
            <Avatar.Fallback delayMs={0}>
              {initials}
            </Avatar.Fallback>
          </Avatar>
        </Dropdown.Trigger>

        <Dropdown.Popover className="w-[200px] overflow-hidden">
          <div className="px-3 pb-1 pt-3">
            <div className="flex items-center gap-2">
              <Avatar size="sm">
                <Avatar.Fallback delayMs={0}>
                  {initials}
                </Avatar.Fallback>
              </Avatar>

              <div className="flex min-w-0 flex-col">
                <p className="truncate text-sm font-medium leading-5 text-[var(--cd-ink)]">
                  {DISPLAY_NAME}
                </p>

                <p className="truncate text-xs leading-none text-[var(--cd-ink-faint)]">
                  {user?.email ?? ""}
                </p>
              </div>
            </div>
          </div>

          <Dropdown.Menu>
            <Dropdown.Item
              id="account"
              textValue="My Account"
              className="cursor-pointer"
            >
              <div className="flex w-full items-center justify-between gap-2">
                <Label>My Account</Label>

                <UserIcon className="h-3.5 w-3.5 text-[var(--cd-ink-faint)]" />
              </div>
            </Dropdown.Item>

            <Dropdown.Item
              id="logout"
              textValue="Logout"
              variant="danger"
              onAction={handleLogout}
              className="cursor-pointer"
            >
              <div className="flex w-full items-center justify-between gap-2">
                <Label>Log Out</Label>

                <LogOut className="h-3.5 w-3.5 text-[var(--cd-risk)]" />
              </div>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </header>
  );
}