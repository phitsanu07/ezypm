import { useEffect, type ReactNode } from "react";
import { usePortfolioStore } from "@/frontend/store/usePortfolioStore";
import { useActivitiesStore } from "@/frontend/store/useActivitiesStore";
import { useAuthStore } from "@/frontend/store/useAuthStore";
import { ToastContainer } from "@/frontend/components/ui/Toast";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const authStatus = useAuthStore((s) => s.status);

  useEffect(() => {
    if (authStatus !== "authed") return;

    let lastFetch = 0;

    function onFocus() {
      if (Date.now() - lastFetch < 2000) return;
      lastFetch = Date.now();
      usePortfolioStore.getState().refresh().catch(() => undefined);
      // Also refresh activities for any loaded sub-projects
      const activitiesState = useActivitiesStore.getState();
      const loadedSubProjectIds = Object.keys(activitiesState.bySubProjectId);
      for (const id of loadedSubProjectIds) {
        activitiesState.load(id).catch(() => undefined);
      }
    }

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [authStatus]);

  return (
    <>
      {children}
      <ToastContainer />
    </>
  );
}
