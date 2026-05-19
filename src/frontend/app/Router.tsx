import { useState, useEffect } from "react";
import { useAuthStore } from "@/frontend/store/useAuthStore";
import { useBoardsStore } from "@/frontend/store/useBoardsStore";
import { LoginPage } from "@/frontend/pages/LoginPage";
import { PortfolioPage } from "@/frontend/pages/PortfolioPage";
import { AdminPage } from "@/frontend/pages/AdminPage";
import { NoBoardAccessPage } from "@/frontend/pages/NoBoardAccessPage";
import { Spinner } from "@/frontend/components/ui/Spinner";

interface ParsedRoute {
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
}

function parseHash(hash: string): ParsedRoute {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const [pathPart = "/", queryPart = ""] = raw.split("?");
  const query: Record<string, string> = {};
  if (queryPart) {
    for (const [k, v] of new URLSearchParams(queryPart)) {
      query[k] = v;
    }
  }

  const segments = pathPart.split("/").filter(Boolean);
  const params: Record<string, string> = {};

  if (segments[0] === "board" && segments[1]) {
    params["id"] = segments[1];
    return { path: "/board/:id", params, query };
  }

  if (segments[0] === "admin") {
    return { path: "/admin", params, query };
  }

  if (segments[0] === "login") {
    return { path: "/login", params, query };
  }

  if (segments[0] === "no-access") {
    return { path: "/no-access", params, query };
  }

  return { path: "/", params, query };
}

export function Router() {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  const authStatus = useAuthStore((s) => s.status);
  const profile = useAuthStore((s) => s.profile);
  const boards = useBoardsStore((s) => s.boards);

  useEffect(() => {
    function onHashChange() {
      setRoute(parseHash(window.location.hash));
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (authStatus === "idle" || authStatus === "bootstrapping") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "var(--bg)",
        }}
      >
        <Spinner size={36} />
      </div>
    );
  }

  if (authStatus === "guest" || authStatus === "error") {
    return <LoginPage />;
  }

  if (route.path === "/login") {
    window.location.hash = "/";
    return null;
  }

  if (route.path === "/admin") {
    if (profile?.role !== "admin") {
      window.location.hash = "/";
      return null;
    }
    const tab = (route.query["tab"] ?? "users") as "users" | "boards";
    return <AdminPage tab={tab} />;
  }

  if (route.path === "/no-access") {
    return <NoBoardAccessPage />;
  }

  if (boards.length === 0) {
    return <NoBoardAccessPage />;
  }

  if (route.path === "/board/:id") {
    return <PortfolioPage boardId={route.params["id"]} />;
  }

  return <PortfolioPage />;
}
