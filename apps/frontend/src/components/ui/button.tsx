import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "outline";
    size?: "sm" | "md" | "lg";
};

export function Button({
    className,
    variant = "primary",
    size = "md",
    ...props
}: ButtonProps) {
    return (
        <button
            className={cn(
                "rounded-lg font-medium",
                variant === "primary" &&
                    "bg-white text-black",
                variant === "secondary" &&
                    "bg-zinc-800 text-white",
                variant === "outline" &&
                    "border border-zinc-700",
                size === "sm" && "px-3 py-2",
                size === "md" && "px-4 py-2",
                size === "lg" && "px-6 py-3",
                className
            )}
            {...props}
        />
    );
}