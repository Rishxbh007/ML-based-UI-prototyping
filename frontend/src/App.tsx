import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import LandingPage from "@/pages/LandingPage";
import DashboardPage from "@/pages/DashboardPage";
import CreatePage from "@/pages/CreatePage";
import WorkspacePage from "@/pages/WorkspacePage";
import NotFoundPage from "@/pages/NotFoundPage";
import { RippleField } from "@/components/ui/ripple-field";

export default function App() {
  const location = useLocation();
  return (
    <>
      <div className="app-backdrop" aria-hidden />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/create" element={<CreatePage />} />
          <Route path="/workspace/:id" element={<WorkspacePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AnimatePresence>
      {/* App-wide interactive ripple layer — mounted once, outside the route
          transitions, so a click anywhere in the app sends out ripples. It's a
          fixed, pointer-events-none overlay so it never blocks interaction. */}
      <RippleField />
    </>
  );
}
