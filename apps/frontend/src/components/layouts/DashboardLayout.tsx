import { useState } from "react";
import { Outlet } from "react-router-dom";

import { Sidebar } from "../dashboard/Sidebar";
import { TopNavbar } from "../dashboard/TopNavbar";
import { RepositoryImportModal } from "../dashboard/RepositoryImportModal";

import { ProjectProvider } from "@/context/ProjectContext";
import { DashboardActionProvider } from "@/context/DashboardActionContext";
import { DashboardOverviewProvider } from "@/context/DashboardOverviewContext";

export function DashboardLayout() {
  const [
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
  ] = useState(false);

  return (
    <ProjectProvider>
      <DashboardActionProvider>
        <DashboardOverviewProvider>
          <div className="flex min-h-screen bg-[var(--cd-bg)] text-[var(--cd-ink)]">
            <Sidebar
              isMobileOpen={isMobileSidebarOpen}
              onClose={() => setIsMobileSidebarOpen(false)}
            />

          <div className="flex min-w-0 flex-1 flex-col">
            <TopNavbar
              onOpenSidebar={() =>
                setIsMobileSidebarOpen(true)
              }
            />

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