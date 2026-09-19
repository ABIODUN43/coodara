"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { HelpCircle, Plus, Send, Sparkles, CheckCircle2 } from "lucide-react";

interface ChatScenario {
  id: string;
  badge: string;
  shortPrompt: string;
  shortRecommendation: string;
  fullQuestion: string;
  analyzingLine: string;
  findingLine: string;
  recommendationLine: string;
  score: number;
  services: number;
  issues: number;
  circular: number;
}

const SCENARIOS: ChatScenario[] = [
  {
    id: "billing",
    badge: "LATENCY & COUPLING",
    shortPrompt: "How does the new billing module impact current latency?",
    shortRecommendation: "Analysis recommends async decoupling from TaxValidator.",
    fullQuestion: "How does the new billing module impact current latency?",
    analyzingLine: "Analyzing /billing and /user-gateway topology...",
    findingLine: "Synchronous calls to TaxValidator may increase p99 latency by ~45ms.",
    recommendationLine: "Recommendation: Decouple via async event broker to preserve <10ms SLA.",
    score: 94,
    services: 18,
    issues: 4,
    circular: 0,
  },
  {
    id: "payment",
    badge: "BOUNDARY INTEGRITY",
    shortPrompt: "Where should I add a payment service?",
    shortRecommendation: "Analysis recommends isolating in /services/payments with ACL.",
    fullQuestion: "Where should I add a payment service without violating domain boundaries?",
    analyzingLine: "Scanning 18 services and dependency boundaries...",
    findingLine: "Direct coupling to OrderService violates ADR-08 (Boundary Isolation).",
    recommendationLine: "Recommendation: Insert Port-Adapter Interface to maintain high cohesion.",
    score: 91,
    services: 19,
    issues: 2,
    circular: 0,
  },
  {
    id: "worker",
    badge: "MICROSERVICE EXTRACTION",
    shortPrompt: "Can we safely extract NotificationWorker?",
    shortRecommendation: "Safe for extraction with zero circular dependencies.",
    fullQuestion: "Can we safely extract NotificationWorker into a standalone service?",
    analyzingLine: "Evaluating efferent fan-out and shared data stores...",
    findingLine: "Low coupling detected (Ce: 1, Ca: 0, Instability I: 0.14).",
    recommendationLine: "Safe for extraction: Estimated health score gain is +5.2 points.",
    score: 98,
    services: 20,
    issues: 0,
    circular: 0,
  },
];

export function ArchitectChat() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.2 });

  const [scenarioIndex, setScenarioIndex] = useState(0);
  const scenario = SCENARIOS[scenarioIndex];

  // Animation states: 'typing_input' | 'sending' | 'thinking' | 'answering' | 'completed'
  const [phase, setPhase] = useState<
    "typing_input" | "sending" | "thinking" | "answering" | "completed"
  >("typing_input");

  const [typedInput, setTypedInput] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState("");
  const [answerStep, setAnswerStep] = useState(0); // 0: none, 1: analyzing, 2: finding, 3: recommendation

  // Counted up score values
  const [displayScore, setDisplayScore] = useState(0);
  const [displayServices, setDisplayServices] = useState(0);
  const [displayIssues, setDisplayIssues] = useState(0);
  const [displayCircular, setDisplayCircular] = useState(0);

  // Handle scenario selection from left side
  const handleSelectScenario = (idx: number) => {
    setScenarioIndex(idx);
    setPhase("typing_input");
    setTypedInput("");
    setSubmittedQuestion("");
    setAnswerStep(0);
    setDisplayScore(0);
    setDisplayServices(0);
    setDisplayIssues(0);
    setDisplayCircular(0);
  };

  // Main animation driver
  useEffect(() => {
    if (!isInView) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    let intervalId: ReturnType<typeof setInterval>;

    if (phase === "typing_input") {
      let charIdx = 0;
      setTypedInput("");
      setSubmittedQuestion("");
      setAnswerStep(0);
      setDisplayScore(0);
      setDisplayServices(0);
      setDisplayIssues(0);
      setDisplayCircular(0);

      intervalId = setInterval(() => {
        charIdx++;
        setTypedInput(scenario.fullQuestion.slice(0, charIdx));
        if (charIdx >= scenario.fullQuestion.length) {
          clearInterval(intervalId);
          timeoutId = setTimeout(() => {
            setPhase("sending");
          }, 400);
        }
      }, 35);
    } else if (phase === "sending") {
      setSubmittedQuestion(scenario.fullQuestion);
      setTypedInput("");
      timeoutId = setTimeout(() => {
        setPhase("thinking");
      }, 300);
    } else if (phase === "thinking") {
      timeoutId = setTimeout(() => {
        setPhase("answering");
        setAnswerStep(1);
      }, 700);
    } else if (phase === "answering") {
      // Reveal answer line 2 after 700ms
      const t1 = setTimeout(() => {
        setAnswerStep(2);
      }, 700);

      // Reveal answer line 3 after 1400ms and animate scores
      const t2 = setTimeout(() => {
        setAnswerStep(3);
        setPhase("completed");
      }, 1500);

      // Smooth count-up for scores
      const duration = 1200;
      const startTime = performance.now();
      const animateScores = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3); // cubic ease out

        setDisplayScore(Math.round(scenario.score * ease));
        setDisplayServices(Math.round(scenario.services * ease));
        setDisplayIssues(Math.round(scenario.issues * ease));
        setDisplayCircular(Math.round(scenario.circular * ease));

        if (progress < 1) {
          requestAnimationFrame(animateScores);
        }
      };
      requestAnimationFrame(animateScores);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    } else if (phase === "completed") {
      // Hold for 7 seconds, then auto-advance to next scenario
      timeoutId = setTimeout(() => {
        setScenarioIndex((prev) => (prev + 1) % SCENARIOS.length);
        setPhase("typing_input");
      }, 7000);
    }

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [isInView, phase, scenarioIndex, scenario.fullQuestion, scenario.score, scenario.services, scenario.issues, scenario.circular]);

  return (
    <section
      ref={containerRef}
      className="mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-12 px-4 py-16 sm:px-8 sm:py-20 lg:grid-cols-2"
    >
      {/* Left side: narrative & interactive scenario prompts */}
      <div>
        <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-[#0051d5]">
          INTELLIGENT REASONING
        </span>
        <h2 className="mb-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Ask your architecture.
        </h2>
        <p className="mb-8 leading-relaxed text-slate-600">
          Coodara&apos;s AI Architect doesn&apos;t just read raw text—it reasons over
          dependency graphs, blast radiuses, and architectural invariants in real time.
        </p>

        {/* Interactive Scenario Cards */}
        <div className="space-y-3">
          {SCENARIOS.map((s, idx) => {
            const isSelected = idx === scenarioIndex;
            return (
              <div
                key={s.id}
                onClick={() => handleSelectScenario(idx)}
                className={`group flex cursor-pointer items-start gap-3.5 rounded-xl p-4 transition-all duration-300 ${
                  isSelected
                    ? "border-2 border-slate-900 bg-white shadow-md"
                    : "border border-slate-200/80 bg-[#F0EDEF]/70 hover:bg-[#F0EDEF]"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    isSelected ? "bg-slate-900 text-white" : "bg-white text-slate-700"
                  }`}
                >
                  <HelpCircle className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        isSelected ? "text-blue-600" : "text-slate-500"
                      }`}
                    >
                      {s.badge}
                    </span>
                    {isSelected && (
                      <span className="flex h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
                    )}
                  </div>
                  <p
                    className={`text-sm font-semibold transition-colors ${
                      isSelected ? "text-slate-900" : "text-slate-700"
                    }`}
                  >
                    &quot;{s.shortPrompt}&quot;
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {s.shortRecommendation}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right side: Live animated metrics & terminal chat */}
      <div className="flex flex-col gap-4">
        {/* Real-time score ticker */}
        <div className="grid grid-cols-2 gap-4 rounded-xl border border-white/10 bg-black p-4 text-white shadow-xl sm:grid-cols-4">
          <div className="text-center">
            <p className="text-2xl font-extrabold tracking-tight transition-all duration-300">
              {displayScore}
            </p>
            <p className="text-[10px] uppercase font-bold tracking-wider text-white/60">
              Score
            </p>
          </div>
          <div className="border-l border-white/10 text-center">
            <p className="text-2xl font-extrabold tracking-tight transition-all duration-300">
              {displayServices}
            </p>
            <p className="text-[10px] uppercase font-bold tracking-wider text-white/60">
              Services
            </p>
          </div>
          <div className="border-l border-white/10 text-center">
            <p className="text-2xl font-extrabold tracking-tight text-amber-400 transition-all duration-300">
              {displayIssues}
            </p>
            <p className="text-[10px] uppercase font-bold tracking-wider text-white/60">
              Issues
            </p>
          </div>
          <div className="border-l border-white/10 text-center">
            <p className="text-2xl font-extrabold tracking-tight text-emerald-400 transition-all duration-300">
              {displayCircular}
            </p>
            <p className="text-[10px] uppercase font-bold tracking-wider text-white/60">
              Circular
            </p>
          </div>
        </div>

        {/* Terminal Chat Window */}
        <div className="overflow-hidden rounded-xl border border-white/10 shadow-2xl">
          {/* Terminal Title Bar */}
          <div className="flex items-center justify-between border-b border-white/5 bg-slate-900 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <div className="ml-3 rounded-md bg-slate-800 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-slate-300">
                AI Architect Chat
              </div>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Context Connected
            </div>
          </div>

          {/* Terminal Conversation Body */}
          <div className="flex min-h-[320px] flex-col bg-[#0b0f1a] p-5 font-mono text-sm">
            {/* User Message */}
            {submittedQuestion && (
              <div className="mb-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-start gap-2.5">
                  <span className="shrink-0 font-bold text-blue-400">User:</span>
                  <p className="text-white leading-relaxed">{submittedQuestion}</p>
                </div>
              </div>
            )}

            {/* Thinking indicator */}
            {phase === "thinking" && (
              <div className="mb-4 flex items-center gap-2 text-slate-400 text-xs animate-pulse">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400 animate-spin" />
                <span>AI Architect is reasoning over system dependency graph...</span>
              </div>
            )}

            {/* Architect Response Bubble */}
            {answerStep > 0 && (
              <div className="mb-4 rounded-xl border border-white/10 bg-slate-900/80 p-5 shadow-lg animate-in fade-in zoom-in-95 duration-400">
                <div className="flex items-start gap-2.5">
                  <span className="shrink-0 font-bold text-emerald-400">Architect:</span>
                  <div className="space-y-2.5 text-slate-200">
                    {/* Step 1: Analyzing line */}
                    {answerStep >= 1 && (
                      <p className="text-slate-300 animate-in fade-in duration-300">
                        {scenario.analyzingLine}
                      </p>
                    )}

                    {/* Step 2: Finding line */}
                    {answerStep >= 2 && (
                      <p className="text-slate-100 animate-in fade-in duration-300">
                        {scenario.findingLine}
                      </p>
                    )}

                    {/* Step 3: Recommendation line */}
                    {answerStep >= 3 && (
                      <div className="mt-2 flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-950/30 p-2.5 text-xs text-emerald-300 animate-in fade-in duration-300">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                        <span>{scenario.recommendationLine}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Interactive Typing Input Bar */}
            <div className="mt-auto flex items-center gap-2.5 border-t border-white/10 pt-4">
              <Plus className="h-4 w-4 text-slate-500 shrink-0" />
              <div className="flex-1 truncate text-xs text-slate-300">
                {phase === "typing_input" ? (
                  <span className="flex items-center text-white">
                    {typedInput}
                    <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-emerald-400" />
                  </span>
                ) : (
                  <span className="italic text-slate-600">Type architecture questions...</span>
                )}
              </div>
              <Send
                className={`h-4 w-4 shrink-0 transition-colors ${
                  phase === "sending"
                    ? "text-emerald-400 scale-110"
                    : "text-slate-600"
                }`}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}