import { useState, useEffect } from "react";
import type { BoardWithMeta, Profile } from "@/types";
import { apiClient } from "@/frontend/lib/apiClient";
import { Spinner } from "@/frontend/components/ui/Spinner";
import { ErrorState } from "@/frontend/components/ui/ErrorState";
import { EmptyState } from "@/frontend/components/ui/EmptyState";
import { BoardEditModal } from "@/frontend/components/admin/BoardEditModal";
import { ConfirmDialog } from "@/frontend/components/admin/ConfirmDialog";

type PanelStatus = "loading" | "ready" | "error";

export function BoardsPanel() {
  const [boards, setBoards] = useState<BoardWithMeta[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [status, setStatus] = useState<PanelStatus>("loading");
  const [editBoard, setEditBoard] = useState<BoardWithMeta | null>(null);
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [deleteBoard, setDeleteBoard] = useState<BoardWithMeta | null>(null);

  async function fetchData() {
    setStatus("loading");
    try {
      const [boardData, profileData] = await Promise.all([
        apiClient.get<BoardWithMeta[]>("/api/boards"),
        apiClient.get<Profile[]>("/api/admin/users"),
      ]);
      setBoards(boardData);
      setAllProfiles(profileData);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => { fetchData().catch(() => undefined); }, []);

  async function handleDelete(board: BoardWithMeta) {
    try {
      await apiClient.delete(`/api/admin/boards/${board.id}`);
      setDeleteBoard(null);
      await fetchData();
    } catch {
      // ignore
    }
  }

  if (status === "loading") {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
        <Spinner />
      </div>
    );
  }

  if (status === "error") {
    return <ErrorState message="Failed to load boards" onRetry={fetchData} />;
  }

  return (
    <div>
      <div className="panel-header">
        <h3 className="panel-title">Boards ({boards.length})</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowNewBoard(true)}>
          + New Board
        </button>
      </div>

      {boards.length === 0 ? (
        <EmptyState
          title="No boards yet"
          action={
            <button className="btn btn-primary btn-sm" onClick={() => setShowNewBoard(true)}>
              + Create board
            </button>
          }
        />
      ) : (
        <table className="boards-table">
          <thead>
            <tr>
              <th>Board</th>
              <th>Members</th>
              <th>Projects</th>
              <th>Sub-projects</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {boards.map((board) => (
              <tr key={board.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        background: board.color + "22",
                        color: board.color,
                        display: "grid",
                        placeItems: "center",
                        fontSize: "12px",
                      }}
                    >
                      {board.icon}
                    </span>
                    <div>
                      <div style={{ fontWeight: 500 }}>{board.name}</div>
                      {board.nameTh && (
                        <div style={{ fontSize: "11.5px", color: "var(--ink-3)" }}>
                          {board.nameTh}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td>{board.memberIds.length}</td>
                <td>{board.projectCount}</td>
                <td>{board.subProjectCount}</td>
                <td>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setEditBoard(board)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setDeleteBoard(board)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showNewBoard && (
        <BoardEditModal
          allProfiles={allProfiles}
          onClose={() => setShowNewBoard(false)}
          onSaved={fetchData}
        />
      )}

      {editBoard && (
        <BoardEditModal
          board={editBoard}
          allProfiles={allProfiles}
          existingMemberIds={editBoard.memberIds}
          onClose={() => setEditBoard(null)}
          onSaved={fetchData}
        />
      )}

      {deleteBoard && (
        <ConfirmDialog
          title="Delete Board"
          message={`Are you sure you want to delete "${deleteBoard.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          dangerous
          onConfirm={() => handleDelete(deleteBoard)}
          onCancel={() => setDeleteBoard(null)}
        />
      )}
    </div>
  );
}
