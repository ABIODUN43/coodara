import { useState } from "react";
import { Outlet } from "react-router-dom";

import { Sidebar } from "../dashboard/Sidebar";
import { TopNavbar } from "../dashboard/TopNavbar";
import { RepositoryImportModal } from "../dashboard/RepositoryImportModal";

import { ProjectProvider } from "@/context/ProjectContext";
import { DashboardActionProvider } from "@/context/DashboardActionContext";
import { DashboardOverviewProvider } from "@/context/DashboardOverviewContext";

export function DashboardLayout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem("coodara_sidebar_collapsed") === "true";
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("coodara_sidebar_collapsed", String(next));
      return next;
    });
  };

  return (
    <ProjectProvider>
      <DashboardActionProvider>
        <DashboardOverviewProvider>
          <div className="flex min-h-screen bg-[var(--cd-bg)] text-[var(--cd-ink)] font-sans antialiased selection:bg-[var(--cd-accent-soft)] selection:text-[var(--cd-accent)]">
            <Sidebar
              isMobileOpen={isMobileSidebarOpen}
              onClose={() => setIsMobileSidebarOpen(false)}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={toggleSidebarCollapse}
            />

            <div className="flex min-w-0 flex-1 flex-col">
              <TopNavbar onOpenSidebar={() => setIsMobileSidebarOpen(true)} />

              <main className="flex-1 overflow-y-auto">
                <Outlet />
              </main>
            </div>

            <RepositoryImportModal />
          </div>
        </DashboardOverviewProvider>
      </DashboardActionProvider>
    </ProjectProvider>
  );
}