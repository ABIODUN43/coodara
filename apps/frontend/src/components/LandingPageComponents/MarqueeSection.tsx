import {
  SiGithub,
  SiPostgresql,
  SiDocker,
  SiStripe,
  SiDatadog,
  SiVercel,
  SiLinear,
  SiSupabase,
  SiKubernetes,
  SiRedis,
} from "react-icons/si";
import { FaAws } from "react-icons/fa6";

const LOGOS = [
  { name: "GitHub", Icon: SiGithub, color: "text-white" },
  { name: "PostgreSQL", Icon: SiPostgresql, color: "text-[#336791]" },
  { name: "Docker", Icon: SiDocker, color: "text-[#2496ED]" },
  { name: "AWS", Icon: FaAws, color: "text-[#FF9900]" },
  { name: "Stripe", Icon: SiStripe, color: "text-[#635BFF]" },
  { name: "Datadog", Icon: SiDatadog, color: "text-[#632CA6]" },
  { name: "Vercel", Icon: SiVercel, color: "text-white" },
  { name: "Linear", Icon: SiLinear, color: "text-[#5E6AD2]" },
  { name: "Supabase", Icon: SiSupabase, color: "text-[#3ECF8E]" },
  { name: "Kubernetes", Icon: SiKubernetes, color: "text-[#326CE5]" },
  { name: "Redis", Icon: SiRedis, color: "text-[#DC382D]" },
];

export function MarqueeSection() {
  return (
    <section className="relative overflow-hidden bg-slate-950 py-16 text-white sm:py-20">
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-24 w-full bg-gradient-to-b from-white to-transparent" />

      <div className="relative z-20 mx-auto max-w-[1440px] px-4 sm:px-8">
        <div className="mb-12 text-center">
          <span className="mb-2 block text-[10px] pt-10 font-bold uppercase tracking-[0.2em] text-[#0051d5] sm:text-xs">
            Integrates with the tools modern engineering teams use
          </span>
          <h2 className="mb-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Built for Modern Engineering Teams
          </h2>
          <p className="mx-auto max-w-2xl text-slate-400">
            Integrates seamlessly with the tools developers already trust.
          </p>
        </div>
      </div>

      <div className="relative flex overflow-x-hidden py-6">
        <div className="animate-marquee flex items-center gap-8 whitespace-nowrap md:gap-14">
          {[...LOGOS, ...LOGOS].map((logo, i) => {
            const Icon = logo.Icon;
            return (
              <div
                key={`${logo.name}-${i}`}
                className="group flex items-center gap-3 cursor-pointer opacity-70 transition-all duration-300 hover:scale-105 hover:opacity-100"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900/90 border border-slate-800/80 p-2.5 text-slate-300 shadow-sm transition-all duration-200 group-hover:border-slate-700 group-hover:bg-slate-800">
                  <Icon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
                </div>
                <span className="text-sm font-medium text-slate-300 transition-colors group-hover:text-white md:text-base">
                  {logo.name}
                </span>
              </div>
            );
          })}
        </div>

        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-slate-950 to-transparent sm:w-32" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-slate-950 to-transparent sm:w-32" />
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 35s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
}