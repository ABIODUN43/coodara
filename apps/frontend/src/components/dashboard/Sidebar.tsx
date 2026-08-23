import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Logo } from "@/components/common/Logo";
import { Avatar } from "@heroui/react";
import {
  LayoutGrid,
  Building2,
  GitBranch,
  Activity,
  Network,
  Bot,
  AlertTriangle,
  FileText,
  Settings,
  ChevronDown,
  Check,
} from "lucide-react";
import { DISPLAY_NAME } from "@/components/dashboard/user";
import { useProject } from "@/context/ProjectContext";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  count?: number;
}

const navItems: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutGrid },
  { label: "Organizations", href: "/dashboard/organizations", icon: Building2 },
  { label: "Repositories", href: "/dashboard/repositories", icon: GitBranch, count: 12 },
  { label: "AI Assistant", href: "/ai-assistant", icon: Bot },
  { label: "Risks", href: "/risks", icon: AlertTriangle, count: 4 },
  { label: "Reports", href: "/reports", icon: FileText },
  { label: "Settings", href: "/settings", icon: Settings },
];


interface SidebarProps {
  isMobileOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isMobileOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { organizations, activeProject, setActiveProject, loading: orgsLoading } = useProject();
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);

  const initials = DISPLAY_NAME.split(" ").map((p) => p[0]).join("");

  return (
    <>
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed z-50 flex h-screen w-[224px] flex-shrink-0 flex-col border-r border-[var(--cd-border)] bg-[var(--cd-sidebar)] transition-transform duration-200 md:sticky md:top-0 md:translate-x-0 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[52px] items-center gap-2 px-3.5">
          <Logo />
        </div>

        <div className="mx-2.5 mt-0.5 mb-2.5">
          <button
            onClick={() => setIsProjectMenuOpen((v) => !v)}
            className="flex w-full cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-left hover:bg-[var(--cd-sunken)]"
          >
           <span className="text-[12.5px] font-medium text-[var(--cd-ink)]">
  {activeProject?.name ?? "Select organization"}
</span>
            <ChevronDown
              className={`h-3 w-3 flex-shrink-0 text-[var(--cd-ink-faint)] transition-transform ${
                isProjectMenuOpen ? "rotate-180" : ""
              }`}   
            />
          </button>
          {isProjectMenuOpen && (
  <div className="mt-1 flex flex-col gap-px rounded-lg bg-[var(--cd-sunken)] p-1">
    {orgsLoading ? (
      <div className="px-2 py-1.5 text-[12.5px] text-[var(--cd-ink-faint)]">Loading...</div>
    ) : (
      organizations.map((org) => (
        <button
          key={org.id}
          onClick={() => {
            setActiveProject(org);
            setIsProjectMenuOpen(false);
          }}
          className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-[var(--cd-surface)]"
        >
          <span
  className={`text-[12.5px] ${
    org.id === activeProject?.id
      ? "font-medium text-[var(--cd-accent)]"
      : "text-[var(--cd-ink-soft)]"
  }`}
>
  {org.name}
</span>
{org.id === activeProject?.id && (
  <Check className="h-3.5 w-3.5 text-[var(--cd-accent)]" />
)}
        </button>
      ))
    )}
  </div>
)}
        </div>

        <div className="px-3.5 pb-1.5 pt-3.5 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--cd-ink-faint)]">
          Workspace
        </div>

        <nav className="flex flex-col gap-px px-2.5">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? location.pathname === "/dashboard"
                : location.pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onClose}
                className={`relative flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] font-medium ${
                  isActive
                    ? "bg-[var(--cd-accent-soft)] text-[var(--cd-accent)]"
                    : "text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)] hover:text-[var(--cd-ink)]"
                }`}
              >
                {isActive && (
                  <span className="absolute -left-2.5 top-1.5 bottom-1.5 w-[2.5px] rounded bg-[var(--cd-accent)]" />
                )}
                <Icon className="h-[15px] w-[15px] flex-shrink-0" />
                <span>{item.label}</span>
                {item.count != null && (
                  <span className="ml-auto text-[11px] text-[var(--cd-ink-faint)]">
                    {item.count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-[var(--cd-border-soft)] px-3.5 py-3">
          <div className="mb-1 flex justify-between text-[10.5px] text-[var(--cd-ink-faint)]">
            <span>Analysis used</span>
            <span className="font-mono">143/500</span>
          </div>
          <div className="mb-3 h-1 overflow-hidden rounded-full bg-[var(--cd-sunken)]">
            <div className="h-full w-[29%] rounded-full bg-[var(--cd-accent)]" />
          </div>
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6 flex-shrink-0">
              <Avatar.Fallback delayMs={0}>{initials}</Avatar.Fallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate text-xs font-medium leading-tight text-[var(--cd-ink)]">
                {DISPLAY_NAME}
              </div>
              <div className="text-[10.5px] text-[var(--cd-ink-faint)]">Owner</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}