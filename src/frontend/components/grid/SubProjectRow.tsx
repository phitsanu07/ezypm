import { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useShallow } from "zustand/react/shallow";
import type { SubProjectWithRelations, Profile } from "@/types";
import { useGridUIStore, DEFAULT_COLUMN_WIDTHS } from "@/frontend/store/useGridUIStore";
import { CellShell } from "@/frontend/components/cells/CellShell";
import { NameCell } from "@/frontend/components/cells/NameCell";
import { AssigneeCell } from "@/frontend/components/cells/AssigneeCell";
import { TeamCell } from "@/frontend/components/cells/TeamCell";
import { StatusCell } from "@/frontend/components/cells/StatusCell";
import { PriorityCell } from "@/frontend/components/cells/PriorityCell";
import { DateCell } from "@/frontend/components/cells/DateCell";
import { ProgressCell } from "@/frontend/components/cells/ProgressCell";
import { TagsCell } from "@/frontend/components/cells/TagsCell";
import { TextCell } from "@/frontend/components/cells/TextCell";
import { RowNumberCell } from "@/frontend/components/grid/RowNumberCell";
import { RowActionsCell } from "@/frontend/components/grid/RowActionsCell";

interface SubProjectRowProps {
  sub: SubProjectWithRelations;
  rowNumber: number;
  members: Profile[];
  readOnly: boolean;
  editingCell: { subProjectId: string; columnId: string } | null;
  onCellClick(subProjectId: string, columnId: string): void;
  onCellDoubleClick(subProjectId: string, columnId: string): void;
  onActivateEditor(subProjectId: string, columnId: string): void;
  onDoneEditing(): void;
  rowIndex: number;
}

function SubProjectRowImpl({
  sub,
  rowNumber,
  members,
  readOnly,
  editingCell,
  onCellClick,
  onCellDoubleClick,
  onActivateEditor,
  onDoneEditing,
  rowIndex,
}: SubProjectRowProps) {
  // Subscribe only to THIS row's selected column id (string | null). Selector
  // returns a primitive so unrelated row selections don't re-render this row.
  const selectedColForThisRow = useGridUIStore((s) =>
    s.selectedCell?.subProjectId === sub.id ? s.selectedCell.columnId : null,
  );

  // Shallow compare so unrelated column-width updates don't trigger re-render.
  const columnWidths = useGridUIStore(useShallow((s) => s.columnWidths));

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sub.id, disabled: readOnly });

  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const numWidth = columnWidths["num"] ?? DEFAULT_COLUMN_WIDTHS["num"] ?? 40;

  function isSelected(colId: string) {
    return selectedColForThisRow === colId;
  }

  function isEditing(colId: string) {
    return (
      editingCell?.subProjectId === sub.id && editingCell.columnId === colId
    );
  }

  function cellWidth(colId: string) {
    return columnWidths[colId] ?? DEFAULT_COLUMN_WIDTHS[colId] ?? 120;
  }

  return (
    <div
      ref={setNodeRef}
      className="row"
      aria-rowindex={rowIndex}
      style={sortableStyle}
      {...attributes}
    >
      <RowNumberCell
        number={rowNumber}
        subProjectId={sub.id}
        projectId={sub.projectId}
        width={numWidth}
        readOnly={readOnly}
        dragListeners={listeners}
      />

      <CellShell
        columnId="name"
        subProjectId={sub.id}
        isSelected={isSelected("name")}
        isEditing={isEditing("name")}
        readOnly={readOnly}
        style={{ width: cellWidth("name"), minWidth: cellWidth("name") }}
        onClick={() => onCellClick(sub.id, "name")}
        onDoubleClick={() => onCellDoubleClick(sub.id, "name")}
        ariaColIndex={2}
      >
        <NameCell
          sub={sub}
          isSelected={isSelected("name")}
          isEditing={isEditing("name")}
          onDoneEditing={onDoneEditing}
        />
      </CellShell>

      <CellShell
        columnId="lead"
        subProjectId={sub.id}
        isSelected={isSelected("lead")}
        isEditing={isEditing("lead")}
        readOnly={readOnly}
        style={{ width: cellWidth("lead"), minWidth: cellWidth("lead") }}
        onClick={() => onCellClick(sub.id, "lead")}
        onDoubleClick={() => onCellDoubleClick(sub.id, "lead")}
        ariaColIndex={3}
      >
        <AssigneeCell
          sub={sub}
          members={members}
          isSelected={isSelected("lead")}
          isEditing={isEditing("lead")}
          onDoneEditing={onDoneEditing}
        />
      </CellShell>

      <CellShell
        columnId="team"
        subProjectId={sub.id}
        isSelected={isSelected("team")}
        isEditing={isEditing("team")}
        readOnly={readOnly}
        style={{ width: cellWidth("team"), minWidth: cellWidth("team") }}
        onClick={() => onCellClick(sub.id, "team")}
        onDoubleClick={() => onCellDoubleClick(sub.id, "team")}
        ariaColIndex={4}
      >
        <TeamCell
          sub={sub}
          members={members}
          isSelected={isSelected("team")}
          isEditing={isEditing("team")}
          onDoneEditing={onDoneEditing}
        />
      </CellShell>

      <CellShell
        columnId="status"
        subProjectId={sub.id}
        isSelected={isSelected("status")}
        isEditing={isEditing("status")}
        readOnly={readOnly}
        style={{ width: cellWidth("status"), minWidth: cellWidth("status") }}
        onClick={() =>
          isSelected("status")
            ? onActivateEditor(sub.id, "status")
            : onCellClick(sub.id, "status")
        }
        onDoubleClick={() => onCellDoubleClick(sub.id, "status")}
        ariaColIndex={5}
      >
        <StatusCell
          sub={sub}
          isSelected={isSelected("status")}
          isEditing={isEditing("status")}
          onDoneEditing={onDoneEditing}
        />
      </CellShell>

      <CellShell
        columnId="priority"
        subProjectId={sub.id}
        isSelected={isSelected("priority")}
        isEditing={isEditing("priority")}
        readOnly={readOnly}
        style={{ width: cellWidth("priority"), minWidth: cellWidth("priority") }}
        onClick={() =>
          isSelected("priority")
            ? onActivateEditor(sub.id, "priority")
            : onCellClick(sub.id, "priority")
        }
        onDoubleClick={() => onCellDoubleClick(sub.id, "priority")}
        ariaColIndex={6}
      >
        <PriorityCell
          sub={sub}
          isSelected={isSelected("priority")}
          isEditing={isEditing("priority")}
          onDoneEditing={onDoneEditing}
        />
      </CellShell>

      <CellShell
        columnId="due"
        subProjectId={sub.id}
        isSelected={isSelected("due")}
        isEditing={isEditing("due")}
        readOnly={readOnly}
        style={{ width: cellWidth("due"), minWidth: cellWidth("due") }}
        onClick={() => onCellClick(sub.id, "due")}
        onDoubleClick={() => onCellDoubleClick(sub.id, "due")}
        ariaColIndex={7}
      >
        <DateCell
          sub={sub}
          isSelected={isSelected("due")}
          isEditing={isEditing("due")}
          onDoneEditing={onDoneEditing}
        />
      </CellShell>

      <CellShell
        columnId="progress"
        subProjectId={sub.id}
        isSelected={isSelected("progress")}
        isEditing={isEditing("progress")}
        readOnly={readOnly}
        style={{ width: cellWidth("progress"), minWidth: cellWidth("progress") }}
        onClick={() => onCellClick(sub.id, "progress")}
        onDoubleClick={() => onCellDoubleClick(sub.id, "progress")}
        ariaColIndex={8}
      >
        <ProgressCell
          sub={sub}
          isSelected={isSelected("progress")}
          isEditing={isEditing("progress")}
          onDoneEditing={onDoneEditing}
        />
      </CellShell>

      <CellShell
        columnId="tags"
        subProjectId={sub.id}
        isSelected={isSelected("tags")}
        isEditing={isEditing("tags")}
        readOnly={readOnly}
        style={{ width: cellWidth("tags"), minWidth: cellWidth("tags") }}
        onClick={() =>
          isSelected("tags")
            ? onActivateEditor(sub.id, "tags")
            : onCellClick(sub.id, "tags")
        }
        onDoubleClick={() => onCellDoubleClick(sub.id, "tags")}
        ariaColIndex={9}
      >
        <TagsCell
          sub={sub}
          isSelected={isSelected("tags")}
          isEditing={isEditing("tags")}
          onDoneEditing={onDoneEditing}
        />
      </CellShell>

      <CellShell
        columnId="quarter"
        subProjectId={sub.id}
        isSelected={isSelected("quarter")}
        isEditing={isEditing("quarter")}
        readOnly={readOnly}
        style={{ width: cellWidth("quarter"), minWidth: cellWidth("quarter") }}
        onClick={() => onCellClick(sub.id, "quarter")}
        onDoubleClick={() => onCellDoubleClick(sub.id, "quarter")}
        ariaColIndex={10}
      >
        <TextCell
          sub={sub}
          field="quarter"
          isSelected={isSelected("quarter")}
          isEditing={isEditing("quarter")}
          onDoneEditing={onDoneEditing}
        />
      </CellShell>

      <RowActionsCell
        subProjectId={sub.id}
        rowNumber={rowNumber}
        readOnly={readOnly}
      />
    </div>
  );
}

// memoized — skip re-render if props are referentially equal. Combined with
// the row-scoped selectedColForThisRow selector, unrelated cell selections in
// other rows no longer trigger this row to re-render.
export const SubProjectRow = memo(SubProjectRowImpl);
