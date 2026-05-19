import { useState } from "react";
import type { Profile } from "@/types";
import { Avatar } from "@/frontend/components/ui/Avatar";

interface AdminMemberPickerProps {
  allProfiles: Profile[];
  selectedIds: string[];
  onToggle(id: string): void;
}

export function AdminMemberPicker({
  allProfiles,
  selectedIds,
  onToggle,
}: AdminMemberPickerProps) {
  const [query, setQuery] = useState("");

  const active = allProfiles.filter((p) => p.status !== "suspended");
  const filtered = query
    ? active.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.email.toLowerCase().includes(query.toLowerCase())
      )
    : active;

  return (
    <div>
      <div className="member-picker-search">
        <input
          placeholder="Search members…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="member-picker-panel">
        {filtered.map((p) => {
          const checked = selectedIds.includes(p.id);
          return (
            <div
              key={p.id}
              className={`member-picker-item${checked ? " selected" : ""}`}
              onClick={() => onToggle(p.id)}
              role="checkbox"
              aria-checked={checked}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") onToggle(p.id); }}
            >
              <input
                type="checkbox"
                checked={checked}
                readOnly
                className="member-checkbox"
                style={{ pointerEvents: "none" }}
              />
              <Avatar name={p.name} initials={p.initials} color={p.color} />
              <div>
                <div style={{ fontSize: "13px", fontWeight: 500 }}>{p.name}</div>
                <div style={{ fontSize: "11px", color: "var(--ink-3)" }}>{p.email}</div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p style={{ padding: "12px", color: "var(--ink-3)", fontSize: "12px" }}>
            No matching profiles
          </p>
        )}
      </div>
    </div>
  );
}
