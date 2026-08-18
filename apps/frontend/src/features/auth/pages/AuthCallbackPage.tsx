import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useAuthContext } from "@/context/AuthContext";

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  const { refreshUser } = useAuthContext();

  useEffect(() => {
    let mounted = true;

    async function authenticate() {
      try {
        /*
         * The backend has already completed GitHub OAuth
         * and set HttpOnly authentication cookies.
         *
         * We only need to restore the authenticated user.
         */
        await refreshUser();

        if (mounted) {
          navigate("/dashboard", {
            replace: true,
          });
        }
      } catch (error) {
        console.error(
          "GitHub authentication callback failed:",
          error,
        );

        if (mounted) {
          navigate("/login", {
            replace: true,
          });
        }
      }
    }

    authenticate();

    return () => {
      mounted = false;
    };
  }, [navigate, refreshUser]);

  return (
    <div className="flex h-screen items-center justify-center">
      Authenticating...
    </div>
  );
}