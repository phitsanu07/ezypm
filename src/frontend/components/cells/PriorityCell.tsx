import { useState, useRef, useEffect } from "react";
import type { SubProjectWithRelations } from "@/types";
import { PRIORITY_OPTIONS } from "@/types";
import { usePortfolioStore } from "@/frontend/store/usePortfolioStore";
import { Chip } from "@/frontend/components/ui/Chip";
import { Popover } from "@/frontend/components/cells/Popover";

interface PriorityCellProps {
  sub: SubProjectWithRelations;
  isSelected: boolean;
  isEditing: boolean;
  onDoneEditing(): void;
}

export function PriorityCell({
  sub,
  isEditing,
  onDoneEditing,
}: PriorityCellProps) {
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

  function handleSelect(priorityId: (typeof PRIORITY_OPTIONS)[number]["id"]) {
    close();
    void patch(sub.id, { priority: priorityId });
  }

  const current = PRIORITY_OPTIONS.find((o) => o.id === sub.priority);
  const open = isEditing && anchorRect !== null;

  return (
    <div ref={cellRef} style={{ width: "100%" }}>
      {current && <Chip label={current.short} bg={current.bg} fg={current.fg} />}
      {open && (
        <Popover anchorRect={anchorRect} onClose={close}>
          {PRIORITY_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              className={`popover-item${opt.id === sub.priority ? " selected" : ""}`}
              onClick={() => handleSelect(opt.id)}
            >
              <Chip label={opt.label} bg={opt.bg} fg={opt.fg} size="sm" />
            </button>
          ))}
        </Popover>
      )}
    </div>
  );
}
