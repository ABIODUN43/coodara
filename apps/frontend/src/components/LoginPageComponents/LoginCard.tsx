import { useEffect, useRef, useState } from "react";
import { FaGithub } from "react-icons/fa";
import { useAuth } from "../../hooks/useAuth";

export function LoginCard() {
  const panelRef = useRef<HTMLDivElement>(null);
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 20 - 10;
      const y = (e.clientY / window.innerHeight) * 20 - 10;

      if (panelRef.current) {
        panelRef.current.style.transform =
          `translate3d(${x}px, ${y}px, 0)`;
      }
    };

    window.addEventListener(
      "mousemove",
      handleMouseMove
    );

    return () =>
      window.removeEventListener(
        "mousemove",
        handleMouseMove
      );
  }, []);

  async function handleGithubLogin() {
    setIsLoading(true);
    try {
      await login();
    } catch {
      setIsLoading(false);
    }
  }

  return (
    <div
      ref={panelRef}
      className="flex w-full flex-col items-center rounded-xl border border-white/[0.08] bg-[rgba(11,11,11,0.6)] p-6 text-center backdrop-blur-xl transition-transform duration-100 sm:p-10"
    >
      <h2 className="mb-1 text-2xl font-semibold text-[#e0e2e8]">
        Welcome Back
      </h2>

      <p className="mb-8 text-sm text-[#c3c5d8]">
        Continue with GitHub to access
        your architecture workspace.
      </p>

      <button
        onClick={handleGithubLogin}

        disabled={isLoading}
        className="group mb-2 flex w-full items-center cursor-pointer justify-center rounded-lg border border-white/10 bg-[#b7c4ff] px-4 py-3 transition-all duration-300 hover:bg-[#b7c4ff]/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"

      >
        <FaGithub className="mr-2 h-5 w-5 text-[#002682]" />

        <span className="text-xs font-medium tracking-wide text-[#002682]">
          {isLoading ? "Redirecting..." : "Continue with GitHub"}
        </span>
      </button>

      <button className="flex w-full items-center cursor-pointer justify-center rounded-lg border border-white/5 px-4 py-3 text-[#c3c5d8] transition-all duration-200 hover:border-white/15 hover:text-[#e0e2e8] active:scale-[0.98]">
        <span className="text-xs font-medium tracking-wide">
          Use other provider
        </span>
      </button>
    </div>
  );
}