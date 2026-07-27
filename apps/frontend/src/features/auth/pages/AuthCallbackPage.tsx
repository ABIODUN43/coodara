import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { getCurrentUser } from "@/api/auth";
import { useAuthStore } from "@/store/auth.store";

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const authenticate = async () => {
      const params =
        new URLSearchParams(
          window.location.search
        );

      const accessToken =
        params.get("access_token");

      const refreshToken =
        params.get("refresh_token");

      if (
        !accessToken ||
        !refreshToken
      ) {
        navigate("/login");
        return;
      }

      localStorage.setItem(
        "access_token",
        accessToken
      );

      localStorage.setItem(
        "refresh_token",
        refreshToken
      );

      try {
        const response =
          await getCurrentUser(
            accessToken
          );

        useAuthStore
          .getState()
          .setUser(
            response.user
          );

        navigate(
          "/dashboard"
        );

      } catch (error) {

        console.error(error);

        navigate("/login");
      }
    };

    authenticate();
  }, [navigate]);

  return (
    <div className="flex h-screen items-center justify-center">
      Authenticating...
    </div>
  );
}