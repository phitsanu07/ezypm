import { AppBar } from "@/frontend/components/layout/AppBar";
import { UsersPanel } from "@/frontend/components/admin/UsersPanel";
import { BoardsPanel } from "@/frontend/components/admin/BoardsPanel";

type TabId = "users" | "boards";

interface AdminPageProps {
  tab?: TabId;
}

export function AdminPage({ tab = "users" }: AdminPageProps) {
  function switchTab(t: TabId) {
    window.location.hash = `/admin?tab=${t}`;
  }

  return (
    <div className="admin-page">
      <AppBar showAdminBadge />

      <nav className="admin-tabs" role="tablist" aria-label="Admin tabs">
        <button
          className={`admin-tab-btn${tab === "users" ? " active" : ""}`}
          role="tab"
          aria-selected={tab === "users"}
          onClick={() => switchTab("users")}
        >
          Users
        </button>
        <button
          className={`admin-tab-btn${tab === "boards" ? " active" : ""}`}
          role="tab"
          aria-selected={tab === "boards"}
          onClick={() => switchTab("boards")}
        >
          Boards
        </button>
      </nav>

      <div className="admin-content" role="tabpanel">
        {tab === "users" && <UsersPanel />}
        {tab === "boards" && <BoardsPanel />}
      </div>
    </div>
  );
}
