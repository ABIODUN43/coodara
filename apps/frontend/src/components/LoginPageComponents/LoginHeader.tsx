import codaraLogo from "@/assets/images/coodara-logo.jpeg";

export function LoginHeader() {
  return (
    <header className="mb-10 flex flex-col items-center">
      <img
        src={codaraLogo}
        alt="Codara"
        className="mb-2 h-12 w-12 rounded-lg object-contain shadow-xshadow-[#b7c4ff]/20"
      />
      <h1 className="text-2xl font-bold tracking-tighter text-[#e0e2e8] sm:text-[24px]">
        COODARA
      </h1>
    </header>
  );
}