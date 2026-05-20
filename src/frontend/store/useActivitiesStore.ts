import { create } from "zustand";
import { apiClient } from "@/frontend/lib/apiClient";
import type {
  Activity,
  CreateActivityInput,
  UpdateActivityInput,
  ListActivitiesResponse,
  CreateActivityResponse,
  UpdateActivityResponse,
} from "@/types";

type ActivitiesStatus = "idle" | "loading" | "ready" | "error";

interface ActivitiesState {
  bySubProjectId: Record<string, Activity[]>;
  status: ActivitiesStatus;
  load(subProjectId: string, from?: string, to?: string): Promise<void>;
  loadByBoard(boardId: string, from?: string, to?: string): Promise<void>;
  create(input: CreateActivityInput): Promise<void>;
  update(id: string, input: UpdateActivityInput): Promise<void>;
  delete(id: string): Promise<void>;
  reset(): void;
}

export const useActivitiesStore = create<ActivitiesState>()((set, get) => ({
  bySubProjectId: {},
  status: "idle",

  async load(subProjectId, from, to) {
    set({ status: "loading" });
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const query = params.toString() ? `?${params.toString()}` : "";
      const data = await apiClient.get<ListActivitiesResponse>(
        `/api/sub-projects/${subProjectId}/activities${query}`
      );
      set((state) => ({
        status: "ready",
        bySubProjectId: { ...state.bySubProjectId, [subProjectId]: data },
      }));
    } catch {
      set({ status: "error" });
    }
  },

  async loadByBoard(boardId, from, to) {
    set({ status: "loading" });
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const query = params.toString() ? `?${params.toString()}` : "";
      const data = await apiClient.get<ListActivitiesResponse>(
        `/api/boards/${boardId}/activities${query}`,
      );
      const grouped: Record<string, Activity[]> = {};
      for (const a of data) {
        const list = grouped[a.subProjectId] ?? [];
        list.push(a);
        grouped[a.subProjectId] = list;
      }
      set({ status: "ready", bySubProjectId: grouped });
    } catch {
      set({ status: "error" });
    }
  },

  async create(input) {
    const created = await apiClient.post<CreateActivityResponse>(
      "/api/activities",
      input
    );
    set((state) => {
      const existing = state.bySubProjectId[created.subProjectId] ?? [];
      return {
        bySubProjectId: {
          ...state.bySubProjectId,
          [created.subProjectId]: [...existing, created],
        },
      };
    });
  },

  async update(id, input) {
    const updated = await apiClient.put<UpdateActivityResponse>(
      `/api/activities/${id}`,
      input
    );
    set((state) => {
      const subProjectId = updated.subProjectId;
      const existing = state.bySubProjectId[subProjectId] ?? [];
      return {
        bySubProjectId: {
          ...state.bySubProjectId,
          [subProjectId]: existing.map((a) =>
            a.id === id ? updated : a
          ),
        },
      };
    });
  },

  async delete(id) {
    const allActivities = get().bySubProjectId;
    let subProjectId: string | null = null;
    for (const [spId, acts] of Object.entries(allActivities)) {
      if (acts.some((a) => a.id === id)) {
        subProjectId = spId;
        break;
      }
    }

    await apiClient.delete(`/api/activities/${id}`);

    if (subProjectId !== null) {
      const spId = subProjectId;
      set((state) => {
        const existing = state.bySubProjectId[spId] ?? [];
        return {
          bySubProjectId: {
            ...state.bySubProjectId,
            [spId]: existing.filter((a) => a.id !== id),
          },
        };
      });
    }
  },

  reset() {
    set({ bySubProjectId: {}, status: "idle" });
  },
}));
