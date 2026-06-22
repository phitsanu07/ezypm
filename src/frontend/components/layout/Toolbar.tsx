import { useState } from "react";
import { usePortfolioStore } from "@/frontend/store/usePortfolioStore";
import { useBoardsStore } from "@/frontend/store/useBoardsStore";
import { useAuthStore } from "@/frontend/store/useAuthStore";
import { useGridUIStore } from "@/frontend/store/useGridUIStore";
import { ViewSwitcher } from "@/frontend/components/layout/ViewSwitcher";
import type {
  TagFilter,
  StatusFilter,
} from "@/frontend/lib/projectFilter";

export function Toolbar() {
  const refresh = usePortfolioStore((s) => s.refresh);
  const createProject = usePortfolioStore((s) => s.createProject);
  const activeBoardId = useBoardsStore((s) => s.activeBoardId);
  const profile = useAuthStore((s) => s.profile);
  const view = useGridUIStore((s) => s.view);
  const tagFilter = useGridUIStore((s) => s.tagFilter);
  const statusFilter = useGridUIStore((s) => s.statusFilter);
  const setTagFilter = useGridUIStore((s) => s.setTagFilter);
  const setStatusFilter = useGridUIStore((s) => s.setStatusFilter);
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

      {view === "portfolio" && (
        <div className="toolbar-filters">
          <label className="filter-group">
            <span className="filter-label">Tag</span>
            <select
              className="filter-select"
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value as TagFilter)}
              aria-label="Filter by project tag"
            >
              <option value="all">All tags</option>
              <option value="year_plan">◷ Year Plan</option>
              <option value="ad_hoc">⚡ Ad-hoc</option>
            </select>
          </label>
          <label className="filter-group">
            <span className="filter-label">Status</span>
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as StatusFilter)
              }
              aria-label="Filter by project status"
            >
              <option value="all">All status</option>
              <option value="completed">✓ Completed (100%)</option>
              <option value="on_dev">◐ On Dev</option>
            </select>
          </label>
        </div>
      )}

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
