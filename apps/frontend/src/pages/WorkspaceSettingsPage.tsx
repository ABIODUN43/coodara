import { Shield } from "lucide-react";
import { useAuthContext } from "@/context/AuthContext";
import { useProject } from "@/context/ProjectContext";

export function WorkspaceSettingsPage() {
  const { user } = useAuthContext();
  const { activeProject } = useProject();

  return (
    <div className="flex h-full min-h-[calc(100vh-52px)] flex-col bg-[var(--cd-bg)] p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[var(--cd-ink)] sm:text-2xl">
              Workspace Settings
            </h1>
            <span className="rounded-full bg-[var(--cd-sunken)] px-2.5 py-0.5 font-mono text-xs font-semibold text-[var(--cd-ink-soft)] border border-[var(--cd-border)]">
              Access & Members
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[var(--cd-ink-soft)] max-w-2xl">
            Manage engineering teams, workspace members, role-based access control, and workspace-level notification policies.
          </p>
        </div>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* Workspace Identity */}
        <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[var(--cd-ink)]">Current Workspace</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[var(--cd-ink-faint)] block mb-1">Active Organization / Workspace</span>
              <span className="font-semibold text-[var(--cd-ink)] font-mono text-sm">
                {activeProject?.name || "Primary Team Workspace"}
              </span>
            </div>
            <div>
              <span className="text-[var(--cd-ink-faint)] block mb-1">Your Role</span>
              <span className="inline-flex items-center gap-1 rounded bg-[var(--cd-accent-soft)] px-2 py-0.5 font-mono text-xs text-[var(--cd-accent)] font-semibold">
                <Shield className="h-3 w-3" />
                <span>Owner</span>
              </span>
            </div>
          </div>
        </div>

        {/* Member Directory */}
        <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--cd-ink)]">Workspace Members</h2>
            <span className="text-xs text-[var(--cd-ink-faint)]">1 active member</span>
          </div>

          <div className="divide-y divide-[var(--cd-border-soft)]">
            <div className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-[var(--cd-accent)] text-white flex items-center justify-center font-bold text-xs">
                  {user?.email?.charAt(0).toUpperCase() || "A"}
                </div>
                <div>
                  <div className="text-xs font-semibold text-[var(--cd-ink)]">
                    {user?.username || user?.email || "Lead Architect"}
                  </div>
                  <div className="text-[11px] font-mono text-[var(--cd-ink-soft)]">
                    {user?.email || "architect@coodara.ai"}
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono font-medium text-[var(--cd-ink-soft)] bg-[var(--cd-sunken)] px-2 py-1 rounded">
                Admin / Architect
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
