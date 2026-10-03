import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { useAuthContext } from "@/context/AuthContext";
import { setAuthToken } from "@/api/client";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuthContext();
  const executedRef = useRef(false);

  useEffect(() => {
    if (executedRef.current) return;
    executedRef.current = true;

    let mounted = true;

    async function authenticate() {
      try {
        // Extract token from URL hash (e.g. #token=... or #access_token=...)
        const hash = window.location.hash;
        if (hash) {
          const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
          const token =
            hashParams.get("token") || hashParams.get("access_token");
          if (token) {
            setAuthToken(token);
          }
          // Clean the sensitive hash from the browser address bar
          if (window.history && window.history.replaceState) {
            window.history.replaceState(
              null,
              "",
              window.location.pathname + window.location.search,
            );
          }
        }

        // Also check search params if provided via query
        const searchParams = new URLSearchParams(window.location.search);
        const queryToken =
          searchParams.get("token") || searchParams.get("access_token");
        if (queryToken) {
          setAuthToken(queryToken);
        }

        /*
         * Hydrate authenticated user state using either cookies
         * or the extracted Bearer token.
         */
        await refreshUser();

        if (mounted) {
          navigate("/dashboard", {
            replace: true,
          });
        }
      } catch (error) {
        console.error("GitHub authentication callback failed:", error);

        if (mounted) {
          navigate("/login", {
            replace: true,
          });
        }
      }
    }

    void authenticate();

    return () => {
      mounted = false;
    };
  }, [navigate, refreshUser]);

  return (
    <div className="flex h-screen items-center justify-center bg-black text-[#e0e2e8]">
      Authenticating...
    </div>
  );
}