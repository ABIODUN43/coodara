import logo from "@/assets/images/coodara-logo.jpeg";

export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src={logo}
        alt="Coodara"
        className="h-7 w-7 rounded-[6px] object-cover flex-shrink-0"
      />

      {!collapsed && (
        <span className="text-[16px] font-semibold tracking-tight text-[var(--cd-ink)] font-heading select-none">
          Coodara
        </span>
      )}
    </div>
  );
}