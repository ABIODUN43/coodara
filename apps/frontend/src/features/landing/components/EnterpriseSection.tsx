import { KeyRound, FileClock, ShieldCheck, Building2 } from "lucide-react";

const FEATURES = [
  { icon: KeyRound, title: "SSO & Auth", description: "SAML, Okta, and Google Workspace integration for secure access." },
  { icon: FileClock, title: "Audit Logs", description: "Full traceability for compliance and security monitoring." },
  { icon: ShieldCheck, title: "RBAC", description: "Granular permissions to control repository and data access." },
  { icon: Building2, title: "Multi-org Support", description: "Centralized management across multiple teams and business units." },
];

export function EnterpriseSection() {
  return (
    <section className="bg-black px-4 py-16 text-white sm:px-8 sm:py-20">
            <div className="mx-auto max-w-[1440px]">
        <div className="mb-12 text-center">
          <h2 className="mb-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Built for Engineering Teams
          </h2>
          <p className="mx-auto max-w-2xl text-white/60">
            Trusted by CTOs and EMs at the world&apos;s most innovative tech companies.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 ">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 transition-all hover:bg-white/10"
              >
                <Icon className="mb-4 h-8 w-8 text-[#0051d5]" />
                <h3 className="mb-1 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-white/60">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}