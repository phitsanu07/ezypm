import { useState } from "react";
import { usePortfolioStore } from "@/frontend/store/usePortfolioStore";

interface AddRowProps {
  projectId: string;
  boardId: string;
}

export function AddRow({ projectId, boardId: _boardId }: AddRowProps) {
  const createSubProject = usePortfolioStore((s) => s.createSubProject);
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (adding) return;
    setAdding(true);
    try {
      await createSubProject({
        projectId,
        name: "New sub-project",
        nameTh: null,
      });
    } finally {
      setAdding(false);
    }
  }

  return (
    <div
      className="add-row"
      onClick={handleAdd}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleAdd(); }}
      aria-label="Add new sub-project row"
    >
      <span style={{ fontSize: "14px" }}>+</span>
      {adding ? "Adding…" : "Add row"}
    </div>
  );
}
