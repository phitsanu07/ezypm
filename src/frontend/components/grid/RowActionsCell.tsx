import { useState } from "react";
import { usePortfolioStore } from "@/frontend/store/usePortfolioStore";
import { useToastStore } from "@/frontend/store/useToastStore";

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

export function RowActionsCell({
  subProjectId,
  rowNumber,
  readOnly,
}: RowActionsCellProps) {
  const deleteSubProject = usePortfolioStore((s) => s.deleteSubProject);
  const pushToast = useToastStore((s) => s.push);
  const [menuOpen, setMenuOpen] = useState(false);

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
              style={{ color: "var(--red)" }}
              onClick={handleDelete}
              role="menuitem"
            >
              ลบแถว / Delete row
            </button>
          </div>
        </>
      )}
    </div>
  );
}
