import { useState, useEffect } from "react";
import type { Profile, UpdateUserInput, UserStatus } from "@/types";
import { USER_ROLE_META, USER_STATUS_META } from "@/types";
import { apiClient } from "@/frontend/lib/apiClient";
import { useToastStore } from "@/frontend/store/useToastStore";
import { Avatar } from "@/frontend/components/ui/Avatar";
import { Chip } from "@/frontend/components/ui/Chip";
import { Spinner } from "@/frontend/components/ui/Spinner";
import { ErrorState } from "@/frontend/components/ui/ErrorState";
import { EmptyState } from "@/frontend/components/ui/EmptyState";
import { UserEditModal } from "@/frontend/components/admin/UserEditModal";
import { UserInviteModal } from "@/frontend/components/admin/UserInviteModal";

type PanelStatus = "loading" | "ready" | "error";

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Unknown error";
}

export function UsersPanel() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [status, setStatus] = useState<PanelStatus>("loading");
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const pushToast = useToastStore((s) => s.push);

  async function fetchUsers() {
    setStatus("loading");
    try {
      const data = await apiClient.get<Profile[]>("/api/admin/users");
      setUsers(data);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    void fetchUsers();
  }, []);

  async function toggleSuspend(user: Profile) {
    const action: UserStatus = user.status === "suspended" ? "active" : "suspended";
    const verb = action === "suspended" ? "ระงับ" : "เปิดใช้งาน";
    if (!confirm(`${verb} ${user.name} (${user.email})?`)) return;
    setBusyId(user.id);
    try {
      const input: UpdateUserInput = { status: action };
      await apiClient.put(`/api/admin/users/${user.id}`, input);
      await fetchUsers();
      pushToast({ tone: "success", message: `${verb}ผู้ใช้แล้ว` });
    } catch (err) {
      pushToast({
        tone: "error",
        message: `${verb}ไม่สำเร็จ: ${errorMessage(err)}`,
      });
    } finally {
      setBusyId(null);
    }
  }

  if (status === "loading") {
    return (
      <div
        style={{ display: "flex", justifyContent: "center", padding: "40px" }}
      >
        <Spinner />
      </div>
    );
  }

  if (status === "error") {
    return <ErrorState message="Failed to load users" onRetry={fetchUsers} />;
  }

  return (
    <div>
      <div
        className="panel-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <h3 className="panel-title">Users ({users.length})</h3>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setInviteOpen(true)}
        >
          + Invite user
        </button>
      </div>

      {users.length === 0 ? (
        <EmptyState
          title="No users yet"
          body="Invite your first teammate to get started."
          action={
            <button
              className="btn btn-primary"
              onClick={() => setInviteOpen(true)}
            >
              + Invite user
            </button>
          }
        />
      ) : (
        <table className="users-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const roleMeta = USER_ROLE_META[user.role];
              const statusMeta = USER_STATUS_META[user.status];
              const isSuspended = user.status === "suspended";
              return (
                <tr key={user.id}>
                  <td>
                    <div className="user-table-name">
                      <Avatar
                        name={user.name}
                        initials={user.initials}
                        color={user.color}
                      />
                      <div className="user-table-info">
                        <span className="user-table-primary">{user.name}</span>
                        <span className="user-table-secondary">
                          {user.nameTh}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                    }}
                  >
                    {user.email}
                  </td>
                  <td>
                    <Chip
                      label={roleMeta.label}
                      bg={roleMeta.bg}
                      fg={roleMeta.fg}
                      size="sm"
                    />
                  </td>
                  <td>
                    <Chip
                      label={statusMeta.label}
                      bg={statusMeta.bg}
                      fg={statusMeta.fg}
                      size="sm"
                    />
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setEditUser(user)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => toggleSuspend(user)}
                        disabled={busyId === user.id}
                        style={{
                          color: isSuspended
                            ? "var(--green)"
                            : "var(--red)",
                        }}
                      >
                        {isSuspended ? "Reactivate" : "Suspend"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {editUser && (
        <UserEditModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={fetchUsers}
        />
      )}

      {inviteOpen && (
        <UserInviteModal
          onClose={() => setInviteOpen(false)}
          onSaved={fetchUsers}
        />
      )}
    </div>
  );
}
