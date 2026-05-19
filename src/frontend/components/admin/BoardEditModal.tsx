import { useState } from "react";
import type { Board, Profile, CreateBoardInput, UpdateBoardInput } from "@/types";
import { apiClient } from "@/frontend/lib/apiClient";
import { Modal } from "@/frontend/components/ui/Modal";
import { AdminMemberPicker } from "@/frontend/components/admin/MemberPicker";

interface BoardEditModalProps {
  board?: Board;
  allProfiles: Profile[];
  existingMemberIds?: string[];
  onClose(): void;
  onSaved(): void;
}

export function BoardEditModal({
  board,
  allProfiles,
  existingMemberIds = [],
  onClose,
  onSaved,
}: BoardEditModalProps) {
  const [name, setName] = useState(board?.name ?? "");
  const [nameTh, setNameTh] = useState(board?.nameTh ?? "");
  const [icon, setIcon] = useState(board?.icon ?? "▦");
  const [color, setColor] = useState(board?.color ?? "#7C5CFF");
  const [memberIds, setMemberIds] = useState<string[]>(existingMemberIds);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleMember(id: string) {
    setMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  }

  async function handleSave() {
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError(null);
    try {
      if (board) {
        const input: UpdateBoardInput = {
          name: name.trim(),
          nameTh: nameTh.trim() || null,
          icon,
          color,
        };
        await apiClient.put(`/api/admin/boards/${board.id}`, input);

        const toAdd = memberIds.filter((id) => !existingMemberIds.includes(id));
        const toRemove = existingMemberIds.filter((id) => !memberIds.includes(id));
        await Promise.all([
          ...toAdd.map((id) =>
            apiClient.post(`/api/boards/${board.id}/members`, { userId: id })
          ),
          ...toRemove.map((id) =>
            apiClient.delete(`/api/boards/${board.id}/members/${id}`)
          ),
        ]);
      } else {
        const input: CreateBoardInput = {
          name: name.trim(),
          nameTh: nameTh.trim() || null,
          icon,
          color,
          memberIds,
        };
        await apiClient.post("/api/admin/boards", input);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save board");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={board ? "Edit Board" : "New Board"}
      onClose={onClose}
      size="lg"
      actions={
        <>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : board ? "Save changes" : "Create board"}
          </button>
        </>
      }
    >
      {error && (
        <div style={{ color: "var(--red)", fontSize: "12.5px", marginBottom: "12px" }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div className="form-field">
          <label className="form-label">Board Name *</label>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Main Board" />
        </div>
        <div className="form-field">
          <label className="form-label">Name (Thai)</label>
          <input className="form-input" value={nameTh} onChange={(e) => setNameTh(e.target.value)} placeholder="ชื่อภาษาไทย" />
        </div>
      </div>

      <div style={{ display: "flex", gap: "12px" }}>
        <div className="form-field" style={{ flex: 1 }}>
          <label className="form-label">Icon</label>
          <input className="form-input" value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={2} />
        </div>
        <div className="form-field" style={{ flex: 1 }}>
          <label className="form-label">Color</label>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
            <span style={{ fontSize: "12px", color: "var(--ink-3)" }}>{color}</span>
          </div>
        </div>
      </div>

      <div className="form-field">
        <label className="form-label">Members</label>
        <AdminMemberPicker
          allProfiles={allProfiles}
          selectedIds={memberIds}
          onToggle={toggleMember}
        />
      </div>
    </Modal>
  );
}
