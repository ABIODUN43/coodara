import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "rounded-xl px-5 py-2.5 text-sm font-medium transition-all",
        variant === "primary"
          ? "bg-white text-black hover:bg-zinc-200"
          : "border border-zinc-700 text-white hover:bg-zinc-900",
        className
      )}
      {...props}
    />
  );
}