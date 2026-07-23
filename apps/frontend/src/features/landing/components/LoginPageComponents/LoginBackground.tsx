export function LoginBackground() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-1/4 top-1/4 h-1/2 w-1/2 rounded-full bg-[#b7c4ff]/5 blur-[120px]" />
        <div className="absolute -right-1/4 bottom-1/4 h-1/2 w-1/2 rounded-full bg-[#b7c4ff]/10 blur-[120px]" />
      </div>

      <div className="pointer-events-none fixed bottom-0 left-0 right-0 h-px w-full overflow-hidden opacity-20">
        <div className="absolute left-0 h-px w-full bg-gradient-to-r from-transparent via-[#b7c4ff] to-transparent blur-[1px]" />
      </div>
    </>
  );
}