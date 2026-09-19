import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FaGithub } from "react-icons/fa";
import { Sparkles, AlertTriangle } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

export function LoginCard() {
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const oauthError = searchParams.get("error");
  const { login, demoLogin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);

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

  async function handleInstantDemoLogin() {
    setIsDemoLoading(true);
    try {
      await demoLogin();
      navigate("/dashboard");
    } catch (err) {
      console.error("Demo login error:", err);
    } finally {
      setIsDemoLoading(false);
    }
  }

  return (
    <div
      ref={panelRef}
      className="flex w-full flex-col items-center rounded-xl border border-white/8 bg-[rgba(11,11,11,0.6)] p-6 text-center backdrop-blur-xl transition-transform duration-100 sm:p-10"
    >
      <h2 className="mb-1 text-2xl font-semibold text-[#e0e2e8]">
        Welcome to Coodara
      </h2>

      <p className="mb-6 text-sm text-[#c3c5d8]">
        Continuous Architecture Intelligence & Improvement Platform.
      </p>

      {oauthError && (
        <div className="mb-4 flex w-full flex-col gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-left text-xs text-rose-200">
          <div className="flex items-center gap-1.5 font-semibold text-rose-100">
            <AlertTriangle className="h-4 w-4 text-rose-300 flex-shrink-0" />
            <span>Authentication Notice</span>
          </div>
          <p className="text-rose-200/90 leading-relaxed break-words">{oauthError}</p>
        </div>
      )}

      {/* GitHub OAuth Button */}
      <button
        onClick={handleGithubLogin}
        disabled={isLoading || isDemoLoading}
        className="group mb-3 flex w-full items-center cursor-pointer justify-center rounded-lg border border-white/10 bg-[#b7c4ff] px-4 py-3 transition-all duration-300 hover:bg-[#b7c4ff]/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <FaGithub className="mr-2 h-5 w-5 text-[#002682]" />

        <span className="text-xs font-semibold tracking-wide text-[#002682]">
          {isLoading ? "Redirecting..." : "Continue with GitHub"}
        </span>
      </button>

      {/* Instant Demo Login Button */}
      <button
        onClick={handleInstantDemoLogin}
        disabled={isLoading || isDemoLoading}
        className="flex w-full items-center cursor-pointer justify-center rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-[#e0e2e8] transition-all duration-200 hover:bg-white/10 hover:border-white/25 active:scale-[0.98] disabled:opacity-60"
      >
        <Sparkles className="mr-2 h-4 w-4 text-[#b7c4ff]" />
        <span className="text-xs font-semibold tracking-wide">
          {isDemoLoading ? "Signing in..." : "Instant Architecture Workspace (Demo)"}
        </span>
      </button>
    </div>
  );
}