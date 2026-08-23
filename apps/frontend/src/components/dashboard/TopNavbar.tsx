import { useEffect, useRef, useState } from "react";
import { Kbd, Drawer, Button, Dropdown, Avatar, Label } from "@heroui/react";
import {
  Menu,
  Search,
  HelpCircle,
  Bell,
  Plus,
  LogOut,
  User as UserIcon,
  GitMerge,
  X,
  ArrowLeft,
  Check,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "./ThemeToggle";
import { DISPLAY_NAME } from "@/components/dashboard/user";
import { useDashboardActionContext } from "@/context/DashboardActionContext";

interface Notification {
  id: string;
  title: string;
  detail: string;
  time: string;
  tag: "good" | "warn" | "risk";
  read: boolean;
}

const initialNotifications: Notification[] = [
  { id: "1", title: "Analysis completed", detail: "backend-api architecture score improved to 8.4", time: "10:42 AM", tag: "good", read: false },
  { id: "2", title: "Circular dependency detected", detail: "auth-service ↔ user-service", time: "09:15 AM", tag: "risk", read: false },
  { id: "3", title: "Coupling increasing", detail: "payment-service ↔ billing-service, up 22% this month", time: "Yesterday", tag: "warn", read: false },
  { id: "4", title: "New repository imported", detail: "analytics-service added to Acme Engineering", time: "Yesterday", tag: "good", read: true },
  { id: "5", title: "Service size threshold crossed", detail: "notification-service exceeded 14K lines", time: "Jul 22", tag: "warn", read: true },
];

const tagColor: Record<Notification["tag"], string> = {
  good: "var(--cd-good)",
  warn: "var(--cd-warn)",
  risk: "var(--cd-risk)",
};

interface TopNavbarProps {
  onOpenSidebar: () => void;
}

export function TopNavbar({ onOpenSidebar }: TopNavbarProps) {
  const { user, logout } = useAuth();
  const { action } = useDashboardActionContext();
  const [isImportOpen, setIsImportOpen] = useState(false);
  const importRef = useRef<HTMLDivElement>(null);

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (importRef.current && !importRef.current.contains(e.target as Node)) {
        setIsImportOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function openNotification(n: Notification) {
    setSelectedNotif(n);
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((x) => ({ ...x, read: true })));
  }

  function handleNotifOpenChange(open: boolean) {
    setIsNotifOpen(open);
    if (!open) setSelectedNotif(null);
  }

  const initials = DISPLAY_NAME.split(" ").map((p) => p[0]).join("");
  const ActionIcon = action?.icon ?? Plus;

  return (
    <header className="sticky top-0 z-30 flex h-[52px] flex-shrink-0 items-center gap-2 border-b border-[var(--cd-border)] bg-[var(--cd-surface)] px-3 sm:gap-3 sm:px-5">
      <button
        onClick={onOpenSidebar}
        className="flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg p-0 text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)] md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </button>

      <div className="hidden max-w-[380px] flex-1 items-center gap-1.5 rounded-lg border border-transparent bg-[var(--cd-sunken)] px-2.5 py-1.5 focus-within:border-[var(--cd-accent)] focus-within:bg-[var(--cd-surface)] sm:flex">
        <Search className="h-3.5 w-3.5 flex-shrink-0 text-[var(--cd-ink-faint)]" />
        <input
          type="text"
          placeholder="Search repositories, architecture, analyses..."
          className="w-full bg-transparent text-[12.5px] text-[var(--cd-ink)] placeholder:text-[var(--cd-ink-faint)] focus:outline-none"
        />
        <Kbd className="ml-auto flex-shrink-0 [&_*]:!text-[var(--cd-ink-soft)] [&_*]:!border-[var(--cd-border)]">
          <Kbd.Abbr keyValue="command" />
          <Kbd.Content>K</Kbd.Content>
        </Kbd>
      </div>

      <div className="flex-1" />

      <button
        className="flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg p-0 text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)]"
        aria-label="Help"
      >
        <HelpCircle className="h-4 w-4" />
      </button>

      <ThemeToggle />

      <button
        onClick={() => setIsNotifOpen(true)}
        className="relative flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg p-0 text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)]"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {notifications.some((n) => !n.read) && (
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full border-[1.5px] border-[var(--cd-surface)] bg-[var(--cd-risk)]" />
        )}
      </button>

      <Drawer isOpen={isNotifOpen} onOpenChange={handleNotifOpenChange}>
        <Drawer.Backdrop className="p-0">
          <Drawer.Content placement="right" className="!m-0 h-full w-full sm:w-[360px] sm:max-w-[360px]">
            <Drawer.Dialog>
              <Drawer.Header className="relative border-b border-[var(--cd-border-soft)] px-4 py-3 pr-11">
                <button
                  onClick={() => setIsNotifOpen(false)}
                  className="absolute right-3 top-3 cursor-pointer rounded-md p-1 text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)]"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {selectedNotif && (
                      <button
                        onClick={() => setSelectedNotif(null)}
                        className="cursor-pointer rounded-md p-1 text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)]"
                        aria-label="Back to all notifications"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                    )}
                    <Drawer.Heading className="text-[13px] font-semibold text-[var(--cd-ink)]">
                      {selectedNotif ? "Notification" : "Notifications"}
                    </Drawer.Heading>
                  </div>
                  {!selectedNotif && (
                    <button
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
                      style={{ background: tagColor[selectedNotif.tag] }}
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
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => openNotification(n)}
                      className="flex cursor-pointer gap-2.5 rounded-lg p-2.5 text-left hover:bg-[var(--cd-sunken)]"
                    >
                      <span
                        className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full"
                        style={{ background: n.read ? "var(--cd-border)" : tagColor[n.tag] }}
                      />
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-medium text-[var(--cd-ink)]">{n.title}</div>
                        <div className="text-[12px] text-[var(--cd-ink-soft)]">{n.detail}</div>
                        <div className="mt-0.5 text-[11px] text-[var(--cd-ink-faint)]">{n.time}</div>
                      </div>
                    </button>
                  ))
                )}
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>

      {/* Primary action button — shows whatever the current page registered
          via useDashboardAction (e.g. "Create organization" on
          OrganizationsPage, "Invite member" on OrganizationDetailPage).
          Falls back to the default Import Repository dropdown when no
          page has claimed it (Dashboard overview, Repositories, Analysis,
          Architecture, etc. all use this default, unchanged). */}
      {action ? (
        <button
          onClick={action.onClick}
          className={
            action.variant === "outline"
              ? "flex h-8 w-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] p-0 text-[12.5px] font-medium text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)] md:h-auto md:w-auto md:px-3 md:py-1.5"
              : "flex h-8 w-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[var(--cd-accent)] p-0 text-[12.5px] font-medium text-white hover:bg-[var(--cd-accent-hover)] md:h-auto md:w-auto md:px-3 md:py-1.5"
          }
        >
          <ActionIcon className="h-4 w-4 flex-shrink-0" />
          <span className="hidden md:inline">{action.label}</span>
        </button>
      ) : (
        <div className="relative" ref={importRef}>
          <Button
            variant="secondary"
            onClick={() => setIsImportOpen((v) => !v)}
            className="flex h-8 w-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[var(--cd-accent)] p-0 text-[12.5px] font-medium text-white hover:bg-[var(--cd-accent-hover)] md:h-auto md:w-auto md:px-3 md:py-1.5"
          >
            <Plus className="h-4 w-4 flex-shrink-0" />
            <span className="hidden md:inline">Import repository</span>
          </Button>
          {isImportOpen && (
            <div className="absolute right-0 z-20 mt-1.5 w-[200px] overflow-hidden rounded-[10px] border border-[var(--cd-border)] bg-[var(--cd-surface)] shadow-[0_10px_28px_rgba(20,20,30,0.1)]">
              <div className="flex items-center justify-between border-b border-[var(--cd-border-soft)] px-3 py-2">
                <span className="text-[11.5px] font-semibold text-[var(--cd-ink-soft)]">Connect a source</span>
                <button
                  onClick={() => setIsImportOpen(false)}
                  className="cursor-pointer text-[var(--cd-ink-faint)]"
                  aria-label="Close"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {["GitHub", "GitLab", "Bitbucket"].map((source) => (
                <button
                  key={source}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-[12.5px] text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)]"
                >
                  <GitMerge className="h-3.5 w-3.5 text-[var(--cd-ink-soft)]" />
                  {source}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <Dropdown>
        <Dropdown.Trigger className="cursor-pointer rounded-full">
          <Avatar className="h-8 w-8">
            <Avatar.Fallback delayMs={0}>{initials}</Avatar.Fallback>
          </Avatar>
        </Dropdown.Trigger>
        <Dropdown.Popover className="w-[200px] overflow-hidden">
          <div className="px-3 pb-1 pt-3">
            <div className="flex items-center gap-2">
              <Avatar size="sm">
                <Avatar.Fallback delayMs={0}>{initials}</Avatar.Fallback>
              </Avatar>
              <div className="flex min-w-0 flex-col">
                <p className="truncate text-sm font-medium leading-5 text-[var(--cd-ink)]">
                  {DISPLAY_NAME}
                </p>
                <p className="truncate text-xs leading-none text-[var(--cd-ink-faint)]">{user?.email ?? ""}</p>
              </div>
            </div>
          </div>
          <Dropdown.Menu>
            <Dropdown.Item id="account" textValue="My Account" className="cursor-pointer">
              <div className="flex w-full items-center justify-between gap-2">
                <Label>My Account</Label>
                <UserIcon className="h-3.5 w-3.5 text-[var(--cd-ink-faint)]" />
              </div>
            </Dropdown.Item>
            <Dropdown.Item id="logout" textValue="Logout" variant="danger" onAction={logout} className="cursor-pointer">
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