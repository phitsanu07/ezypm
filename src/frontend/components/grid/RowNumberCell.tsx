import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";

interface RowNumberCellProps {
  number: number;
  subProjectId: string;
  projectId: string;
  width: number;
  readOnly?: boolean;
  dragListeners?: SyntheticListenerMap;
}

export function RowNumberCell({
  number,
  subProjectId,
  projectId: _projectId,
  width,
  readOnly,
  dragListeners,
}: RowNumberCellProps) {
  return (
    <div
      className="cell cell-num"
      style={{ width, minWidth: width, paddingRight: 0 }}
      data-row={subProjectId}
      role="gridcell"
    >
      {!readOnly && (
        <button
          type="button"
          className="drag-handle-btn"
          aria-label={`Drag row ${number}`}
          {...(dragListeners ?? {})}
        >
          <span aria-hidden>⠿</span>
        </button>
      )}
      <span className="row-number-text">{number}</span>
    </div>
  );
}
