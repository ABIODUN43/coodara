"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { FaGithub } from "react-icons/fa";

const CHECKS = [
  "Frontend Service identified",
  "Backend Service identified",
  "PostgreSQL Database mapped",
  "Authentication Flow verified",
  "API Gateway configured",
];

export function GithubAnalysis() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showScore, setShowScore] = useState(false);

  useEffect(() => {
    if (!isInView) return;

    const runSequence = () => {
      setActiveIndex(-1);
      setShowScore(false);

      CHECKS.forEach((_, index) => {
        setTimeout(() => {
          setActiveIndex(index);
          if (index === CHECKS.length - 1) {
            setTimeout(() => setShowScore(true), 800);
          }
        }, index * 1200);
      });
    };

    runSequence();
    const interval = setInterval(runSequence, 12000);
    return () => clearInterval(interval);
  }, [isInView]);

  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-8 sm:py-20">
        <div
        ref={ref}
        className="relative overflow-hidden rounded-xl border border-white/10 bg-slate-950 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.1)] sm:p-6"
      >
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-950">
              <FaGithub />
            </div>
            <div>
              <div className="font-medium text-white">GitHub Connected</div>
              <div className="flex items-center gap-1 text-xs text-emerald-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                Analyzing repository...
              </div>
            </div>
          </div>
          <div className="font-mono text-xs text-slate-400">v2.4.0-stable</div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-3 py-4">
            {CHECKS.map((label, index) => (
              <div
                key={label}
                className={`flex items-center gap-2 font-mono text-sm text-slate-300 transition-all duration-500 ${
                  index <= activeIndex
                    ? "translate-x-0 opacity-100"
                    : "-translate-x-2 opacity-0"
                }`}
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                {label}
              </div>
            ))}
          </div>

          <div
            className={`flex flex-col items-center justify-center rounded-lg border border-white/5 bg-slate-900/50 p-4 transition-all duration-700 ${
              showScore ? "scale-100 opacity-100" : "scale-90 opacity-0"
            }`}
          >
            <div className="mb-1 text-4xl font-bold text-white">94</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">
              Architecture Score
            </div>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-emerald-500 transition-all duration-1000"
                style={{ width: showScore ? "94%" : "0%" }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}