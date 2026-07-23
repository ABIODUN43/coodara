"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import {
  Share2,
  Brain,
  GitBranch,
  AlertTriangle,
  Sparkles,
  History,
  type LucideIcon,
} from "lucide-react";

interface Step {
  icon: LucideIcon;
  label: string;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  { icon: Share2, label: "Step 01", title: "Connect Repository", description: "Connect GitHub, GitLab, or Bitbucket repositories." },
  { icon: Brain, label: "Step 02", title: "AI Analysis", description: "AI scans your codebase and identifies architectural patterns." },
  { icon: GitBranch, label: "Step 03", title: "Architecture Graph", description: "Visualize services, modules, and dependencies." },
  { icon: AlertTriangle, label: "Step 04", title: "Issue Detection", description: "Detect coupling, circular dependencies, and drift." },
  { icon: Sparkles, label: "Step 05", title: "AI Recommendations", description: "Receive AI-powered recommendations for refactoring, scalability, and maintainability." },
  { icon: History, label: "Step 06", title: "Architecture Evolution", description: "Compare architecture changes across releases and understand how your system evolves over time." },
];

const STEP_DURATION_MS = 2500;
const CYCLE_DURATION_MS = STEP_DURATION_MS * STEPS.length;

export function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const verticalLineRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.1 });
  const [currentStep, setCurrentStep] = useState(0);
  const runningRef = useRef(false);

  useEffect(() => {
    if (!isInView || runningRef.current) return;
    runningRef.current = true;

    let rafId: number;
    let startTime: number | null = null;

    const tick = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;

      const elapsed = (timestamp - startTime) % CYCLE_DURATION_MS;
      const progress = elapsed / CYCLE_DURATION_MS;
      const stepIndex = Math.floor(elapsed / STEP_DURATION_MS);

      if (lineRef.current) {
        lineRef.current.style.transform = `scaleX(${progress})`;
      }
      if (verticalLineRef.current) {
        verticalLineRef.current.style.transform = `scaleY(${progress})`;
      }

      setCurrentStep((prev) => (prev !== stepIndex ? stepIndex : prev));

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      runningRef.current = false;
    };
  }, [isInView]);

  return (
    <section className="overflow-hidden bg-[#f8fafc] px-4 py-16 sm:px-8 sm:py-20" ref={sectionRef}>
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-12 text-center">
          <h2 className="mb-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            How Coodara Works
          </h2>
          <p className="text-slate-500">
            From repository to architectural intelligence in minutes.
          </p>
        </div>

        <div className="relative">
          {/* Horizontal progress line — desktop only (single row) */}
          <div className="absolute left-[8%] right-[8%] top-11 z-0 hidden h-[2px] overflow-hidden rounded-full bg-slate-200 lg:block">
            <div
              ref={lineRef}
              className="h-full w-full origin-left bg-[#316bf3]"
              style={{ transform: "scaleX(0)" }}
            />
          </div>

          {/* Vertical progress line — mobile/tablet stacked layout */}
          <div className="absolute left-1/2 top-0 bottom-0 z-0 block w-[2px] -translate-x-1/2 overflow-hidden rounded-full bg-slate-200 lg:hidden">
            <div
              ref={verticalLineRef}
              className="h-full w-full origin-top bg-[#316bf3]"
              style={{ transform: "scaleY(0)" }}
            />
          </div>

          <div className="relative z-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;

              return (
                <div
                  key={step.title}
                  className={`flex flex-col items-center gap-3 rounded-2xl border bg-white p-9 text-center shadow-sm transition-all duration-500 lg:items-start lg:text-left ${
                    isActive
                      ? "-translate-y-2 border-[#316bf3] shadow-[0_20px_40px_-15px_rgba(49,107,243,0.15)]"
                      : "border-slate-200"
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all duration-500 ${
                      isActive ? "scale-110 bg-[#316bf3] text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <div
                      className={`mb-1 text-[10px] font-bold uppercase tracking-widest transition-colors duration-500 ${
                        isActive ? "text-slate-400" : "text-slate-300"
                      }`}
                    >
                      {step.label}
                    </div>
                    <h4
                      className={`mb-1 font-bold transition-colors duration-500 ${
                        isActive ? "text-slate-900" : "text-slate-400"
                      }`}
                    >
                      {step.title}
                    </h4>
                    <p
                      className={`text-[13px] leading-relaxed transition-colors duration-500 ${
                        isActive ? "text-slate-500" : "text-slate-400"
                      }`}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}