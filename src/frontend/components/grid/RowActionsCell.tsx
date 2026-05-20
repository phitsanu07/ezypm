import { useState } from "react";
import { usePortfolioStore } from "@/frontend/store/usePortfolioStore";
import { useToastStore } from "@/frontend/store/useToastStore";
import { ActivityModal } from "@/frontend/components/calendar/ActivityModal";

interface RowActionsCellProps {
  subProjectId: string;
  rowNumber: number;
  readOnly?: boolean;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Unknown error";
}

function defaultOccursAtForToday(): string {
  // Today at 09:00 — gives the picker a sane initial value the user can edit.
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T09:00`;
}

export function RowActionsCell({
  subProjectId,
  rowNumber,
  readOnly,
}: RowActionsCellProps) {
  const deleteSubProject = usePortfolioStore((s) => s.deleteSubProject);
  const projects = usePortfolioStore((s) => s.payload?.projects ?? []);
  const pushToast = useToastStore((s) => s.push);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);

  if (readOnly) return <div className="cell cell-actions" role="gridcell" />;

  async function handleDelete() {
    setMenuOpen(false);
    if (!confirm(`ลบ sub-project แถวที่ ${rowNumber}?`)) return;
    try {
      await deleteSubProject(subProjectId);
      pushToast({ tone: "success", message: "ลบแถวแล้ว" });
    } catch (err) {
      pushToast({
        tone: "error",
        message: `ลบไม่สำเร็จ: ${errorMessage(err)}`,
      });
    }
  }

  function handleAddActivity() {
    setMenuOpen(false);
    setActivityModalOpen(true);
  }

  const allSubs = projects.flatMap((p) => p.subProjects);

  return (
    <div className="cell cell-actions" role="gridcell">
      <button
        type="button"
        className="row-menu-btn"
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((v) => !v);
        }}
        aria-label={`Row ${rowNumber} actions`}
        title="Row actions"
      >
        ···
      </button>
      {menuOpen && (
        <>
          <div
            className="row-menu-backdrop"
            onClick={() => setMenuOpen(false)}
          />
          <div className="row-menu-popover" role="menu">
            <button
              className="popover-item"
              onClick={handleAddActivity}
              role="menuitem"
            >
              + เพิ่ม activity / Add activity
            </button>
            <button
              className="popover-item"
              style={{ color: "var(--red)" }}
              onClick={handleDelete}
              role="menuitem"
            >
              ลบแถว / Delete row
            </button>
          </div>
        </>
      )}

      {activityModalOpen && (
        <ActivityModal
          subProjects={allSubs}
          projects={projects}
          lockedSubProjectId={subProjectId}
          defaultOccursAt={defaultOccursAtForToday()}
          onClose={() => setActivityModalOpen(false)}
        />
      )}
    </div>
  );
}
