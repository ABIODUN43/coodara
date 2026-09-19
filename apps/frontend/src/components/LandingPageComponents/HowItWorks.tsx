"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import {
  Eye,
  Activity,
  Calculator,
  Zap,
  Compass,
  Code2,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";

interface Step {
  icon: LucideIcon;
  label: string;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    icon: Eye,
    label: "01",
    title: "Observe",
    description: "Understand what your system actually looks like across repositories, modules, and service dependencies.",
  },
  {
    icon: Activity,
    label: "02",
    title: "Measure",
    description: "Measure architectural health, coupling, instability, cycle density, and structural drift.",
  },
  {
    icon: Calculator,
    label: "03",
    title: "Quantify",
    description: "Quantify technical debt into tangible engineering hours, velocity drag, and operational risk.",
  },
  {
    icon: Zap,
    label: "04",
    title: "Predict",
    description: "Predict the blast radius and cascading architectural consequences of proposed PRs before merging.",
  },
  {
    icon: Compass,
    label: "05",
    title: "Decide",
    description: "Evaluate trade-offs, generate ADRs, and select the highest-ROI refactoring interventions.",
  },
  {
    icon: Code2,
    label: "06",
    title: "Execute",
    description: "Equip software engineers and AI coding agents with architecture-aware context to implement safely.",
  },
  {
    icon: CheckCircle2,
    label: "07",
    title: "Prove",
    description: "Verify post-implementation diffs to guarantee that your architecture actually improved.",
  },
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
    <section
      id="how-it-works"
      className="overflow-hidden bg-[#f8fafc] px-4 py-16 sm:px-8 sm:py-20 scroll-mt-12"
      ref={sectionRef}
    >
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-14 text-center">
          <span className="mb-2 inline-block text-xs font-bold uppercase tracking-widest text-blue-600">
            The Continuous Closed-Loop Engine
          </span>
          <h2 className="mb-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            The 7 Stages of Continuous Improvement
          </h2>
          <p className="mx-auto max-w-2xl text-slate-600">
            From architecture understanding to verified architecture improvement.
          </p>
        </div>

        <div className="relative">
          {/* Horizontal progress line — desktop only (single row) */}
          <div className="absolute left-[5%] right-[5%] top-11 z-0 hidden h-[2px] overflow-hidden rounded-full bg-slate-200 xl:block">
            <div
              ref={lineRef}
              className="h-full w-full origin-left bg-[#316bf3]"
              style={{ transform: "scaleX(0)" }}
            />
          </div>

          {/* Vertical progress line — mobile/tablet stacked layout */}
          <div className="absolute left-1/2 top-0 bottom-0 z-0 block w-[2px] -translate-x-1/2 overflow-hidden rounded-full bg-slate-200 xl:hidden">
            <div
              ref={verticalLineRef}
              className="h-full w-full origin-top bg-[#316bf3]"
              style={{ transform: "scaleY(0)" }}
            />
          </div>

          <div className="relative z-10 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-7">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;

              return (
                <div
                  key={step.title}
                  onClick={() => setCurrentStep(index)}
                  className={`flex flex-col items-center gap-3 rounded-2xl border bg-white p-5 text-center shadow-sm transition-all duration-500 cursor-pointer xl:items-start xl:text-left ${
                    isActive
                      ? "-translate-y-2 border-[#316bf3] ring-2 ring-[#316bf3]/20 shadow-[0_20px_35px_-15px_rgba(49,107,243,0.2)]"
                      : "border-slate-200/80 hover:border-slate-300"
                  }`}
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-500 ${
                      isActive ? "scale-110 bg-[#316bf3] text-white shadow-md shadow-blue-500/25" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div
                      className={`mb-1 text-[11px] font-bold uppercase tracking-wider transition-colors duration-500 ${
                        isActive ? "text-blue-600" : "text-slate-400"
                      }`}
                    >
                      Stage {step.label}
                    </div>
                    <h4
                      className={`mb-1.5 text-base font-bold transition-colors duration-500 ${
                        isActive ? "text-slate-900" : "text-slate-700"
                      }`}
                    >
                      {step.title}
                    </h4>
                    <p
                      className={`text-xs leading-relaxed transition-colors duration-500 ${
                        isActive ? "text-slate-600" : "text-slate-500"
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