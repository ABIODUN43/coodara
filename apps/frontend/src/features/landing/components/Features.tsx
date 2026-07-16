import { Section } from "@/components/layouts/Section";

const features = [
    {
        title: "AI Architecture Analysis",
        description:
            "Analyze repositories and identify architectural bottlenecks.",
    },
    {
        title: "Repository Intelligence",
        description:
            "Understand dependencies, services, and system boundaries.",
    },
    {
        title: "Architecture Memory",
        description:
            "Track architectural evolution across your codebase.",
    },
    {
        title: "Context-Aware AI",
        description:
            "Receive suggestions tailored to your architecture.",
    },
    {
        title: "GitHub Integration",
        description:
            "Connect repositories in seconds using GitHub OAuth.",
    },
    {
        title: "Architecture Evolution",
        description:
            "Visualize changes across releases and deployments.",
    },
];

export function Features() {
    return (
        <Section>
            <div className="text-center mb-16">
                <h2 className="text-4xl font-bold">
                    Everything You Need
                </h2>

                <p className="mt-4 text-zinc-400">
                    The operating system for software architecture.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {features.map((feature) => (
                    <div
                        key={feature.title}
                        className="
                            rounded-2xl
                            border
                            border-zinc-800
                            bg-zinc-900/50
                            p-6
                        "
                    >
                        <h3 className="text-xl font-semibold mb-3">
                            {feature.title}
                        </h3>

                        <p className="text-zinc-400">
                            {feature.description}
                        </p>
                    </div>
                ))}
            </div>
        </Section>
    );
}