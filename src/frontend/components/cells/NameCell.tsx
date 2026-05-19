import { useState, useRef, useEffect } from "react";
import type { SubProjectWithRelations } from "@/types";
import { usePortfolioStore } from "@/frontend/store/usePortfolioStore";

interface NameCellProps {
  sub: SubProjectWithRelations;
  isSelected: boolean;
  isEditing: boolean;
  onDoneEditing(): void;
}

export function NameCell({ sub, isSelected: _isSelected, isEditing, onDoneEditing }: NameCellProps) {
  const patch = usePortfolioStore((s) => s.patchSubProject);
  const [name, setName] = useState(sub.name);
  const [nameTh, setNameTh] = useState(sub.nameTh ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      setName(sub.name);
      setNameTh(sub.nameTh ?? "");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isEditing, sub.name, sub.nameTh]);

  function commit() {
    const trimmed = name.trim();
    if (!trimmed) {
      onDoneEditing();
      return;
    }
    if (trimmed !== sub.name || nameTh.trim() !== (sub.nameTh ?? "")) {
      patch(sub.id, {
        name: trimmed,
        nameTh: nameTh.trim() || null,
      }).catch(() => undefined);
    }
    onDoneEditing();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      onDoneEditing();
    }
  }

  if (isEditing) {
    return (
      <div className="cell-name-editor">
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commit}
          placeholder="Sub-project name"
        />
        <input
          value={nameTh}
          onChange={(e) => setNameTh(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commit}
          placeholder="ชื่อภาษาไทย (optional)"
        />
      </div>
    );
  }

  return (
    <>
      {sub.icon && (
        <span className="cell-name-icon">{sub.icon}</span>
      )}
      <div className="cell-name-content">
        <span className="cell-name-primary">{sub.name}</span>
        {sub.nameTh && (
          <span className="cell-name-secondary">{sub.nameTh}</span>
        )}
      </div>
    </>
  );
}
