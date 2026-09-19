import { Button } from "@/components/ui/button";
import { Container } from "@/components/layouts/Container";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export function Hero() {
  return (
    <header className="relative overflow-hidden px-4 pb-16 pt-16 text-center sm:px-8 sm:pt-24 lg:pt-20">
      <Container>
        <motion.div
          className="relative z-10 mx-auto max-w-5xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Eyebrow - crisp uppercase tracking in black */}
          <div className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-slate-900 sm:text-sm">
            AI SHIPS CODE FASTER. SYSTEMS ARE DRIFTING FASTER THAN EVER.
          </div>

          {/* Primary Outcome Headline - Two clean high-impact lines */}
          <h1 className="mb-5 text-4xl font-extrabold tracking-[-0.03em] text-slate-900 sm:text-6xl lg:text-[62px] lg:leading-[1.12]">
            Continuously improve your software architecture.
            <br className="hidden sm:block" />
            <span className="text-slate-900"> Move fast without breaking your system.</span>
          </h1>

          {/* Subtitle / Value Proposition */}
          <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-slate-500 sm:text-lg">
            Understand what your system actually looks like, measure debt, and predict change.
            <br className="hidden sm:block" />
            Give engineers and AI agents the context to build with verified architecture improvement.
          </p>

          {/* CTAs - Solid Black Action Button + Inline Link with Chevron */}
          <div className="flex flex-col items-center justify-center gap-5 sm:flex-row sm:gap-6">
            <Link to="/login">
              <Button
                size="lg"
                className="h-12 rounded-lg bg-black px-8 text-base font-semibold text-white shadow-sm transition-all duration-200 hover:bg-zinc-800 active:scale-98 cursor-pointer"
              >
                Analyze your architecture
              </Button>
            </Link>

            <a
              href="#how-it-works"
              className="inline-flex items-center gap-1.5 text-base font-semibold text-slate-700 transition-colors hover:text-slate-900"
            >
              <span>See how it works</span>
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        </motion.div>
      </Container>
    </header>
  );
}