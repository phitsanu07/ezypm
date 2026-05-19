import { useRef } from "react";
import { useGridUIStore, DEFAULT_COLUMN_WIDTHS } from "@/frontend/store/useGridUIStore";

interface ColumnDef {
  id: string;
  label: string;
}

const COLUMNS: ColumnDef[] = [
  { id: "name", label: "Sub-project" },
  { id: "lead", label: "Assignee" },
  { id: "team", label: "Team" },
  { id: "status", label: "Status" },
  { id: "priority", label: "Priority" },
  { id: "due", label: "Due" },
  { id: "progress", label: "Progress" },
  { id: "tags", label: "Tags" },
  { id: "quarter", label: "Quarter" },
];

interface GridHeaderProps {
  numWidth: number;
}

export function GridHeader({ numWidth }: GridHeaderProps) {
  const columnWidths = useGridUIStore((s) => s.columnWidths);
  const setColumnWidth = useGridUIStore((s) => s.setColumnWidth);
  const dragging = useRef<{ id: string; startX: number; startWidth: number } | null>(null);

  function onResizerMouseDown(id: string, e: React.MouseEvent) {
    e.preventDefault();
    const startWidth = columnWidths[id] ?? DEFAULT_COLUMN_WIDTHS[id] ?? 120;
    dragging.current = { id, startX: e.clientX, startWidth };

    function onMouseMove(ev: MouseEvent) {
      if (!dragging.current) return;
      const delta = ev.clientX - dragging.current.startX;
      setColumnWidth(dragging.current.id, dragging.current.startWidth + delta);
    }

    function onMouseUp() {
      dragging.current = null;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  return (
    <>
      <div
        className="grid-header-cell"
        style={{ width: numWidth, minWidth: numWidth }}
        role="columnheader"
        aria-label="Row number"
      />
      {COLUMNS.map((col, idx) => {
        const width = columnWidths[col.id] ?? DEFAULT_COLUMN_WIDTHS[col.id] ?? 120;
        return (
          <div
            key={col.id}
            className="grid-header-cell"
            style={{ width, minWidth: width }}
            role="columnheader"
            aria-colindex={idx + 2}
          >
            {col.label}
            <div
              className="col-resizer"
              onMouseDown={(e) => onResizerMouseDown(col.id, e)}
            />
          </div>
        );
      })}
      <div
        className="grid-header-cell"
        style={{ width: 44, minWidth: 44 }}
        role="columnheader"
        aria-label="Actions"
      />
    </>
  );
}
