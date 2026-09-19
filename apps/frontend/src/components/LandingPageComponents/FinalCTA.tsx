import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export function FinalCTA() {
  return (
    <section className="bg-[#F0EDEF] px-4 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="mb-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Ready to continuously improve your software architecture?
        </h2>
        <p className="mb-8 text-base text-slate-600 sm:text-lg">
          From architecture understanding to verified architecture improvement.
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link to="/login" className="w-full sm:w-auto">
            <button className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-900 px-8 py-4 font-semibold text-white shadow-lg transition-all duration-300 hover:bg-slate-800 active:scale-95 sm:w-auto">
              <span>Analyze Your Architecture</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
          <a href="#how-it-works" className="w-full sm:w-auto">
            <button className="w-full cursor-pointer rounded-xl border border-slate-300 bg-white px-8 py-4 font-semibold text-slate-900 shadow-sm transition-all duration-300 hover:bg-slate-50 active:scale-95 sm:w-auto">
              See How It Works
            </button>
          </a>
        </div>

        <p className="mt-6 text-xs text-slate-500">
          Analyze any repository in seconds • Zero intrusive agents required
        </p>
      </div>
    </section>
  );
}