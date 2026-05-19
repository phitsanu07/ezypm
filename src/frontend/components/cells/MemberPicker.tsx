import { useState } from "react";
import type { Profile } from "@/types";
import { Avatar } from "@/frontend/components/ui/Avatar";

interface MemberPickerProps {
  members: Profile[];
  selectedId: string | null;
  onSelect(id: string | null): void;
  onClose(): void;
  allowUnassign?: boolean;
}

export function MemberPicker({
  members,
  selectedId,
  onSelect,
  onClose: _onClose,
  allowUnassign = true,
}: MemberPickerProps) {
  const [query, setQuery] = useState("");

  const active = members.filter((m) => m.status !== "suspended");
  const filtered = active.filter(
    (m) =>
      m.name.toLowerCase().includes(query.toLowerCase()) ||
      m.nameTh.toLowerCase().includes(query.toLowerCase()) ||
      m.email.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      <div className="member-picker-search">
        <input
          autoFocus
          placeholder="ค้นหา / Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {allowUnassign && (
        <button
          className={`member-picker-item${selectedId === null ? " selected" : ""}`}
          onClick={() => onSelect(null)}
        >
          <span style={{ color: "var(--ink-3)", fontSize: "12px" }}>— ไม่ระบุ / Unassign</span>
        </button>
      )}
      {filtered.map((m) => (
        <button
          key={m.id}
          className={`member-picker-item${m.id === selectedId ? " selected" : ""}`}
          onClick={() => onSelect(m.id)}
        >
          <Avatar name={m.name} initials={m.initials} color={m.color} />
          <span>
            <span className="member-picker-name">{m.name}</span>
            <span className="member-picker-nameTh"> · {m.nameTh}</span>
          </span>
        </button>
      ))}
      {filtered.length === 0 && (
        <p style={{ padding: "8px 12px", color: "var(--ink-3)", fontSize: "12px" }}>
          ไม่พบ / No results
        </p>
      )}
    </div>
  );
}
