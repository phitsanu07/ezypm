import { useState, useRef, useEffect, type MouseEvent } from "react";
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

const STEP = 5;

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

  // Intra-stage progress: nudge % within the current status's band without
  // changing the status. We patch BOTH status (unchanged) + progress so the
  // backend keeps the chosen status instead of re-deriving it from progress.
  const { min, max } = statusProgressBand(sub.status);
  const cur = Math.min(max, Math.max(min, sub.progress));
  const canDec = !readOnly && cur > min;
  const canInc = !readOnly && cur < max;

  function nudge(e: MouseEvent, delta: number) {
    e.stopPropagation();
    const next = Math.min(max, Math.max(min, cur + delta));
    if (next === sub.progress) return;
    void patch(sub.id, { status: sub.status, progress: next });
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
          className="status-pct-stepper"
          onClick={(e) => e.stopPropagation()}
          title={`ปรับ % ภายในขั้น ${current?.label ?? ""} (${min}–${max}%)`}
        >
          <button
            type="button"
            className="status-pct-btn"
            onClick={(e) => nudge(e, -STEP)}
            disabled={!canDec}
            aria-label="Decrease progress within stage"
          >
            −
          </button>
          <span className="status-pct-val">{cur}%</span>
          <button
            type="button"
            className="status-pct-btn"
            onClick={(e) => nudge(e, STEP)}
            disabled={!canInc}
            aria-label="Increase progress within stage"
          >
            +
          </button>
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
