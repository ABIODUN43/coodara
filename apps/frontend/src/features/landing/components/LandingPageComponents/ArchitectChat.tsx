import { HelpCircle, Plus, Send } from "lucide-react";

export function ArchitectChat() {
  return (
    <section className="mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-12 px-4 py-16 sm:px-8 sm:py-20 lg:grid-cols-2">
      <div>
        <span className="mb-2 block text-xs font-bold text-[#0051d5]">
          INTELLIGENT REASONING
        </span>
        <h2 className="mb-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Ask your architecture.
        </h2>
        <p className="mb-8 leading-relaxed text-slate-500">
          Coodara&apos;s AI Architect doesn&apos;t just read code—it reasons about
          structures. Ask deep questions about your system and get answers backed
          by real repository data.
        </p>

        <div className="group flex cursor-pointer items-start gap-4 rounded-xl bg-[#F0EDEF] p-4 transition-colors duration-[600ms] hover:bg-slate-100">
          <HelpCircle className="mt-1 h-5 w-5 shrink-0 text-slate-900 transition-transform duration-[600ms] group-hover:scale-110" />
          <div>
            <p className="font-semibold text-slate-900">
              &quot;Where should I add a payment service?&quot;
            </p>
            <p className="text-sm text-slate-500">
              Analysis recommends decoupling from OrderService.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4 rounded-xl border border-white/10 bg-black p-4 text-white shadow-xl sm:grid-cols-4">
          <div className="text-center">
            <p className="text-2xl font-bold">94</p>
            <p className="text-[10px] uppercase text-white/60">Score</p>
          </div>
          <div className="border-l border-white/10 text-center">
            <p className="text-2xl font-bold">18</p>
            <p className="text-[10px] uppercase text-white/60">Services</p>
          </div>
          <div className="border-l border-white/10 text-center">
            <p className="text-2xl font-bold text-amber-400">4</p>
            <p className="text-[10px] uppercase text-white/60">Issues</p>
          </div>
          <div className="border-l border-white/10 text-center">
            <p className="text-2xl font-bold text-emerald-400">0</p>
            <p className="text-[10px] uppercase text-white/60">Circular</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="flex items-center gap-2 border-b border-white/5 bg-slate-900 px-4 py-2">
            <div className="flex gap-1">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
              <div className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <div className="ml-4 rounded-md bg-slate-800 px-3 py-0.5 font-mono text-[10px] text-slate-400">
              AI Architect Chat
            </div>
          </div>

          <div className="flex min-h-[300px] flex-col bg-[#0b0f1a] p-4 font-mono text-sm">
            <div className="mb-7 mt-4">
              <div className="mb-1 flex gap-2">
                <span className="text-[#0051d5]/70">User:</span>
                <p className="text-white">
                  How does the new billing module impact current latency?
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-white/5 bg-slate-900/50 p-7">
              <div className="mb-1 flex gap-2">
                <span className="text-emerald-400/70">Architect:</span>
                <div className="space-y-2 text-slate-300">
                  <p>
                    Analyzing <span className="text-amber-300">/billing</span> and{" "}
                    <span className="text-amber-300">/user-gateway</span>...
                  </p>
                  <p>
                    Synchronous calls to{" "}
                    <span className="text-sky-300">TaxValidator</span> may increase
                    p99 latency by ~45ms.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-auto flex items-center gap-2 border-t border-white/5 pt-4">
              <Plus className="h-5 w-5 text-slate-500" />
              <div className="flex-1 italic text-slate-600">
                Type architecture questions...
              </div>
              <Send className="h-5 w-5 text-emerald-500" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}