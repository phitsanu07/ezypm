import { useState } from "react";
import type { Profile } from "@/types";
import { Avatar } from "@/frontend/components/ui/Avatar";

interface MultiMemberPickerProps {
  members: Profile[];
  selectedIds: string[];
  onToggle(id: string): void;
  onClose(): void;
}

export function MultiMemberPicker({
  members,
  selectedIds,
  onToggle,
  onClose: _onClose,
}: MultiMemberPickerProps) {
  const [query, setQuery] = useState("");

  const active = members.filter((m) => m.status !== "suspended");
  const filtered = active.filter(
    (m) =>
      m.name.toLowerCase().includes(query.toLowerCase()) ||
      m.nameTh.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div style={{ minWidth: 220 }}>
      <div className="member-picker-search">
        <input
          autoFocus
          placeholder="ค้นหา / Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {filtered.map((m) => {
        const checked = selectedIds.includes(m.id);
        return (
          <button
            key={m.id}
            className={`member-picker-item${checked ? " selected" : ""}`}
            onClick={() => onToggle(m.id)}
          >
            <input
              type="checkbox"
              checked={checked}
              readOnly
              className="member-checkbox"
              style={{ pointerEvents: "none" }}
            />
            <Avatar name={m.name} initials={m.initials} color={m.color} />
            <span>
              <span className="member-picker-name">{m.name}</span>
            </span>
          </button>
        );
      })}
      {filtered.length === 0 && (
        <p style={{ padding: "8px 12px", color: "var(--ink-3)", fontSize: "12px" }}>
          ไม่พบ / No results
        </p>
      )}
    </div>
  );
}
