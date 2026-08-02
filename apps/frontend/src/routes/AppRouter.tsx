import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/components/common/AppLayout";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/LoginPage";
import AuthCallbackPage from "@/features/auth/pages/AuthCallbackPage";
import { DashboardLayout } from "@/pages/DashboardLayout";
import { DashboardHome } from "@/pages/DashboardHome";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <LandingPage /> },
      { path: "/login", element: <LoginPage /> },
      {
        path: "/dashboard",
        element: <DashboardLayout />,
        children: [{ index: true, element: <DashboardHome /> }],
      },
      { path: "*", element: <div>404 Not Found</div> },
      { path: "/auth/callback", element: <AuthCallbackPage /> },
    ],
  },
]);