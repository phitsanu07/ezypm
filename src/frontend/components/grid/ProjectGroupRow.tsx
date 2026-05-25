import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import type { ProjectWithSubs } from "@/types";
import { useGridUIStore } from "@/frontend/store/useGridUIStore";
import { usePortfolioStore } from "@/frontend/store/usePortfolioStore";
import { useToastStore } from "@/frontend/store/useToastStore";
import { isAtRisk } from "@/frontend/lib/atRisk";

interface ProjectGroupRowProps {
  project: ProjectWithSubs;
  readOnly: boolean;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Unknown error";
}

export function ProjectGroupRow({ project, readOnly }: ProjectGroupRowProps) {
  const expanded = useGridUIStore(
    (s) => s.expandedProjects[project.id] !== false,
  );
  const toggleProject = useGridUIStore((s) => s.toggleProject);
  const deleteProject = usePortfolioStore((s) => s.deleteProject);
  const updateProject = usePortfolioStore((s) => s.updateProject);
  const refresh = usePortfolioStore((s) => s.refresh);
  const projects = usePortfolioStore((s) => s.payload?.projects ?? []);
  const pushToast = useToastStore((s) => s.push);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(project.name);
  const [moving, setMoving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const myIndex = projects.findIndex((p) => p.id === project.id);
  const canMoveUp = myIndex > 0;
  const canMoveDown = myIndex >= 0 && myIndex < projects.length - 1;

  useEffect(() => {
    if (editing) {
      setDraft(project.name);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editing, project.name]);

  async function commit() {
    const next = draft.trim();
    setEditing(false);
    if (!next || next === project.name) return;
    try {
      await updateProject(project.id, { name: next });
      pushToast({ tone: "success", message: "เปลี่ยนชื่อแล้ว" });
    } catch (err) {
      pushToast({
        tone: "error",
        message: `เปลี่ยนชื่อไม่สำเร็จ: ${errorMessage(err)}`,
      });
    }
  }

  function onInputKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      void commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditing(false);
    }
  }

  async function moveBy(delta: -1 | 1) {
    setMenuOpen(false);
    if (moving) return;
    const otherIndex = myIndex + delta;
    const other = projects[otherIndex];
    if (!other) return;
    setMoving(true);

    const myPos = project.position;
    const otherPos = other.position;

    // Optimistic: swap positions locally + re-sort so the UI reorders
    // immediately. Network calls then fire in parallel; we only refresh
    // on failure.
    usePortfolioStore.setState((state) => {
      if (!state.payload) return {};
      return {
        payload: {
          ...state.payload,
          projects: state.payload.projects
            .map((p) => {
              if (p.id === project.id) return { ...p, position: otherPos };
              if (p.id === other.id) return { ...p, position: myPos };
              return p;
            })
            .sort((a, b) => a.position - b.position),
        },
      };
    });

    try {
      await Promise.all([
        updateProject(project.id, { position: otherPos }),
        updateProject(other.id, { position: myPos }),
      ]);
      pushToast({
        tone: "success",
        message: delta === -1 ? "ย้ายขึ้นแล้ว" : "ย้ายลงแล้ว",
      });
    } catch (err) {
      pushToast({
        tone: "error",
        message: `ย้ายไม่สำเร็จ: ${errorMessage(err)}`,
      });
      await refresh();
    } finally {
      setMoving(false);
    }
  }

  async function toggleType() {
    const next = project.type === "ad_hoc" ? "year_plan" : "ad_hoc";
    try {
      await updateProject(project.id, { type: next });
    } catch (err) {
      pushToast({
        tone: "error",
        message: `เปลี่ยน type ไม่สำเร็จ: ${errorMessage(err)}`,
      });
    }
  }

  async function handleDelete() {
    setMenuOpen(false);
    if (!confirm(`ลบโปรเจกต์ "${project.name}" และ sub-projects ทั้งหมด?`)) return;
    try {
      await deleteProject(project.id);
      pushToast({ tone: "success", message: "ลบโปรเจกต์แล้ว" });
    } catch (err) {
      pushToast({
        tone: "error",
        message: `ลบไม่สำเร็จ: ${errorMessage(err)}`,
      });
    }
  }

  const subs = project.subProjects;
  const shipped = subs.filter((s) => s.status === "go_live").length;
  const atRisk = subs.filter((s) => isAtRisk(s)).length;
  const avgProgress =
    subs.length > 0
      ? Math.round(subs.reduce((a, s) => a + s.progress, 0) / subs.length)
      : 0;

  return (
    <div
      className="project-group-row"
      onClick={() => !editing && toggleProject(project.id)}
      role="row"
    >
      <div className="pg-cell-left">
        <span
          className={`project-group-chevron${expanded ? " expanded" : ""}`}
          aria-hidden
        >
          ▶
        </span>
        <span
          className="project-group-icon"
          style={{ background: project.color + "33", color: project.color }}
        >
          {project.icon}
        </span>

        {editing ? (
          <input
            ref={inputRef}
            className="project-group-name-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={onInputKey}
            onClick={(e) => e.stopPropagation()}
            aria-label="Project name"
          />
        ) : (
          <>
            <span className="project-group-name">{project.name}</span>
            {project.nameTh && (
              <span style={{ fontSize: "11.5px", color: "var(--ink-3)" }}>
                {project.nameTh}
              </span>
            )}
            {!readOnly && (
              <button
                type="button"
                className="project-group-rename"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditing(true);
                }}
                aria-label="Rename project"
                title="แก้ชื่อโปรเจกต์ / Rename"
              >
                ✎
              </button>
            )}
          </>
        )}
      </div>

      <div className="pg-cell-badge">
        <button
          type="button"
          className={`project-type-badge ${project.type}`}
          disabled={readOnly}
          onClick={(e) => {
            e.stopPropagation();
            if (readOnly) return;
            void toggleType();
          }}
          aria-label={`Project type: ${project.type === "year_plan" ? "Year Plan" : "Ad-hoc"}`}
          title="คลิกเพื่อสลับ Year Plan / Ad-hoc"
        >
          {project.type === "ad_hoc" ? "⚡ Ad-hoc" : "◷ Year Plan"}
        </button>
      </div>

      <div className="pg-cell-stats">
        <span className="project-group-stat">
          <span style={{ fontWeight: 600, color: "var(--ink-2)" }}>
            {subs.length}
          </span>
          <span>rows</span>
        </span>
        <span className="project-group-stat">
          <span style={{ fontWeight: 600, color: "var(--green)" }}>
            {shipped}
          </span>
          <span>shipped</span>
        </span>
        {atRisk > 0 && (
          <span className="project-group-stat">
            <span style={{ fontWeight: 600, color: "var(--red)" }}>
              {atRisk}
            </span>
            <span>at risk</span>
          </span>
        )}
        <span className="project-group-stat">
          <span style={{ fontWeight: 600, color: "var(--accent)" }}>
            {avgProgress}%
          </span>
        </span>
      </div>

      {!readOnly && (
        <div
          className="pg-cell-actions project-group-actions"
          style={{ position: "relative" }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            ref={menuBtnRef}
            className="btn-icon"
            onClick={(e) => {
              e.stopPropagation();
              if (!menuOpen && menuBtnRef.current) {
                const r = menuBtnRef.current.getBoundingClientRect();
                setMenuRect(r);
              }
              setMenuOpen(!menuOpen);
            }}
            aria-label="Project options"
          >
            ···
          </button>
          {menuOpen &&
            menuRect &&
            createPortal(
              <>
                <div
                  onClick={() => setMenuOpen(false)}
                  style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 9998,
                  }}
                />
                <div
                  style={{
                    position: "fixed",
                    top: menuRect.bottom + 4,
                    left: menuRect.right - 180,
                    background: "var(--surface)",
                    border: "1px solid var(--line-2)",
                    borderRadius: "9px",
                    boxShadow: "var(--shadow-md)",
                    zIndex: 9999,
                    padding: "4px",
                    minWidth: "180px",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="popover-item"
                    onClick={() => {
                      setEditing(true);
                      setMenuOpen(false);
                    }}
                  >
                    ✎ Rename project
                  </button>
                  <button
                    className="popover-item"
                    onClick={() => moveBy(-1)}
                    disabled={!canMoveUp || moving}
                  >
                    ▲ Move up
                  </button>
                  <button
                    className="popover-item"
                    onClick={() => moveBy(1)}
                    disabled={!canMoveDown || moving}
                  >
                    ▼ Move down
                  </button>
                  <button
                    className="popover-item"
                    style={{ color: "var(--red)" }}
                    onClick={handleDelete}
                  >
                    Delete project
                  </button>
                </div>
              </>,
              document.body,
            )}
        </div>
      )}
    </div>
  );
}
