import { useState, useRef, useEffect } from "react";
import type { SubProjectWithRelations } from "@/types";
import { usePortfolioStore } from "@/frontend/store/usePortfolioStore";
import { formatDateOnly } from "@/frontend/lib/dates";

interface DateCellProps {
  sub: SubProjectWithRelations;
  isSelected: boolean;
  isEditing: boolean;
  onDoneEditing(): void;
}

export function DateCell({ sub, isEditing, onDoneEditing }: DateCellProps) {
  const patch = usePortfolioStore((s) => s.patchSubProject);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      setEditing(true);
      setTimeout(() => {
        const el = inputRef.current as (HTMLInputElement & { showPicker?(): void }) | null;
        el?.showPicker?.();
      }, 50);
    } else {
      setEditing(false);
    }
  }, [isEditing]);

  function commit(value: string) {
    const newDue = value || null;
    if (newDue !== sub.due) {
      patch(sub.id, { due: newDue }).catch(() => undefined);
    }
    setEditing(false);
    onDoneEditing();
  }

  if (editing) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "4px", width: "100%" }}>
        <input
          ref={inputRef}
          type="date"
          defaultValue={sub.due ?? ""}
          autoFocus
          className="date-cell-input"
          onChange={(e) => commit(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") { setEditing(false); onDoneEditing(); }
            if (e.key === "Enter") commit((e.target as HTMLInputElement).value);
          }}
        />
        {sub.due && (
          <button
            onClick={() => commit("")}
            style={{
              background: "transparent",
              border: 0,
              cursor: "pointer",
              color: "var(--ink-3)",
              fontSize: "11px",
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        )}
      </div>
    );
  }

  return (
    <span
      style={{
        color: sub.due ? "var(--ink)" : "var(--ink-3)",
        fontSize: "13px",
      }}
    >
      {formatDateOnly(sub.due)}
    </span>
  );
}
