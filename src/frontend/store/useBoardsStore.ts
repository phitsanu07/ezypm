import { create } from "zustand";
import { apiClient } from "@/frontend/lib/apiClient";
import type { BoardWithMeta, ListBoardsResponse } from "@/types";

const STORAGE_KEY = "gridwork.activeBoardId.v1";

function loadActiveBoardId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveActiveBoardId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // storage unavailable
  }
}

interface BoardsState {
  boards: BoardWithMeta[];
  activeBoardId: string | null;
  setBoards(boards: BoardWithMeta[]): void;
  setActiveBoard(id: string): void;
  refresh(): Promise<void>;
  reset(): void;
}

export const useBoardsStore = create<BoardsState>()((set, get) => ({
  boards: [],
  activeBoardId: loadActiveBoardId(),

  setBoards(boards) {
    set((state) => {
      const persisted = loadActiveBoardId();
      const resolved =
        persisted && boards.some((b) => b.id === persisted)
          ? persisted
          : (boards[0]?.id ?? null);

      if (resolved !== state.activeBoardId) {
        saveActiveBoardId(resolved);
      }

      return { boards, activeBoardId: resolved };
    });
  },

  setActiveBoard(id) {
    saveActiveBoardId(id);
    set({ activeBoardId: id });
  },

  async refresh() {
    const data = await apiClient.get<ListBoardsResponse>("/api/boards");
    get().setBoards(data);
  },

  reset() {
    saveActiveBoardId(null);
    set({ boards: [], activeBoardId: null });
  },
}));
