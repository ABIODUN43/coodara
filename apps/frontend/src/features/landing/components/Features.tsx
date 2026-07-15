const features = [
    "AI Architecture Analysis",
    "Repository Intelligence",
    "Architecture Memory",
    "Context-Aware AI",
    "GitHub Integration",
    "Architecture Evolution",
  ];

  export function Features() {
    return (
      <section className="py-32">
        <h2 className="mb-12 text-center text-4xl font-bold">
          Features
        </h2>

        <div className="mx-auto grid max-w-6xl grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature}
              className="rounded-2xl border p-8"
            >
              <h3 className="text-xl font-semibold">
                {feature}
              </h3>
            </div>
          ))}
        </div>
      </section>
    );
  }