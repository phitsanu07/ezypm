import {
  useState,
  useRef,
  useEffect,
  type ChangeEvent,
  type PointerEvent,
} from "react";
import type { SubProjectWithRelations } from "@/types";
import { STATUS_OPTIONS, statusProgressBand } from "@/types";
import { usePortfolioStore } from "@/frontend/store/usePortfolioStore";
import { Chip } from "@/frontend/components/ui/Chip";
import { Popover } from "@/frontend/components/cells/Popover";

interface StatusCellProps {
  sub: SubProjectWithRelations;
  isSelected: boolean;
  isEditing: boolean;
  readOnly: boolean;
  onDoneEditing(): void;
}

export function StatusCell({
  sub,
  isEditing,
  readOnly,
  onDoneEditing,
}: StatusCellProps) {
  const patch = usePortfolioStore((s) => s.patchSubProject);
  const cellRef = useRef<HTMLDivElement>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (isEditing) {
      setAnchorRect(cellRef.current?.getBoundingClientRect() ?? null);
    } else {
      setAnchorRect(null);
    }
  }, [isEditing]);

  function close() {
    onDoneEditing();
  }

  function handleSelect(statusId: (typeof STATUS_OPTIONS)[number]["id"]) {
    close();
    void patch(sub.id, { status: statusId });
  }

  const current = STATUS_OPTIONS.find((o) => o.id === sub.status);
  const open = isEditing && anchorRect !== null;

  // Intra-stage progress: slide % within the current status's band without
  // changing the status. We patch BOTH status (unchanged) + progress so the
  // backend keeps the chosen status instead of re-deriving it from progress.
  const { min, max } = statusProgressBand(sub.status);
  const clampedProgress = Math.min(max, Math.max(min, sub.progress));
  const [local, setLocal] = useState(clampedProgress);

  // Keep the slider in sync with server/optimistic state when not dragging.
  useEffect(() => {
    setLocal(clampedProgress);
  }, [clampedProgress]);

  function onSlide(e: ChangeEvent<HTMLInputElement>) {
    setLocal(Number(e.target.value));
  }

  function commitSlide() {
    if (local === sub.progress) return;
    void patch(sub.id, { status: sub.status, progress: local });
  }

  // Stop the cell's click/drag handlers from firing while using the slider.
  function swallow(e: PointerEvent | React.MouseEvent) {
    e.stopPropagation();
  }

  return (
    <div ref={cellRef} className="status-cell-inner">
      {current && (
        <Chip
          label={current.label}
          bg={current.bg}
          fg={current.fg}
          dot={current.dot}
        />
      )}
      {!readOnly && max > min && (
        <span
          className="status-pct-slider"
          onClick={swallow}
          onPointerDown={swallow}
          title={`เลื่อนปรับ % ภายในขั้น ${current?.label ?? ""} (${min}–${max}%)`}
        >
          <input
            type="range"
            min={min}
            max={max}
            step={1}
            value={local}
            onChange={onSlide}
            onPointerUp={commitSlide}
            onMouseUp={commitSlide}
            onTouchEnd={commitSlide}
            onKeyUp={commitSlide}
            aria-label={`Adjust progress within ${current?.label ?? "status"} stage`}
          />
          <span className="status-pct-val">{local}%</span>
        </span>
      )}
      {open && (
        <Popover anchorRect={anchorRect} onClose={close}>
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              className={`popover-item${opt.id === sub.status ? " selected" : ""}`}
              onClick={() => handleSelect(opt.id)}
            >
              <Chip
                label={opt.label}
                bg={opt.bg}
                fg={opt.fg}
                dot={opt.dot}
                size="sm"
              />
              <span className="popover-item-label-th">{opt.labelTh}</span>
            </button>
          ))}
        </Popover>
      )}
    </div>
  );
}
