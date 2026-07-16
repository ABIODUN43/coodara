import { Section } from "@/components/layouts/Section";


const steps = [
    {
        number: "01",
        title: "Connect GitHub",
        description:
            "Authenticate with GitHub and import your repositories securely.",
    },
    {
        number: "02",
        title: "Analyze Architecture",
        description:
            "Codara scans your codebase and builds an architectural model of your system.",
    },
    {
        number: "03",
        title: "Receive AI Insights",
        description:
            "Get architecture scores, bottleneck detection, and actionable recommendations.",
    },
];

export function HowItWorks() {
    return (
        <Section>
            <div className="mb-16 text-center">
                <p className="mb-3 text-sm uppercase tracking-widest text-zinc-500">
                    How It Works
                </p>

                <h2 className="text-5xl font-bold">
                    Three Steps to Better Architecture
                </h2>

                <p className="mx-auto mt-6 max-w-3xl text-lg text-zinc-400">
                    From repository import to AI-powered insights in just a few
                    clicks.
                </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {steps.map((step) => (
                    <div
                        key={step.number}
                        className="
                            rounded-3xl
                            border
                            border-zinc-800
                            bg-zinc-950
                            p-8
                            transition-all
                            hover:-translate-y-1
                        "
                    >
                        <div className="mb-6 text-6xl font-bold text-zinc-800">
                            {step.number}
                        </div>

                        <h3 className="mb-4 text-2xl font-semibold">
                            {step.title}
                        </h3>

                        <p className="text-zinc-400">
                            {step.description}
                        </p>
                    </div>
                ))}
            </div>
        </Section>
    );
}