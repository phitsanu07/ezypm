import { useState, useRef, useEffect } from "react";
import type { SubProjectWithRelations, UpdateSubProjectInput } from "@/types";
import { usePortfolioStore } from "@/frontend/store/usePortfolioStore";

type TextField = keyof Pick<UpdateSubProjectInput, "quarter">;

interface TextCellProps {
  sub: SubProjectWithRelations;
  field: TextField;
  isSelected: boolean;
  isEditing: boolean;
  onDoneEditing(): void;
}

export function TextCell({ sub, field, isEditing, onDoneEditing }: TextCellProps) {
  const patch = usePortfolioStore((s) => s.patchSubProject);
  const [value, setValue] = useState<string>(String(sub[field] ?? ""));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      setValue(String(sub[field] ?? ""));
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [isEditing, sub, field]);

  function commit() {
    const trimmed = value.trim();
    const original = String(sub[field] ?? "");
    if (trimmed !== original) {
      patch(sub.id, { [field]: trimmed || null } as UpdateSubProjectInput).catch(
        () => undefined
      );
    }
    onDoneEditing();
  }

  if (isEditing) {
    return (
      <div className="text-cell-editor">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") onDoneEditing();
          }}
        />
      </div>
    );
  }

  const display = sub[field] as string | null | undefined;
  return (
    <span style={{ color: display ? "var(--ink)" : "var(--ink-3)" }}>
      {display ?? "—"}
    </span>
  );
}
