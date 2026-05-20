import { useState } from "react";
import type {
  Activity,
  CreateActivityInput,
  ProjectWithSubs,
  SubProjectWithRelations,
  UpdateActivityInput,
} from "@/types";
import { ACTIVITY_TYPE_META, ACTIVITY_TYPE_VALUES } from "@/types";
import { useActivitiesStore } from "@/frontend/store/useActivitiesStore";
import { useAuthStore } from "@/frontend/store/useAuthStore";
import { Modal } from "@/frontend/components/ui/Modal";

interface ActivityModalProps {
  subProjects: SubProjectWithRelations[];
  projects: ProjectWithSubs[];
  activity?: Activity;
  defaultOccursAt?: string;
  // When set, the modal creates an activity for this sub-project only — the
  // picker is replaced by a read-only label. Used by RowActionsCell's
  // "Add activity" entry.
  lockedSubProjectId?: string;
  onClose(): void;
}

export function ActivityModal({
  subProjects,
  projects,
  activity,
  defaultOccursAt,
  lockedSubProjectId,
  onClose,
}: ActivityModalProps) {
  const create = useActivitiesStore((s) => s.create);
  const update = useActivitiesStore((s) => s.update);
  const deleteActivity = useActivitiesStore((s) => s.delete);
  const profile = useAuthStore((s) => s.profile);

  const [subProjectId, setSubProjectId] = useState<string>(
    activity?.subProjectId ??
      lockedSubProjectId ??
      subProjects[0]?.id ??
      "",
  );
  const [type, setType] = useState<CreateActivityInput["type"]>(
    activity?.type ?? "note",
  );
  const [title, setTitle] = useState(activity?.title ?? "");
  const [body, setBody] = useState(activity?.body ?? "");
  const [occursAt, setOccursAt] = useState(
    activity?.occursAt.slice(0, 16) ??
      defaultOccursAt ??
      new Date().toISOString().slice(0, 16),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthor =
    !activity || activity.authorId === profile?.id || profile?.role === "admin";
  const isEditing = !!activity;

  const subProjectsByProject = projects
    .map((p) => ({
      project: p,
      subs: subProjects.filter((s) => s.projectId === p.id),
    }))
    .filter((g) => g.subs.length > 0);

  async function handleSave() {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!subProjectId) {
      setError("Please pick a sub-project");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (activity) {
        const input: UpdateActivityInput = {
          type,
          title: title.trim(),
          body: body.trim() || null,
          occursAt: new Date(occursAt).toISOString(),
        };
        await update(activity.id, input);
      } else {
        const input: CreateActivityInput = {
          subProjectId,
          type,
          title: title.trim(),
          body: body.trim() || null,
          occursAt: new Date(occursAt).toISOString(),
        };
        await create(input);
      }
      onClose();
    } catch {
      setError("Failed to save activity");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!activity) return;
    if (!confirm("Delete this activity?")) return;
    try {
      await deleteActivity(activity.id);
      onClose();
    } catch {
      setError("Failed to delete activity");
    }
  }

  return (
    <Modal
      title={isEditing ? "Edit Activity" : "New Activity"}
      onClose={onClose}
      actions={
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {activity && isAuthor && (
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>
              Delete
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={saving || !isAuthor}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
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
        <label className="form-label">Sub-project *</label>
        {lockedSubProjectId ? (
          (() => {
            const locked = subProjects.find((s) => s.id === lockedSubProjectId);
            const lockedProject = locked
              ? projects.find((p) => p.id === locked.projectId)
              : null;
            return (
              <div
                className="form-input"
                style={{
                  background: "var(--bg)",
                  color: "var(--ink-2)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "default",
                }}
              >
                {lockedProject && (
                  <span
                    style={{
                      fontSize: "11px",
                      color: lockedProject.color,
                      fontWeight: 600,
                    }}
                  >
                    {lockedProject.name}
                  </span>
                )}
                <span>{locked?.name ?? "(unknown)"}</span>
              </div>
            );
          })()
        ) : (
          <select
            className="form-select"
            value={subProjectId}
            onChange={(e) => setSubProjectId(e.target.value)}
            disabled={isEditing || !isAuthor}
          >
            {subProjectsByProject.map(({ project, subs }) => (
              <optgroup key={project.id} label={project.name}>
                {subs.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        )}
      </div>

      <div className="form-field">
        <label className="form-label">Type</label>
        <select
          className="form-select"
          value={type}
          onChange={(e) => setType(e.target.value as CreateActivityInput["type"])}
          disabled={!isAuthor}
        >
          {ACTIVITY_TYPE_VALUES.map((t) => {
            const meta = ACTIVITY_TYPE_META[t];
            return (
              <option key={t} value={t}>
                {meta.icon} {meta.label} / {meta.labelTh}
              </option>
            );
          })}
        </select>
      </div>

      <div className="form-field">
        <label className="form-label">Title *</label>
        <input
          className="form-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Activity title"
          disabled={!isAuthor}
        />
      </div>

      <div className="form-field">
        <label className="form-label">Date & Time</label>
        <input
          type="datetime-local"
          className="form-input"
          value={occursAt}
          onChange={(e) => setOccursAt(e.target.value)}
          disabled={!isAuthor}
        />
      </div>

      <div className="form-field">
        <label className="form-label">Notes (optional)</label>
        <textarea
          className="form-input"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Additional notes…"
          disabled={!isAuthor}
          style={{ resize: "vertical" }}
        />
      </div>
    </Modal>
  );
}
