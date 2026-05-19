import { useState, useRef, useEffect } from "react";
import type { SubProjectWithRelations, Profile } from "@/types";
import { usePortfolioStore } from "@/frontend/store/usePortfolioStore";
import { Avatar } from "@/frontend/components/ui/Avatar";
import { Popover } from "@/frontend/components/cells/Popover";
import { MemberPicker } from "@/frontend/components/cells/MemberPicker";

interface AssigneeCellProps {
  sub: SubProjectWithRelations;
  members: Profile[];
  isSelected: boolean;
  isEditing: boolean;
  onDoneEditing(): void;
}

export function AssigneeCell({
  sub,
  members,
  isSelected: _isSelected,
  isEditing,
  onDoneEditing,
}: AssigneeCellProps) {
  const patch = usePortfolioStore((s) => s.patchSubProject);
  const cellRef = useRef<HTMLDivElement>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (isEditing) {
      const rect = cellRef.current?.getBoundingClientRect() ?? null;
      setAnchorRect(rect);
    } else {
      setAnchorRect(null);
    }
  }, [isEditing]);

  function close() {
    onDoneEditing();
  }

  function handleSelect(id: string | null) {
    close();
    void patch(sub.id, { leadId: id });
  }

  const lead = sub.lead;
  const open = isEditing && anchorRect !== null;

  return (
    <div
      ref={cellRef}
      style={{ display: "flex", alignItems: "center", width: "100%" }}
    >
      {lead ? (
        <Avatar
          name={lead.name}
          initials={lead.initials}
          color={lead.color}
        />
      ) : (
        <span style={{ color: "var(--ink-3)", fontSize: "12px" }}>—</span>
      )}
      {open && (
        <Popover anchorRect={anchorRect} onClose={close}>
          <MemberPicker
            members={members}
            selectedId={sub.leadId}
            onSelect={handleSelect}
            onClose={close}
          />
        </Popover>
      )}
    </div>
  );
}
