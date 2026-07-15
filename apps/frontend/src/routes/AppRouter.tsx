import { createBrowserRouter } from "react-router-dom";
import { LandingPage } from "@/features/landing/pages/LandingPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
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
    path: "/dashboard",
    element: <div>Dashboard</div>,
  },
]);


