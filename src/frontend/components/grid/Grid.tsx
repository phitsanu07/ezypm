import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import type { PortfolioPayload, Profile } from "@/types";
import {
  useGridUIStore,
  DEFAULT_COLUMN_WIDTHS,
  HIDDEN_COLUMNS,
} from "@/frontend/store/useGridUIStore";
import { usePortfolioStore } from "@/frontend/store/usePortfolioStore";
import { GridHeader } from "@/frontend/components/grid/GridHeader";
import { ProjectGroupRow } from "@/frontend/components/grid/ProjectGroupRow";
import { SubProjectRow } from "@/frontend/components/grid/SubProjectRow";
import { AddRow } from "@/frontend/components/grid/AddRow";
import { useGridKeyboardNav } from "@/frontend/components/grid/useGridKeyboardNav";
import { filterProjects } from "@/frontend/lib/projectFilter";

interface GridProps {
  payload: PortfolioPayload;
  readOnly: boolean;
}

const ALL_COLUMN_IDS = ["name", "lead", "team", "status", "priority", "due", "progress", "tags", "quarter"];
const COLUMN_IDS = ALL_COLUMN_IDS.filter((id) => !HIDDEN_COLUMNS.has(id));

export function Grid({ payload, readOnly }: GridProps) {
  const selectedCell = useGridUIStore((s) => s.selectedCell);
  const selectCell = useGridUIStore((s) => s.selectCell);
  const expandedProjects = useGridUIStore((s) => s.expandedProjects);
  const columnWidths = useGridUIStore((s) => s.columnWidths);
  const tagFilter = useGridUIStore((s) => s.tagFilter);
  const statusFilter = useGridUIStore((s) => s.statusFilter);

  const [editingCell, setEditingCell] = useState<{
    subProjectId: string;
    columnId: string;
  } | null>(null);

  const onActivateEditor = useCallback(
    (subProjectId: string, columnId: string) => {
      setEditingCell({ subProjectId, columnId });
    },
    []
  );

  const onDoneEditing = useCallback(() => {
    setEditingCell(null);
  }, []);

  const { handleKeyDown } = useGridKeyboardNav({
    payload,
    editingCell,
    onActivateEditor,
    onClearEditor: onDoneEditing,
  });

  const reorderSubProject = usePortfolioStore((s) => s.reorderSubProject);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const sourceProject = payload.projects.find((p) =>
      p.subProjects.some((s) => s.id === active.id),
    );
    const targetProject = payload.projects.find((p) =>
      p.subProjects.some((s) => s.id === over.id),
    );
    if (!sourceProject || !targetProject) return;
    if (sourceProject.id !== targetProject.id) return;

    const subs = targetProject.subProjects;
    const oldIndex = subs.findIndex((s) => s.id === active.id);
    const newIndex = subs.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(subs, oldIndex, newIndex);
    const before = reordered[newIndex - 1];
    const after = reordered[newIndex + 1];

    let targetPos: number;
    if (before && after) {
      targetPos = Math.floor((before.position + after.position) / 2);
    } else if (before) {
      targetPos = before.position + 100;
    } else if (after) {
      targetPos = Math.max(1, after.position - 100);
    } else {
      targetPos = 100;
    }

    void reorderSubProject(String(active.id), targetProject.id, targetPos);
  }

  function handleCellClick(subProjectId: string, columnId: string) {
    if (
      selectedCell?.subProjectId === subProjectId &&
      selectedCell.columnId === columnId
    ) {
      onActivateEditor(subProjectId, columnId);
    } else {
      selectCell({ subProjectId, columnId });
      setEditingCell(null);
    }
  }

  function handleCellDoubleClick(subProjectId: string, columnId: string) {
    selectCell({ subProjectId, columnId });
    onActivateEditor(subProjectId, columnId);
  }

  const numWidth = columnWidths["num"] ?? DEFAULT_COLUMN_WIDTHS["num"] ?? 40;

  const gridTemplateColumns = [
    `${numWidth}px`,
    ...COLUMN_IDS.map(
      (k) => `${columnWidths[k] ?? DEFAULT_COLUMN_WIDTHS[k] ?? 120}px`
    ),
    "44px",
  ].join(" ");

  const members: Profile[] = payload.members;

  const visibleProjects = filterProjects(
    payload.projects,
    tagFilter,
    statusFilter,
  );
  const filtersActive = tagFilter !== "all" || statusFilter !== "all";

  let rowNumber = 0;
  let rowIndex = 2;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div
        className="grid-wrapper"
        role="grid"
        aria-label="Portfolio grid"
        onKeyDown={handleKeyDown}
        tabIndex={0}
        style={{ outline: "none" }}
      >
        <div className="grid" style={{ gridTemplateColumns }}>
          <div role="row" aria-rowindex={1} style={{ display: "contents" }}>
            <GridHeader numWidth={numWidth} />
          </div>

          {visibleProjects.map((project) => {
            const expanded = expandedProjects[project.id] !== false;
            const projectRowIndex = rowIndex++;

            const rows = [];

            rows.push(
              <div
                key={`group-${project.id}`}
                style={{ gridColumn: "1 / -1" }}
                role="row"
                aria-rowindex={projectRowIndex}
              >
                <ProjectGroupRow project={project} readOnly={readOnly} />
              </div>,
            );

            if (expanded) {
              const subIds = project.subProjects.map((s) => s.id);
              const sortableRows: React.ReactNode[] = [];
              for (const sub of project.subProjects) {
                rowNumber++;
                const currentRowIndex = rowIndex++;

                sortableRows.push(
                  <SubProjectRow
                    key={sub.id}
                    sub={sub}
                    rowNumber={rowNumber}
                    members={members}
                    readOnly={readOnly}
                    editingCell={editingCell}
                    onCellClick={handleCellClick}
                    onCellDoubleClick={handleCellDoubleClick}
                    onActivateEditor={onActivateEditor}
                    onDoneEditing={onDoneEditing}
                    rowIndex={currentRowIndex}
                  />,
                );
              }

              rows.push(
                <SortableContext
                  key={`sortable-${project.id}`}
                  items={subIds}
                  strategy={verticalListSortingStrategy}
                >
                  {sortableRows}
                </SortableContext>,
              );

              if (!readOnly) {
                rows.push(
                  <div
                    key={`add-${project.id}`}
                    style={{ gridColumn: "1 / -1" }}
                  >
                    <AddRow
                      projectId={project.id}
                      boardId={payload.board.id}
                    />
                  </div>,
                );
              }
            }

            return rows;
          })}
        </div>

        {visibleProjects.length === 0 && filtersActive && (
          <div className="grid-no-match">
            ไม่มีโปรเจกต์ที่ตรงกับ filter ที่เลือก
            <span>No projects match the selected filters.</span>
          </div>
        )}
      </div>
    </DndContext>
  );
}
