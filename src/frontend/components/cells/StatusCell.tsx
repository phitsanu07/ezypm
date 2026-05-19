import { useState, useRef, useEffect } from "react";
import type { SubProjectWithRelations } from "@/types";
import { STATUS_OPTIONS } from "@/types";
import { usePortfolioStore } from "@/frontend/store/usePortfolioStore";
import { Chip } from "@/frontend/components/ui/Chip";
import { Popover } from "@/frontend/components/cells/Popover";

interface StatusCellProps {
  sub: SubProjectWithRelations;
  isSelected: boolean;
  isEditing: boolean;
  onDoneEditing(): void;
}

export function StatusCell({ sub, isEditing, onDoneEditing }: StatusCellProps) {
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

  return (
    <div ref={cellRef} style={{ width: "100%" }}>
      {current && (
        <Chip
          label={current.label}
          bg={current.bg}
          fg={current.fg}
          dot={current.dot}
        />
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
