import type { ReactNode } from "react";
import { CheckCircle2, AlertTriangle, AlertOctagon, HelpCircle, Loader2, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusType =
  | "healthy"
  | "analyzing"
  | "ready"
  | "warning"
  | "critical"
  | "unknown"
  | "not_analyzed";

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  showIcon?: boolean;
  size?: "sm" | "md";
  className?: string;
  children?: ReactNode;
}

const statusConfig: Record<
  StatusType,
  {
    defaultLabel: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    dotColor: string;
    icon: typeof CheckCircle2;
  }
> = {
  healthy: {
    defaultLabel: "Healthy",
    bgClass: "bg-[var(--cd-good-bg)]",
    textClass: "text-[var(--cd-good)]",
    borderClass: "border-[var(--cd-good)]/20",
    dotColor: "bg-[var(--cd-good)]",
    icon: CheckCircle2,
  },
  analyzing: {
    defaultLabel: "Analyzing",
    bgClass: "bg-[var(--cd-accent-soft)]",
    textClass: "text-[var(--cd-accent)]",
    borderClass: "border-[var(--cd-accent)]/20",
    dotColor: "bg-[var(--cd-accent)]",
    icon: Loader2,
  },
  ready: {
    defaultLabel: "Ready",
    bgClass: "bg-[var(--cd-good-bg)]",
    textClass: "text-[var(--cd-good)]",
    borderClass: "border-[var(--cd-good)]/20",
    dotColor: "bg-[var(--cd-good)]",
    icon: CheckCircle2,
  },
  warning: {
    defaultLabel: "Warning",
    bgClass: "bg-[var(--cd-warn-bg)]",
    textClass: "text-[var(--cd-warn)]",
    borderClass: "border-[var(--cd-warn)]/20",
    dotColor: "bg-[var(--cd-warn)]",
    icon: AlertTriangle,
  },
  critical: {
    defaultLabel: "Critical",
    bgClass: "bg-[var(--cd-risk-bg)]",
    textClass: "text-[var(--cd-risk)]",
    borderClass: "border-[var(--cd-risk)]/20",
    dotColor: "bg-[var(--cd-risk)]",
    icon: AlertOctagon,
  },
  unknown: {
    defaultLabel: "Unknown",
    bgClass: "bg-[var(--cd-sunken)]",
    textClass: "text-[var(--cd-ink-faint)]",
    borderClass: "border-[var(--cd-border)]",
    dotColor: "bg-[var(--cd-ink-faint)]",
    icon: HelpCircle,
  },
  not_analyzed: {
    defaultLabel: "Not analyzed",
    bgClass: "bg-[var(--cd-sunken)]",
    textClass: "text-[var(--cd-ink-soft)]",
    borderClass: "border-[var(--cd-border)]",
    dotColor: "bg-[var(--cd-ink-soft)]",
    icon: CircleDot,
  },
};

export function StatusBadge({
  status,
  label,
  showIcon = true,
  size = "md",
  className,
  children,
}: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.unknown;
  const displayLabel = label ?? children ?? config.defaultLabel;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium select-none tracking-tight",
        config.bgClass,
        config.textClass,
        config.borderClass,
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-0.5 text-[12px]",
        className,
      )}
    >
      {showIcon && (
        status === "analyzing" ? (
          <Loader2 className={cn("animate-spin flex-shrink-0", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
        ) : (
          <Icon className={cn("flex-shrink-0", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
        )
      )}
      <span>{displayLabel}</span>
    </span>
  );
}
