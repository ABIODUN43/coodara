import logo from "@/assets/images/coodara-logo.jpeg";

export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <img
        src={logo}
        alt="Codara"
        className="h-10 w-10"
      />

      <span className="text-2xl font-bold text-[var(--cd-ink)]">
        Coodara
      </span>
    </div>
  );
}