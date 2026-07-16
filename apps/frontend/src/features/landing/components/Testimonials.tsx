import { Section } from "@/components/layouts/Section";

const testimonials = [
  {
    quote:
      "Codara helped us identify architectural bottlenecks before they became production issues.",
    name: "Senior Backend Engineer",
    company: "Early Access Team",
  },
  {
    quote:
      "Architecture reviews that used to take days now take minutes with Codara.",
    name: "Engineering Manager",
    company: "Startup Beta Program",
  },
  {
    quote:
      "The Architecture Score has become part of our engineering workflow.",
    name: "Tech Lead",
    company: "Private Repository",
  },
];

export function Testimonials() {
  return (
    <Section>
      <div className="mb-16 text-center">
        <p className="mb-3 text-sm uppercase tracking-widest text-zinc-500">
          Testimonials
        </p>

        <h2 className="text-5xl font-bold">
          Loved by Engineering Teams
        </h2>

        <p className="mx-auto mt-6 max-w-3xl text-lg text-zinc-400">
          Teams use Codara to understand, improve, and evolve their software
          architecture.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {testimonials.map((testimonial) => (
          <div
            key={testimonial.quote}
            className="
              rounded-3xl
              border
              border-zinc-800
              bg-zinc-950
              p-8
            "
          >
            <p className="mb-8 text-lg leading-relaxed text-zinc-300">
              "{testimonial.quote}"
            </p>

            <div>
              <p className="font-semibold text-white">
                {testimonial.name}
              </p>

              <p className="text-sm text-zinc-500">
                {testimonial.company}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}