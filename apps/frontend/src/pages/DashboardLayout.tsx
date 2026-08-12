import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/dashboard/Sidebar";
import { TopNavbar } from "../components/dashboard/TopNavbar";
import { ProjectProvider } from "@/context/ProjectContext";

export function DashboardLayout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <ProjectProvider>
      <div className="flex min-h-screen bg-[var(--cd-bg)] text-[var(--cd-ink)]">
        <Sidebar isMobileOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopNavbar onOpenSidebar={() => setIsMobileSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </ProjectProvider>
  );
}