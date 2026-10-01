import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive";

export type ButtonSize =
  | "sm"
  | "md"
  | "lg"
  | "icon-sm"
  | "icon";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all select-none cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cd-accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--cd-bg)]",
        "disabled:pointer-events-none disabled:opacity-50",

        variant === "primary" &&
          "bg-[var(--cd-accent)] text-white shadow-xs hover:bg-[var(--cd-accent-hover)] active:scale-[0.99]",

        variant === "secondary" &&
          "border border-[var(--cd-border)] bg-[var(--cd-surface)] text-[var(--cd-ink)] shadow-2xs hover:bg-[var(--cd-sunken)] active:bg-[var(--cd-sunken)]",

        variant === "outline" &&
          "border border-[var(--cd-border)] bg-transparent text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)] hover:text-[var(--cd-ink)]",

        variant === "ghost" &&
          "bg-transparent text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)] hover:text-[var(--cd-ink)]",

        variant === "destructive" &&
          "bg-[var(--cd-risk)] text-white shadow-xs hover:bg-red-700 active:scale-[0.99]",

        size === "sm" &&
          "h-7 rounded-[6px] px-2.5 text-xs gap-1.5",

        size === "md" &&
          "h-8.5 rounded-[8px] px-3.5 text-[13px] gap-2",

        size === "lg" &&
          "h-10 rounded-[8px] px-4 text-sm gap-2",

        size === "icon-sm" &&
          "h-7 w-7 rounded-[6px] p-0",

        size === "icon" &&
          "h-8.5 w-8.5 rounded-[8px] p-0",

        className,
      )}
      {...props}
    />
  );
}