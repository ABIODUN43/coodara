import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  Search,
  LayoutGrid,
  Building2,
  GitBranch,
  Network,
  AlertTriangle,
  Sparkles,
  GitCompare,
  MessageSquare,
  Brain,
  History,
  FileText,
  Settings,
  Plus,
  Sun,
  Moon,
  ArrowRight,
  Command,
} from "lucide-react";
import { useProject } from "@/context/ProjectContext";
import { useDashboardActionContext } from "@/context/DashboardActionContext";

interface CommandItem {
  id: string;
  category: "Workspace" | "Architecture" | "Engineering" | "Actions" | "Organizations";
  label: string;
  description?: string;
  icon: typeof Search;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { organizations, activeProject, setActiveProject } = useProject();
  const { openRepositoryImport } = useDashboardActionContext();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open handled by parent or custom event
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const items: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [
      // Actions
      {
        id: "action-import-repo",
        category: "Actions",
        label: "Import GitHub repository",
        description: "Connect a repository from GitHub to analyze",
        icon: Plus,
        shortcut: "I",
        action: () => {
          onClose();
          openRepositoryImport();
        },
      },
      {
        id: "action-toggle-theme",
        category: "Actions",
        label: `Switch to ${theme === "dark" ? "light" : "dark"} mode`,
        description: "Toggle interface appearance",
        icon: theme === "dark" ? Sun : Moon,
        shortcut: "T",
        action: () => {
          setTheme(theme === "dark" ? "light" : "dark");
          onClose();
        },
      },

      // Workspace
      {
        id: "nav-overview",
        category: "Workspace",
        label: "Overview",
        description: "Dashboard health overview & key metrics",
        icon: LayoutGrid,
        action: () => {
          navigate("/dashboard");
          onClose();
        },
      },
      {
        id: "nav-repositories",
        category: "Workspace",
        label: "Repositories",
        description: "View connected repositories and analyses",
        icon: GitBranch,
        action: () => {
          if (activeProject) {
            navigate(`/dashboard/organizations/${activeProject.id}/repositories`);
          } else {
            navigate("/dashboard/organizations");
          }
          onClose();
        },
      },
      {
        id: "nav-organizations",
        category: "Workspace",
        label: "Organizations",
        description: "Manage teams, projects, and memberships",
        icon: Building2,
        action: () => {
          navigate("/dashboard/organizations");
          onClose();
        },
      },

      // Architecture
      {
        id: "nav-architecture",
        category: "Architecture",
        label: "Architecture Intelligence",
        description: "Explore modules, dependencies & graph topology",
        icon: Network,
        action: () => {
          navigate("/dashboard");
          onClose();
        },
      },
      {
        id: "nav-risks",
        category: "Architecture",
        label: "Architectural Risks",
        description: "Inspect circular dependencies, hotspots & coupling",
        icon: AlertTriangle,
        action: () => {
          navigate("/dashboard/risks");
          onClose();
        },
      },
      {
        id: "nav-recommendations",
        category: "Architecture",
        label: "Recommendations",
        description: "Actionable remediation plans from AI analysis",
        icon: Sparkles,
        action: () => {
          navigate("/dashboard/recommendations");
          onClose();
        },
      },
      {
        id: "nav-simulation",
        category: "Architecture",
        label: "What-if Simulation",
        description: "Simulate refactoring impact across repositories",
        icon: GitCompare,
        action: () => {
          navigate("/dashboard");
          onClose();
        },
      },

      // Engineering
      {
        id: "nav-chat",
        category: "Engineering",
        label: "Architecture Chat",
        description: "Query codebase architecture with grounded AI assistant",
        icon: MessageSquare,
        action: () => {
          navigate("/dashboard/chat");
          onClose();
        },
      },
      {
        id: "nav-memory",
        category: "Engineering",
        label: "Architecture Memory",
        description: "Track architectural decisions and component history",
        icon: Brain,
        action: () => {
          navigate("/dashboard/memory");
          onClose();
        },
      },
      {
        id: "nav-history",
        category: "Engineering",
        label: "History & Evolution",
        description: "View timeline of architecture changes across snapshots",
        icon: History,
        action: () => {
          navigate("/dashboard/history");
          onClose();
        },
      },
      {
        id: "nav-reports",
        category: "Engineering",
        label: "Reports",
        description: "Export executive summaries and compliance reports",
        icon: FileText,
        action: () => {
          navigate("/dashboard/reports");
          onClose();
        },
      },
      {
        id: "nav-settings",
        category: "Engineering",
        label: "Settings",
        description: "Configure thresholds, members, and integrations",
        icon: Settings,
        action: () => {
          navigate("/dashboard/settings");
          onClose();
        },
      },
    ];

    // Organizations switcher
    if (organizations && organizations.length > 0) {
      organizations.forEach((org) => {
        list.push({
          id: `switch-org-${org.id}`,
          category: "Organizations",
          label: `Switch to ${org.name}`,
          description: org.description ?? "Organization workspace",
          icon: Building2,
          action: () => {
            setActiveProject(org);
            onClose();
          },
        });
      });
    }

    return list;
  }, [activeProject, organizations, navigate, onClose, openRepositoryImport, setActiveProject, setTheme, theme]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q),
    );
  }, [items, query]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Key navigation in dialog
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/40 dark:bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-[12px] border border-[var(--cd-border)] bg-[var(--cd-surface)] shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
      >
        {/* Search header */}
        <div className="flex items-center gap-3 border-b border-[var(--cd-border)] px-4 py-3 bg-[var(--cd-surface)]">
          <Search className="h-4 w-4 text-[var(--cd-ink-faint)] flex-shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, jump to a section, or search..."
            className="w-full bg-transparent text-[13.5px] text-[var(--cd-ink)] placeholder:text-[var(--cd-ink-faint)] outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-mono text-[var(--cd-ink-faint)] bg-[var(--cd-sunken)] border border-[var(--cd-border)]">
            ESC
          </kbd>
        </div>

        {/* Command list */}
        <div className="max-h-[340px] overflow-y-auto p-1.5">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-[var(--cd-ink-faint)]">
              No matching commands or pages found.
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex w-full cursor-pointer items-center justify-between rounded-[8px] px-3 py-2 text-left transition-colors ${
                    isSelected
                      ? "bg-[var(--cd-accent-soft)] text-[var(--cd-ink)]"
                      : "text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[6px] ${
                        isSelected
                          ? "bg-[var(--cd-accent)] text-white"
                          : "bg-[var(--cd-sunken)] text-[var(--cd-ink-soft)]"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium leading-tight truncate">
                        {item.label}
                      </div>
                      {item.description && (
                        <div className="text-[11.5px] text-[var(--cd-ink-soft)] truncate mt-0.5">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-[var(--cd-ink-faint)]">
                      {item.category}
                    </span>
                    {isSelected && (
                      <ArrowRight className="h-3.5 w-3.5 text-[var(--cd-accent)]" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center justify-between border-t border-[var(--cd-border)] bg-[var(--cd-sidebar)] px-4 py-2 text-[11px] text-[var(--cd-ink-faint)]">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono bg-[var(--cd-sunken)] px-1 py-0.5 rounded border border-[var(--cd-border)] mr-1">↑</kbd>
              <kbd className="font-mono bg-[var(--cd-sunken)] px-1 py-0.5 rounded border border-[var(--cd-border)] mr-1">↓</kbd>
              navigate
            </span>
            <span>
              <kbd className="font-mono bg-[var(--cd-sunken)] px-1 py-0.5 rounded border border-[var(--cd-border)] mr-1">↵</kbd>
              select
            </span>
          </div>
          <div className="flex items-center gap-1 font-mono text-[10px]">
            <Command className="h-3 w-3" />
            <span>K</span>
          </div>
        </div>
      </div>
    </div>
  );
}
