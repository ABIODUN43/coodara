import logo from "@/assets/images/codara-logo.png";

interface LogoProps {
  size?: number;
}

export function Logo({ size = 42 }: LogoProps) {
  return (
    <div className="flex items-center gap-3">
      <img
        src={logo}
        alt="Codara"
        width={size}
        height={size}
        className="rounded-lg"
      />

      <span className="text-xl font-bold tracking-tight">
        CODARA
      </span>
    </div>
  );
}