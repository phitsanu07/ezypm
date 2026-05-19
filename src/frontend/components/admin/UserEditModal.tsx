import { useState } from "react";
import type { Profile, UpdateUserInput, UserRole, UserStatus } from "@/types";
import { USER_ROLE_VALUES, USER_STATUS_VALUES } from "@/types";
import { apiClient } from "@/frontend/lib/apiClient";
import { Modal } from "@/frontend/components/ui/Modal";

interface UserEditModalProps {
  user: Profile;
  onClose(): void;
  onSaved(): void;
}

export function UserEditModal({ user, onClose, onSaved }: UserEditModalProps) {
  const [name, setName] = useState(user.name);
  const [nameTh, setNameTh] = useState(user.nameTh);
  const [role, setRole] = useState<UserRole>(user.role);
  const [status, setStatus] = useState<UserStatus>(user.status);
  const [color, setColor] = useState(user.color);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const input: UpdateUserInput = { name, nameTh, role, status, color };
      await apiClient.put(`/api/admin/users/${user.id}`, input);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Edit User"
      onClose={onClose}
      actions={
        <>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </>
      }
    >
      {error && (
        <div style={{ color: "var(--red)", fontSize: "12.5px", marginBottom: "12px" }}>
          {error}
        </div>
      )}

      <div className="form-field">
        <label className="form-label">Name</label>
        <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="form-field">
        <label className="form-label">Name (Thai)</label>
        <input className="form-input" value={nameTh} onChange={(e) => setNameTh(e.target.value)} />
      </div>

      <div className="form-field">
        <label className="form-label">Role</label>
        <select
          className="form-select"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
        >
          {USER_ROLE_VALUES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label className="form-label">Status</label>
        <select
          className="form-select"
          value={status}
          onChange={(e) => setStatus(e.target.value as UserStatus)}
        >
          {USER_STATUS_VALUES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label className="form-label">Color</label>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          <span style={{ fontSize: "12px", color: "var(--ink-3)" }}>{color}</span>
        </div>
      </div>
    </Modal>
  );
}
