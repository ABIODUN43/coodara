export function LoginFooter() {
  return (
    <footer className="mt-6 px-4 text-center">
      <p className="text-[10px] leading-relaxed text-[#c3c5d8] opacity-60">
        By continuing you agree to our <br />
        <a href="#" className="underline transition-colors hover:text-[#b7c4ff]">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="#" className="underline transition-colors hover:text-[#b7c4ff]">
          Privacy Policy
        </a>
        .
      </p>
    </footer>
  );
}