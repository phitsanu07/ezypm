import { useState } from "react";
import { useBoardsStore } from "@/frontend/store/useBoardsStore";
import { usePortfolioStore } from "@/frontend/store/usePortfolioStore";

export function BoardSwitcher() {
  const boards = useBoardsStore((s) => s.boards);
  const activeBoardId = useBoardsStore((s) => s.activeBoardId);
  const setActiveBoard = useBoardsStore((s) => s.setActiveBoard);
  const loadPortfolio = usePortfolioStore((s) => s.load);
  const [open, setOpen] = useState(false);

  const activeBoard = boards.find((b) => b.id === activeBoardId);

  async function switchBoard(id: string) {
    setActiveBoard(id);
    setOpen(false);
    await loadPortfolio(id);
  }

  if (boards.length === 0) return null;

  return (
    <div className="board-switcher">
      <button
        className="board-switcher-btn"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {activeBoard && (
          <span
            className="board-switcher-icon"
            style={{ background: activeBoard.color + "22", color: activeBoard.color }}
          >
            {activeBoard.icon}
          </span>
        )}
        <span>{activeBoard?.name ?? "Select board"}</span>
        <span className="board-switcher-chevron">▾</span>
      </button>

      {open && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 99 }}
            onClick={() => setOpen(false)}
          />
          <div className="board-switcher-dropdown" role="listbox">
            {boards.map((board) => (
              <button
                key={board.id}
                className={`board-switcher-item${board.id === activeBoardId ? " active" : ""}`}
                role="option"
                aria-selected={board.id === activeBoardId}
                onClick={() => switchBoard(board.id)}
              >
                <span
                  className="board-switcher-icon"
                  style={{ background: board.color + "22", color: board.color }}
                >
                  {board.icon}
                </span>
                <span>{board.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
