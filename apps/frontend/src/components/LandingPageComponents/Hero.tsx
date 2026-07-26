import { Button } from "@/components/ui/button";
import { Container } from "@/components/layouts/Container";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <header className="relative overflow-hidden px-4 pb-12 pt-20 text-center sm:px-8 sm:pt-28 lg:pt-19">
      <Container>
        <motion.div
          className="relative z-10 mx-auto max-w-4xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Eyebrow badge */}
          <span className="mb-6 inline-block rounded-full bg-[#dbe1ff] px-3 py-1 text-[10px] uppercase tracking-widest text-[#00174b] sm:text-[10px]">
            Intelligence for Software Architects
          </span>

          {/* Heading */}
          <h1 className="mb-6 bg-gradient-to-r from-black to-[#444] bg-clip-text text-4xl font-bold leading-[1.1] tracking-[-0.04em] text-transparent sm:text-5xl lg:whitespace-nowrap lg:text-[72px] lg:leading-[80px]">
            Your AI Software Architect.
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mb-2 max-w-2xl text-base text-slate-500 sm:text-lg">
            Understand, analyze, and evolve your software architecture with AI.
          </p>

          {/* Tagline */}
          <p className="mb-10 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
            Understand any codebase in under 30 seconds.
          </p>

          {/* CTAs */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              className="flex w-full items-center justify-center gap-2 whitespace-nowrap bg-slate-900 text-white transition-colors duration-[600ms] hover:bg-slate-800 cursor-pointer sm:w-auto"
            >
              <span>Analyze Repository</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="w-full border-slate-300 text-slate-900 transition-colors duration-[600ms] hover:bg-slate-50 cursor-pointer sm:w-auto"
            >
              Request Demo
            </Button>
          </div>
        </motion.div>
      </Container>
    </header>
  );
}