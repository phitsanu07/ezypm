import { create } from "zustand";
import { apiClient } from "@/frontend/lib/apiClient";
import { ApiClientError } from "@/frontend/lib/http-errors";
import { getErrorMessage } from "@/frontend/lib/errorMessages";
import type {
  PortfolioPayload,
  UpdateSubProjectInput,
  CreateSubProjectInput,
  ReorderSubProjectInput,
  CreateProjectInput,
  UpdateProjectInput,
  SubProjectWithRelations,
  ProjectWithSubs,
  GetPortfolioResponse,
  CreateSubProjectResponse,
  UpdateSubProjectResponse,
  CreateProjectResponse,
  UpdateProjectResponse,
} from "@/types";

type PortfolioStatus = "idle" | "loading" | "ready" | "error";

interface PortfolioState {
  status: PortfolioStatus;
  payload: PortfolioPayload | null;
  errorMessage: string | null;
  _currentBoardId: string | null;
  load(boardId: string): Promise<void>;
  refresh(): Promise<void>;
  patchSubProject(id: string, patch: UpdateSubProjectInput): Promise<void>;
  reorderSubProject(
    id: string,
    targetProjectId: string,
    position: number
  ): Promise<void>;
  createSubProject(input: CreateSubProjectInput): Promise<void>;
  deleteSubProject(id: string): Promise<void>;
  createProject(input: CreateProjectInput): Promise<void>;
  updateProject(id: string, input: UpdateProjectInput): Promise<void>;
  deleteProject(id: string): Promise<void>;
  addSubProjectMember(id: string, userId: string): Promise<void>;
  removeSubProjectMember(id: string, userId: string): Promise<void>;
  reset(): void;
}

function replaceSubProject(
  payload: PortfolioPayload,
  updated: SubProjectWithRelations
): PortfolioPayload {
  return {
    ...payload,
    projects: payload.projects.map((p) =>
      p.id === updated.projectId
        ? {
            ...p,
            subProjects: p.subProjects.map((sp) =>
              sp.id === updated.id ? updated : sp
            ),
          }
        : p
    ),
  };
}


function removeSubProject(
  payload: PortfolioPayload,
  id: string
): PortfolioPayload {
  return {
    ...payload,
    projects: payload.projects.map((p) => ({
      ...p,
      subProjects: p.subProjects.filter((sp) => sp.id !== id),
    })),
  };
}

function applyOptimisticPatch(
  payload: PortfolioPayload,
  id: string,
  patch: UpdateSubProjectInput
): PortfolioPayload {
  return {
    ...payload,
    projects: payload.projects.map((p) => ({
      ...p,
      subProjects: p.subProjects.map((sp) =>
        sp.id === id ? { ...sp, ...patch } : sp
      ),
    })),
  };
}

export const usePortfolioStore = create<PortfolioState>()((set, get) => ({
  status: "idle",
  payload: null,
  errorMessage: null,
  _currentBoardId: null,

  async load(boardId) {
    set({ status: "loading", errorMessage: null, _currentBoardId: boardId });
    try {
      const data = await apiClient.get<GetPortfolioResponse>(
        `/api/boards/${boardId}/portfolio`
      );
      set({ status: "ready", payload: data });
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? getErrorMessage(err.code, err.message)
          : "Failed to load board";
      set({ status: "error", errorMessage: message });
    }
  },

  async refresh() {
    const boardId = get()._currentBoardId;
    if (!boardId) return;
    try {
      const data = await apiClient.get<GetPortfolioResponse>(
        `/api/boards/${boardId}/portfolio`
      );
      set({ status: "ready", payload: data });
    } catch {
      // silent refresh failure — keep existing data
    }
  },

  async patchSubProject(id, patch) {
    const payload = get().payload;
    if (!payload) return;

    const before = payload.projects
      .flatMap((p) => p.subProjects)
      .find((sp) => sp.id === id);

    const optimistic = applyOptimisticPatch(payload, id, patch);
    set({ payload: optimistic });

    try {
      const updated = await apiClient.put<UpdateSubProjectResponse>(
        `/api/sub-projects/${id}`,
        patch
      );
      set((state) =>
        state.payload
          ? { payload: replaceSubProject(state.payload, updated) }
          : {}
      );
    } catch (err) {
      if (before !== undefined) {
        const snapshot = before;
        set((state) =>
          state.payload
            ? { payload: replaceSubProject(state.payload, snapshot) }
            : {}
        );
      }

      const { useToastStore } = await import(
        "@/frontend/store/useToastStore"
      );
      const { useAuthStore } = await import(
        "@/frontend/store/useAuthStore"
      );

      if (err instanceof ApiClientError) {
        useToastStore
          .getState()
          .push({ tone: "error", message: getErrorMessage(err.code, err.message) });

        if (
          err.code === "USER_SUSPENDED" ||
          err.code === "UNAUTHENTICATED"
        ) {
          await useAuthStore.getState().logout();
        }
      }
    }
  },

  async reorderSubProject(id, targetProjectId, position) {
    const payload = get().payload;
    if (!payload) return;

    // Optimistic: bump the moved row's position locally + re-sort by position
    const optimisticPayload: PortfolioPayload = {
      ...payload,
      projects: payload.projects.map((p) =>
        p.id === targetProjectId
          ? {
              ...p,
              subProjects: [...p.subProjects]
                .map((sp) =>
                  sp.id === id ? { ...sp, position } : sp,
                )
                .sort((a, b) => a.position - b.position),
            }
          : p,
      ),
    };
    set({ payload: optimisticPayload });

    const body: ReorderSubProjectInput = { targetProjectId, position };

    try {
      await apiClient.put<UpdateSubProjectResponse>(
        `/api/sub-projects/${id}/reorder`,
        body,
      );
      // backend may renumber the entire project's positions on collision;
      // refetch in background to reconcile canonical positions but keep UI
      // already in the correct visual order
      void get().refresh();
    } catch (err) {
      const { useToastStore } = await import(
        "@/frontend/store/useToastStore"
      );
      if (err instanceof ApiClientError) {
        useToastStore
          .getState()
          .push({ tone: "error", message: getErrorMessage(err.code, err.message) });
      }
      await get().refresh();
    }
  },

  async createSubProject(input) {
    const created = await apiClient.post<CreateSubProjectResponse>(
      "/api/sub-projects",
      input
    );
    set((state) => {
      if (!state.payload) return {};
      return {
        payload: {
          ...state.payload,
          projects: state.payload.projects.map((p) =>
            p.id === created.projectId
              ? { ...p, subProjects: [...p.subProjects, created] }
              : p
          ),
        },
      };
    });
  },

  async deleteSubProject(id) {
    const payload = get().payload;
    if (!payload) return;

    const optimistic = removeSubProject(payload, id);
    set({ payload: optimistic });

    try {
      await apiClient.delete(`/api/sub-projects/${id}`);
    } catch (err) {
      set({ payload });
      const { useToastStore } = await import(
        "@/frontend/store/useToastStore"
      );
      if (err instanceof ApiClientError) {
        useToastStore
          .getState()
          .push({ tone: "error", message: getErrorMessage(err.code, err.message) });
      }
    }
  },

  async createProject(input) {
    const created = await apiClient.post<CreateProjectResponse>(
      "/api/projects",
      input
    );
    const newProject: ProjectWithSubs = { ...created, subProjects: [] };
    set((state) => {
      if (!state.payload) return {};
      return {
        payload: {
          ...state.payload,
          projects: [...state.payload.projects, newProject],
        },
      };
    });
  },

  async updateProject(id, input) {
    const updated = await apiClient.put<UpdateProjectResponse>(
      `/api/projects/${id}`,
      input
    );
    set((state) => {
      if (!state.payload) return {};
      return {
        payload: {
          ...state.payload,
          projects: state.payload.projects.map((p) =>
            p.id === id ? { ...p, ...updated } : p
          ),
        },
      };
    });
  },

  async deleteProject(id) {
    await apiClient.delete(`/api/projects/${id}`);
    set((state) => {
      if (!state.payload) return {};
      return {
        payload: {
          ...state.payload,
          projects: state.payload.projects.filter((p) => p.id !== id),
        },
      };
    });
  },

  async addSubProjectMember(id, userId) {
    await apiClient.post(`/api/sub-projects/${id}/members`, { userId });
    await get().refresh();
  },

  async removeSubProjectMember(id, userId) {
    await apiClient.delete(`/api/sub-projects/${id}/members/${userId}`);
    await get().refresh();
  },

  reset() {
    set({
      status: "idle",
      payload: null,
      errorMessage: null,
      _currentBoardId: null,
    });
  },
}));
