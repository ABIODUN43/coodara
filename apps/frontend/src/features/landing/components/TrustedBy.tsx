import { Section } from "@/components/layouts/Section";

const companies = [
    "GitHub",
    "FastAPI",
    "PostgreSQL",
    "Docker",
    "AWS",
    "React",
    "TypeScript",
    "OpenAI",
];

export function TrustedBy() {
    return (
        <Section>
            <div className="text-center">
                <p className="mb-8 text-sm uppercase tracking-[0.3em] text-zinc-500">
                    Built With Industry Leading Technologies
                </p>

                <div className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:grid-cols-8">
                    {companies.map((company) => (
                        <div
                            key={company}
                            className="
                                rounded-2xl
                                border
                                border-zinc-800
                                bg-zinc-950
                                px-6
                                py-5
                                text-center
                                text-sm
                                font-semibold
                                text-zinc-400
                                transition-all
                                hover:border-zinc-700
                                hover:text-white
                            "
                        >
                            {company}
                        </div>
                    ))}
                </div>
            </div>
        </Section>
    );
}