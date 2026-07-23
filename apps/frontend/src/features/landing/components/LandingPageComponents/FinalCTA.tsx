import { Rocket } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="bg-[#F0EDEF] px-4 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
        <h2 className="mb-6 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Ready to evolve your architecture?
        </h2>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button className="flex w-full items-center cursor-pointer justify-center gap-2 rounded-xl bg-black px-10 py-4 font-semibold text-white shadow-lg duration-[600ms] transition-all hover:opacity-90 active:scale-95 sm:w-auto">
            <span>Start Free</span>
            <Rocket className="h-5 w-5" />
          </button>
          <button className="w-full cursor-pointer rounded-xl border border-slate-300 bg-white px-10 duration-[600ms] py-4 font-semibold text-slate-900 transition-all hover:bg-slate-50 active:scale-95 sm:w-auto">
            Book Demo
          </button>
        </div>

        <p className="mt-6 text-sm text-slate-500">
          Join over 500+ high-growth engineering teams.
        </p>
      </div>
    </section>
  );
}