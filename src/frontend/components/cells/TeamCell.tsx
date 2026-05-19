import { useState, useRef, useEffect } from "react";
import type { SubProjectWithRelations, Profile } from "@/types";
import { usePortfolioStore } from "@/frontend/store/usePortfolioStore";
import { Avatar } from "@/frontend/components/ui/Avatar";
import { Popover } from "@/frontend/components/cells/Popover";
import { MultiMemberPicker } from "@/frontend/components/cells/MultiMemberPicker";

interface TeamCellProps {
  sub: SubProjectWithRelations;
  members: Profile[];
  isSelected: boolean;
  isEditing: boolean;
  onDoneEditing(): void;
}

export function TeamCell({
  sub,
  members,
  isEditing,
  onDoneEditing,
}: TeamCellProps) {
  const patch = usePortfolioStore((s) => s.patchSubProject);
  const cellRef = useRef<HTMLDivElement>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [localIds, setLocalIds] = useState<string[]>(sub.teamIds);

  useEffect(() => {
    if (isEditing) {
      setAnchorRect(cellRef.current?.getBoundingClientRect() ?? null);
      setLocalIds(sub.teamIds);
    } else {
      setAnchorRect(null);
    }
  }, [isEditing, sub.teamIds]);

  function close() {
    onDoneEditing();
  }

  function handleToggle(id: string) {
    const next = localIds.includes(id)
      ? localIds.filter((i) => i !== id)
      : [...localIds, id];
    setLocalIds(next);
    void patch(sub.id, { teamIds: next });
  }

  const visible = sub.team.slice(0, 3);
  const extra = sub.team.length - 3;
  const open = isEditing && anchorRect !== null;

  return (
    <div
      ref={cellRef}
      style={{ display: "flex", alignItems: "center", width: "100%" }}
    >
      <div className="avatar-stack">
        {visible.map((m) => (
          <Avatar key={m.id} name={m.name} initials={m.initials} color={m.color} />
        ))}
        {extra > 0 && <span className="avatar-more">+{extra}</span>}
      </div>
      {sub.team.length === 0 && (
        <span style={{ color: "var(--ink-3)", fontSize: "12px" }}>—</span>
      )}
      {open && (
        <Popover anchorRect={anchorRect} onClose={close}>
          <MultiMemberPicker
            members={members}
            selectedIds={localIds}
            onToggle={handleToggle}
            onClose={close}
          />
        </Popover>
      )}
    </div>
  );
}
