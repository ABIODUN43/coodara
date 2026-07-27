import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/components/common/AppLayout";
import { LandingPage } from "@/features/landing/pages/LandingPage";
import { LoginPage } from "@/features/landing/pages/LoginPage";
import AuthCallbackPage from "@/features/auth/pages/AuthCallbackPage";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      {
        path: "/",
        element: <LandingPage />,
      },
      {
        path: "/login",
        element: <LoginPage />,
      },
      {
        path: "/dashboard",
        element: <div>Dashboard</div>,
      },
      {
        path: "*",
        element: <div>404 Not Found</div>,
      },
      {
        path: "/auth/callback",
        element: <AuthCallbackPage />,
      },
    ],
  },
]);