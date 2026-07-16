import { Logo } from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layouts/Container";
import { GitPullRequest } from "lucide-react";

export function Navbar() {
    return (
        <nav
            className="
                sticky
                top-0
                z-50
                border-b
                border-zinc-800
                bg-black/70
                backdrop-blur-xl
            "
        >
            <Container>
                <div className="flex h-20 items-center justify-between">
                    <Logo />

                    <div className="hidden items-center gap-8 md:flex">
                        <a href="#features">Features</a>
                        <a href="#pricing">Pricing</a>
                        <a href="#docs">Docs</a>
                        <a href="#github">GitHub</a>
                    </div>

                    <Button>
                        <GitPullRequest className="mr-2 h-4 w-4" />
                        Continue with GitHub
                    </Button>
                </div>
            </Container>
        </nav>
    );
}