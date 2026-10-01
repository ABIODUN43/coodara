import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PageContainerVariant = "default" | "wide" | "full" | "narrow";

interface PageContainerProps {
  children: ReactNode;
  variant?: PageContainerVariant;
  className?: string;
  header?: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: ReactNode;
}

const variantMaxWidth: Record<PageContainerVariant, string> = {
  default: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
  wide: "max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8",
  full: "w-full px-4 sm:px-6",
  narrow: "max-w-3xl mx-auto px-4 sm:px-6",
};

export function PageContainer({
  children,
  variant = "default",
  className,
  header,
  title,
  description,
  actions,
  breadcrumbs,
}: PageContainerProps) {
  const hasCustomHeader = Boolean(header || title || actions || breadcrumbs);

  return (
    <div className={cn("w-full py-6 pb-16", variantMaxWidth[variant], className)}>
      {hasCustomHeader && (
        <div className="mb-6 space-y-3">
          {breadcrumbs && <div className="text-xs text-[var(--cd-ink-soft)]">{breadcrumbs}</div>}

          {header ? (
            header
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {title && (
                  <h1 className="text-[26px] sm:text-[28px] font-semibold tracking-tight text-[var(--cd-ink)] leading-tight">
                    {title}
                  </h1>
                )}
                {description && (
                  <p className="mt-1 text-[13.5px] text-[var(--cd-ink-soft)] leading-normal max-w-2xl">
                    {description}
                  </p>
                )}
              </div>
              {actions && <div className="flex items-center gap-2 pt-1 sm:pt-0">{actions}</div>}
            </div>
          )}
        </div>
      )}

      {children}
    </div>
  );
}

export function PageSection({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mt-8 first:mt-0 space-y-3", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between pb-1">
          <div>
            {title && (
              <h2 className="text-[17px] font-semibold tracking-tight text-[var(--cd-ink)]">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-xs text-[var(--cd-ink-soft)] mt-0.5">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
