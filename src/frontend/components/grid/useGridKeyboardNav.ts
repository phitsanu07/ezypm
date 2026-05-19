import { useCallback } from "react";
import { useGridUIStore } from "@/frontend/store/useGridUIStore";
import type { PortfolioPayload } from "@/types";

const COLUMNS = [
  "name",
  "lead",
  "team",
  "status",
  "priority",
  "due",
  "progress",
  "tags",
  "quarter",
] as const;

type ColumnId = (typeof COLUMNS)[number];

interface UseGridKeyboardNavParams {
  payload: PortfolioPayload;
  editingCell: { subProjectId: string; columnId: string } | null;
  onActivateEditor(subProjectId: string, columnId: string): void;
  onClearEditor(): void;
}

function getVisibleRowIds(
  payload: PortfolioPayload,
  expandedProjects: Record<string, boolean>
): string[] {
  const ids: string[] = [];
  for (const project of payload.projects) {
    const expanded = expandedProjects[project.id] !== false;
    if (expanded) {
      for (const sp of project.subProjects) {
        ids.push(sp.id);
      }
    }
  }
  return ids;
}

export function useGridKeyboardNav({
  payload,
  editingCell,
  onActivateEditor,
  onClearEditor,
}: UseGridKeyboardNavParams) {
  const selectedCell = useGridUIStore((s) => s.selectedCell);
  const expandedProjects = useGridUIStore((s) => s.expandedProjects);
  const selectCell = useGridUIStore((s) => s.selectCell);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (editingCell) return;

      const rowIds = getVisibleRowIds(payload, expandedProjects);
      if (rowIds.length === 0) return;

      const currentRow = selectedCell?.subProjectId ?? rowIds[0]!;
      const currentCol = (selectedCell?.columnId ?? COLUMNS[0]) as ColumnId;
      const rowIdx = rowIds.indexOf(currentRow);
      const colIdx = COLUMNS.indexOf(currentCol);

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          const nextRow = rowIds[Math.min(rowIdx + 1, rowIds.length - 1)];
          if (nextRow) selectCell({ subProjectId: nextRow, columnId: currentCol });
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          const prevRow = rowIds[Math.max(rowIdx - 1, 0)];
          if (prevRow) selectCell({ subProjectId: prevRow, columnId: currentCol });
          break;
        }
        case "ArrowRight": {
          e.preventDefault();
          const nextColIdx = Math.min(colIdx + 1, COLUMNS.length - 1);
          const nextCol = COLUMNS[nextColIdx];
          if (nextCol) selectCell({ subProjectId: currentRow, columnId: nextCol });
          break;
        }
        case "ArrowLeft": {
          e.preventDefault();
          const prevColIdx = Math.max(colIdx - 1, 0);
          const prevCol = COLUMNS[prevColIdx];
          if (prevCol) selectCell({ subProjectId: currentRow, columnId: prevCol });
          break;
        }
        case "Tab": {
          e.preventDefault();
          if (e.shiftKey) {
            if (colIdx === 0) {
              const prevRow = rowIds[Math.max(rowIdx - 1, 0)];
              if (prevRow) selectCell({ subProjectId: prevRow, columnId: COLUMNS[COLUMNS.length - 1]! });
            } else {
              const prevCol = COLUMNS[colIdx - 1];
              if (prevCol) selectCell({ subProjectId: currentRow, columnId: prevCol });
            }
          } else {
            if (colIdx === COLUMNS.length - 1) {
              const nextRow = rowIds[Math.min(rowIdx + 1, rowIds.length - 1)];
              if (nextRow) selectCell({ subProjectId: nextRow, columnId: COLUMNS[0]! });
            } else {
              const nextCol = COLUMNS[colIdx + 1];
              if (nextCol) selectCell({ subProjectId: currentRow, columnId: nextCol });
            }
          }
          break;
        }
        case "Enter":
        case "F2": {
          e.preventDefault();
          if (selectedCell) {
            onActivateEditor(selectedCell.subProjectId, selectedCell.columnId);
          }
          break;
        }
        case " ": {
          e.preventDefault();
          if (selectedCell) {
            onActivateEditor(selectedCell.subProjectId, selectedCell.columnId);
          }
          break;
        }
        case "Escape": {
          e.preventDefault();
          onClearEditor();
          selectCell(null);
          break;
        }
        case "Delete":
        case "Backspace": {
          // Clear nullable cell values when no editor is active
          break;
        }
        default:
          break;
      }
    },
    [editingCell, payload, expandedProjects, selectedCell, selectCell, onActivateEditor, onClearEditor]
  );

  return { handleKeyDown };
}
