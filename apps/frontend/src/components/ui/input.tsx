import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-8.5 w-full min-w-0 rounded-[8px] border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3 py-1.5 text-[13px] text-[var(--cd-ink)] placeholder:text-[var(--cd-ink-faint)] transition-colors outline-none",
        "focus-visible:border-[var(--cd-accent)] focus-visible:ring-2 focus-visible:ring-[var(--cd-accent)]/20",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--cd-sunken)]",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
