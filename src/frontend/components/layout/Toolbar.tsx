import { useState } from "react";
import { usePortfolioStore } from "@/frontend/store/usePortfolioStore";
import { useBoardsStore } from "@/frontend/store/useBoardsStore";
import { useAuthStore } from "@/frontend/store/useAuthStore";
import { ViewSwitcher } from "@/frontend/components/layout/ViewSwitcher";

export function Toolbar() {
  const refresh = usePortfolioStore((s) => s.refresh);
  const createProject = usePortfolioStore((s) => s.createProject);
  const activeBoardId = useBoardsStore((s) => s.activeBoardId);
  const profile = useAuthStore((s) => s.profile);
  const [spinning, setSpinning] = useState(false);
  const [creating, setCreating] = useState(false);

  const canEdit = profile?.role !== "viewer";

  async function handleRefresh() {
    if (spinning) return;
    setSpinning(true);
    try {
      await refresh();
    } finally {
      setSpinning(false);
    }
  }

  async function handleCreateProject() {
    if (!activeBoardId || creating) return;
    const name = window.prompt(
      "ชื่อโปรเจกต์ใหม่ / New project name",
      "New Project",
    );
    if (!name?.trim()) return;
    setCreating(true);
    try {
      await createProject({ boardId: activeBoardId, name: name.trim() });
    } catch {
      // store surfaces a toast on failure
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="toolbar" role="toolbar" aria-label="Grid toolbar">
      <ViewSwitcher />
      <div className="toolbar-spacer" />
      <button
        className={`refresh-btn${spinning ? " spinning" : ""}`}
        onClick={handleRefresh}
        aria-label="Refresh data"
        title="Refresh — data may be stale if the page was inactive. ↻"
      >
        <span>↻</span>
        Refresh
      </button>
      {canEdit && (
        <button
          className="btn btn-primary toolbar-cta"
          onClick={handleCreateProject}
          disabled={!activeBoardId || creating}
          aria-label="Create new project"
          title="Create new project"
        >
          <span aria-hidden>+</span>
          <span>New Project</span>
          <span className="toolbar-cta-th">โปรเจกต์ใหม่</span>
        </button>
      )}
    </div>
  );
}
