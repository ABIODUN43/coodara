import { SearchCheck, Share2, TrendingUp, Users, ShieldCheck, History, MessageSquare, CheckCircle2 } from "lucide-react";

const PILLARS = [
  { icon: SearchCheck, bg: "bg-[#dbe1ff]", iconColor: "text-[#00174b]", title: "Analyze", description: "Automated repository scanning to understand dependencies and patterns.", points: ["Architecture Intelligence", "Health Score Tracking"] },
  { icon: Share2, bg: "bg-[#dce1fb]", iconColor: "text-[#151b2d]", title: "Visualize", description: "Live generation of dependency graphs and service maps.", points: ["Architecture Memory", "AI Architect Chat"] },
  { icon: TrendingUp, bg: "bg-[#dae3f0]", iconColor: "text-[#131d25]", title: "Evolve", description: "AI-driven refactoring and structural health monitoring.", points: ["Architecture Evolution", "Enterprise Security"] },
];

const SECONDARY_FEATURES = [
  { icon: Users, title: "Team Collaboration", description: "Shared architecture views and annotation tools." },
  { icon: ShieldCheck, title: "Enterprise Security", description: "SOC2 compliant, private VPC deployments." },
  { icon: History, title: "Architecture Memory", description: "Record design decisions and rationale." },
  { icon: MessageSquare, title: "AI Architect Chat", description: "Expert reasoning about your system structure." },
];

export function FeaturesSection() {
  return (
    <section className="px-4 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 transition-shadow duration-[600ms] hover:shadow-sm sm:p-8 sm:py-14"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${pillar.bg}`}>
                  <Icon className={`h-6 w-6 ${pillar.iconColor}`} />
                </div>
                <h3 className="text-xl font-semibold text-slate-900">{pillar.title}</h3>
                <p className="text-slate-500">{pillar.description}</p>
                <ul className="mt-auto space-y-2">
                  {pillar.points.map((point) => (
                    <li key={point} className="flex items-center gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#0051d5]" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {SECONDARY_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="flex flex-col gap-2 rounded-xl bg-[#F0EDEF] p-4 sm:p-6">
                <Icon className="h-6 w-6 text-slate-900" />
                <p className="font-bold text-slate-900">{feature.title}</p>
                <p className="text-xs text-slate-500">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}