import { Section } from "@/components/layouts/Section";

export function ArchitectureDemo() {
    return (
        <Section>
            <div className="mb-16 text-center">
                <p className="mb-3 text-sm uppercase tracking-widest text-zinc-500">
                    Architecture Intelligence
                </p>

                <h2 className="text-5xl font-bold">
                    Understand Your Entire System
                </h2>

                <p className="mx-auto mt-6 max-w-3xl text-lg text-zinc-400">
                    Codara analyzes repositories, detects bottlenecks,
                    visualizes dependencies, and provides actionable AI
                    recommendations in real time.
                </p>
            </div>

            <div
                className="
                overflow-hidden
                rounded-3xl
                border
                border-zinc-800
                bg-zinc-950
                p-8
                shadow-2xl
            "
            >
                <div className="grid gap-8 lg:grid-cols-3">
                    {/* Repository Tree */}

                    <div className="rounded-2xl border border-zinc-800 bg-black p-6">
                        <h3 className="mb-4 font-semibold text-white">
                            Repository
                        </h3>

                        <div className="space-y-2 text-sm text-zinc-400">
                            <p>📁 apps</p>
                            <p className="ml-4">📁 frontend</p>
                            <p className="ml-8">📄 App.tsx</p>
                            <p className="ml-8">📄 main.tsx</p>

                            <p className="ml-4">📁 backend</p>
                            <p className="ml-8">📄 auth.py</p>
                            <p className="ml-8">📄 analysis.py</p>

                            <p>📁 services</p>
                            <p className="ml-4">📄 ai-service</p>
                            <p className="ml-4">📄 architecture-service</p>
                        </div>
                    </div>

                    {/* Architecture Graph */}

                    <div className="rounded-2xl border border-zinc-800 bg-black p-6">
                        <h3 className="mb-6 font-semibold text-white">
                            Architecture Graph
                        </h3>

                        <div className="flex h-64 items-center justify-center">
                            <div className="relative">
                                <div className="h-20 w-20 rounded-full bg-white text-black flex items-center justify-center">
                                    AI
                                </div>

                                <div className="absolute -left-24 top-4 rounded-xl border border-zinc-700 px-4 py-2">
                                    Frontend
                                </div>

                                <div className="absolute -right-24 top-4 rounded-xl border border-zinc-700 px-4 py-2">
                                    Backend
                                </div>

                                <div className="absolute left-0 top-28 rounded-xl border border-zinc-700 px-4 py-2">
                                    Database
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* AI Insights */}

                    <div className="rounded-2xl border border-zinc-800 bg-black p-6">
                        <h3 className="mb-4 font-semibold text-white">
                            AI Insights
                        </h3>

                        <div className="space-y-4">
                            <div className="rounded-xl bg-zinc-900 p-4">
                                <p className="font-medium text-white">
                                    Architecture Score
                                </p>

                                <p className="mt-2 text-4xl font-bold text-green-400">
                                    94
                                </p>
                            </div>

                            <div className="rounded-xl bg-zinc-900 p-4">
                                <p className="text-sm text-zinc-300">
                                    Circular dependency detected between:
                                </p>

                                <p className="mt-2 text-red-400">
                                    auth.py → user.py
                                </p>
                            </div>

                            <div className="rounded-xl bg-zinc-900 p-4">
                                <p className="text-sm text-zinc-300">
                                    Recommendation
                                </p>

                                <p className="mt-2 text-zinc-400">
                                    Introduce a service layer to reduce
                                    coupling by 37%.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Section>
    );
}