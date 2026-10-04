import { useRouteError, isRouteErrorResponse, useNavigate, Link } from "react-router-dom";
import { RefreshCw, Home, GitBranch, ShieldAlert } from "lucide-react";

export function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  let title = "Application Encountered an Error";
  let description =
    "An unexpected error occurred while rendering this view. Your underlying analysis, architecture models, and session state remain safely persisted.";
  let statusText = "";

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = "Page Not Found";
      description = "The requested architectural view, repository, or document does not exist or may have been moved.";
      statusText = "404 - Not Found";
    } else {
      title = `Error ${error.status}`;
      description = error.statusText || error.data?.message || description;
      statusText = `${error.status} ${error.statusText}`;
    }
  } else if (error instanceof Error) {
    description = error.message;
  }

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--cd-bg)] p-4 sm:p-6">
      <div className="w-full max-w-xl rounded-2xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-6 sm:p-8 shadow-md space-y-6">
        {/* Brand & Error Icon */}
        <div className="flex items-center gap-3 border-b border-[var(--cd-border-soft)] pb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--cd-accent)]">
                Coodara Platform
              </span>
              {statusText && (
                <span className="rounded bg-[var(--cd-sunken)] px-1.5 py-0.2 font-mono text-[10px] text-[var(--cd-ink-faint)] border border-[var(--cd-border-soft)]">
                  {statusText}
                </span>
              )}
            </div>
            <h1 className="mt-0.5 text-xl font-bold text-[var(--cd-ink)]">{title}</h1>
          </div>
        </div>

        {/* Detailed Explanation */}
        <div className="rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)] p-4 space-y-2">
          <div className="text-[11.5px] font-semibold text-[var(--cd-ink-faint)] uppercase tracking-wider">
            Diagnostic Context
          </div>
          <p className="font-mono text-[12.5px] text-[var(--cd-ink-soft)] leading-relaxed break-words break-all">
            {description}
          </p>
        </div>

        {/* System Guidance */}
        <p className="text-[12.5px] text-[var(--cd-ink-faint)] leading-relaxed">
          If this problem persists after reloading, please verify that your repository has completed AST analysis and that your session is authenticated.
        </p>

        {/* Action Triggers */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[var(--cd-border-soft)]">
          <button
            type="button"
            onClick={handleReload}
            className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-[var(--cd-accent)] px-4 py-2 text-[12.5px] font-semibold text-white shadow-xs hover:bg-[var(--cd-accent-hover)] transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reload Page
          </button>

          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-4 py-2 text-[12.5px] font-medium text-[var(--cd-ink)] shadow-xs hover:bg-[var(--cd-sunken)] transition-colors"
          >
            <Home className="h-3.5 w-3.5 text-[var(--cd-ink-soft)]" />
            Return to Dashboard
          </button>

          <Link
            to="/repositories"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-4 py-2 text-[12.5px] font-medium text-[var(--cd-ink)] shadow-xs hover:bg-[var(--cd-sunken)] transition-colors"
          >
            <GitBranch className="h-3.5 w-3.5 text-[var(--cd-ink-soft)]" />
            View Repositories
          </Link>
        </div>
      </div>
    </div>
  );
}

export default RouteErrorBoundary;
