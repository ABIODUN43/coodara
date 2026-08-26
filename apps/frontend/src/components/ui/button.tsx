import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost";

type ButtonSize =
  | "sm"
  | "md"
  | "lg"
  | "icon-sm";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
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
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cd-accent)] focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",

        variant === "primary" &&
          "bg-white text-black hover:bg-zinc-100",

        variant === "secondary" &&
          "bg-zinc-800 text-white hover:bg-zinc-700",

        variant === "outline" &&
          "border border-zinc-700 bg-transparent text-white hover:bg-zinc-800",

        variant === "ghost" &&
          "bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white",

        size === "sm" &&
          "min-h-9 px-3 py-2 text-sm",

        size === "md" &&
          "min-h-10 px-4 py-2 text-sm",

        size === "lg" &&
          "min-h-11 px-6 py-3 text-base",

        size === "icon-sm" &&
          "h-8 w-8 p-0",

        className,
      )}
      {...props}
    />
  );
}