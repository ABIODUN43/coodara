import { useEffect } from "react";
import { LoginBackground } from "../components/LoginPageComponents/LoginBackground";
import { LoginHeader } from "../components/LoginPageComponents/LoginHeader";
import { LoginCard } from "../components/LoginPageComponents/LoginCard";
import { LoginFooter } from "../components/LoginPageComponents/LoginFooter";

export function LoginPage() {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return (
    <div className="flex h-screen flex-col items-center justify-center overflow-hidden bg-black p-8 text-[#e0e2e8]">
      <LoginBackground />

      <main className="relative z-10 flex w-full max-w-[400px] flex-col items-center">
        <LoginHeader />
        <LoginCard />
        <LoginFooter />
      </main>
    </div>
  );
}