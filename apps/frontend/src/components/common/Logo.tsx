import logo from "@/assets/images/codara-logo.png";

export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <img
        src={logo}
        alt="Codara"
        className="h-10 w-10"
      />

      <span className="text-2xl font-bold">
        CODARA
      </span>
    </div>
  );
}