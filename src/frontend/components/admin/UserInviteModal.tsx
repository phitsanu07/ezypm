import { useState } from "react";
import type { InviteUserInput, UserRole } from "@/types";
import { USER_ROLE_VALUES } from "@/types";
import { apiClient } from "@/frontend/lib/apiClient";
import { Modal } from "@/frontend/components/ui/Modal";

interface UserInviteModalProps {
  onClose(): void;
  onSaved(): void;
}

const COLORS = [
  "#7C5CFF",
  "#FF7849",
  "#3DBE8B",
  "#3A86FF",
  "#F4A300",
  "#E5484D",
];

export function UserInviteModal({ onClose, onSaved }: UserInviteModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [nameTh, setNameTh] = useState("");
  const [role, setRole] = useState<UserRole>("editor");
  const [color, setColor] = useState<string>(COLORS[0] ?? "#7C5CFF");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    if (!email.trim() || !password.trim() || !name.trim()) {
      setError("Email, password, and name are required");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setSaving(true);
    try {
      const input: InviteUserInput = {
        email: email.trim(),
        name: name.trim(),
        nameTh: nameTh.trim() || undefined,
        role,
        color,
        password,
      };
      await apiClient.post("/api/admin/users", input);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite user");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Invite User"
      onClose={onClose}
      actions={
        <>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Inviting…" : "Invite user"}
          </button>
        </>
      }
    >
      {error && (
        <div
          style={{
            color: "var(--red)",
            fontSize: "12.5px",
            marginBottom: "12px",
          }}
        >
          {error}
        </div>
      )}

      <div className="form-field">
        <label className="form-label">Email *</label>
        <input
          className="form-input"
          type="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
        />
      </div>

      <div className="form-field">
        <label className="form-label">Password * (admin-set, min 8 chars)</label>
        <input
          className="form-input"
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Temporary password"
        />
      </div>

      <div className="form-field">
        <label className="form-label">Name *</label>
        <input
          className="form-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="form-field">
        <label className="form-label">Name (Thai)</label>
        <input
          className="form-input"
          value={nameTh}
          onChange={(e) => setNameTh(e.target.value)}
        />
      </div>

      <div className="form-field">
        <label className="form-label">Role</label>
        <select
          className="form-select"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
        >
          {USER_ROLE_VALUES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label className="form-label">Color</label>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: c,
                border:
                  color === c
                    ? "3px solid var(--ink)"
                    : "1px solid var(--line)",
                cursor: "pointer",
              }}
              aria-label={`Color ${c}`}
              title={c}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{ marginLeft: 8 }}
          />
        </div>
      </div>
    </Modal>
  );
}
