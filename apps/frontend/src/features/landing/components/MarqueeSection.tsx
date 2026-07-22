const LOGOS = [
  { name: "GitHub", src: "https://cdn.simpleicons.org/github/white" },
  { name: "Stripe", src: "https://cdn.simpleicons.org/stripe/white" },
  { name: "Datadog", src: "https://cdn.simpleicons.org/datadog/white" },
  { name: "Vercel", src: "https://cdn.simpleicons.org/vercel/white" },
  { name: "Linear", src: "https://cdn.simpleicons.org/linear/white" },
  { name: "Supabase", src: "https://cdn.simpleicons.org/supabase/white" },
  { name: "PostgreSQL", src: "https://cdn.simpleicons.org/postgresql/white" },
  { name: "Docker", src: "https://cdn.simpleicons.org/docker/white" },
  { name: "AWS", src: "/src/assets/images/aws.jpg" },
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
        <div className="animate-marquee flex items-center gap-12 whitespace-nowrap md:gap-24">
          {[...LOGOS, ...LOGOS].map((logo, i) => (
            <div
              key={`${logo.name}-${i}`}
              className="flex items-center gap-3 cursor-pointer opacity-60 transition-all duration-300 hover:scale-110 hover:opacity-100"
            >
              <img
                alt={logo.name}
                src={logo.src}
                className="h-8 w-auto md:h-10"
              />
              <span className="text-sm font-medium text-white md:text-base">
                {logo.name}
              </span>
            </div>
          ))}
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
          animation: marquee 30s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
}