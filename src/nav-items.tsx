import { HomeIcon } from "lucide-react";
import Index from "./pages/Index.tsx";
import TrainPage from "./pages/TrainPage.tsx";
import AuthPage from "./pages/AuthPage.tsx";
import NotFound from "./pages/NotFound.tsx";

/**
 * Central place for defining the navigation items. Used for navigation components and routing.
 */
export const navItems = [
  {
    title: "Home",
    to: "/",
    icon: <HomeIcon className="h-4 w-4" />,
    page: <Index />,
  },
  {
    title: "Train",
    to: "/train",
    page: <TrainPage />,
  },
  {
    title: "Auth",
    to: "/auth",
    page: <AuthPage />,
  },
  {
    title: "404",
    to: "*",
    page: <NotFound />,
  }
];