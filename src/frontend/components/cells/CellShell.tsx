import type { ReactNode, KeyboardEvent, CSSProperties } from "react";

interface CellShellProps {
  columnId: string;
  subProjectId: string;
  isSelected: boolean;
  isEditing: boolean;
  readOnly?: boolean;
  style?: CSSProperties;
  onClick(): void;
  onDoubleClick?(): void;
  onKeyDown?(e: KeyboardEvent<HTMLDivElement>): void;
  role?: string;
  ariaColIndex?: number;
  children: ReactNode;
}

export function CellShell({
  columnId,
  subProjectId,
  isSelected,
  isEditing,
  readOnly,
  style,
  onClick,
  onDoubleClick,
  onKeyDown,
  role = "gridcell",
  ariaColIndex,
  children,
}: CellShellProps) {
  const className = [
    "cell",
    isSelected ? "selected" : "",
    isEditing ? "editing" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      data-col={columnId}
      data-row={subProjectId}
      role={role}
      aria-colindex={ariaColIndex}
      tabIndex={isSelected ? 0 : -1}
      style={style}
      onClick={readOnly ? undefined : onClick}
      onDoubleClick={readOnly ? undefined : onDoubleClick}
      onKeyDown={onKeyDown}
    >
      {children}
    </div>
  );
}
