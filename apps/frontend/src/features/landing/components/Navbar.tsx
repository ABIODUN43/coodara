import { Logo } from "@/components/common/Logo";
import { Container } from "@/components/layouts/Container";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur">
      <Container>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Logo />

        <nav className="hidden items-center gap-8 md:flex">
          <a href="#features">Features</a>
          <a href="#docs">Docs</a>
          <a href="#pricing">Pricing</a>
          <a href="#github">GitHub</a>
        </nav>

        <button className="rounded-lg bg-white px-4 py-2 text-black transition hover:opacity-90">
          Continue with GitHub
        </button>
      </div>
      </Container>
    </header>
  );
}