const ITEMS = [
  { label: "STORES CODE", name: "GitHub" },
  { label: "WRITES CODE", name: "Cursor" },
  { label: "MONITORS SYSTEMS", name: "Datadog" },
];

export function ToolchainSection() {
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-16 sm:px-8 sm:py-20">
      <div className="mb-10 text-center">
        <h2 className="mb-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          The Toolchain
        </h2>
        <p className="text-slate-500">Where Coodara fits in your development cycle.</p>
      </div>

      <div className="grid grid-cols-2 gap-2 overflow-hidden rounded-2xl bg-transparent sm:gap-2 lg:grid-cols-4">
        {ITEMS.map((item) => (
          <div
            key={item.name}
            className="flex flex-col items-center gap-1 bg-[#F0EDEF] p-6 text-center sm:p-10"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500/70">
              {item.label}
            </p>
            <p className="text-xl font-bold text-slate-900">{item.name}</p>
          </div>
        ))}
        <div className="flex flex-col items-center gap-1 bg-black p-6 text-center text-white sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">
            IMPROVES ARCHITECTURE
          </p>
          <p className="text-xl font-bold">Coodara</p>
        </div>
      </div>
    </section>
  );
}