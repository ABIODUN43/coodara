import { Button } from "@/components/ui/button";
import { Section } from "@/components/layouts/Section";
import { GitPullRequest } from "lucide-react";

export function CTA() {
  return (
    <Section>
      <div
        className="
          rounded-3xl
          border
          border-zinc-800
          bg-zinc-950
          px-8
          py-20
          text-center
        "
      >
        <p className="mb-4 text-sm uppercase tracking-widest text-zinc-500">
          Get Started
        </p>

        <h2 className="mx-auto max-w-4xl text-5xl font-bold">
          Ready to Understand Your Software Architecture?
        </h2>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400">
          Analyze repositories, detect bottlenecks, and build better systems
          with AI-powered architecture intelligence.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg">
            <GitPullRequest className="mr-2 h-4 w-4" />
            Continue with GitHub
          </Button>

          <Button variant="outline" size="lg">
            View Documentation
          </Button>
        </div>
      </div>
    </Section>
  );
}