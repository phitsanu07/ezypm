import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/frontend/lib/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/frontend/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

vi.mock("@/frontend/store/useToastStore", () => ({
  useToastStore: {
    getState: () => ({ push: vi.fn(), dismiss: vi.fn(), items: [] }),
  },
}));

vi.mock("@/frontend/store/useAuthStore", () => ({
  useAuthStore: {
    getState: () => ({ logout: vi.fn(), profile: null }),
  },
}));

import { usePortfolioStore } from "@/frontend/store/usePortfolioStore";
import { apiClient } from "@/frontend/lib/apiClient";
import { ApiClientError } from "@/frontend/lib/http-errors";
import type { PortfolioPayload, SubProjectWithRelations } from "@/types";

const mockSub: SubProjectWithRelations = {
  id: "sp-1",
  projectId: "proj-1",
  name: "Test Sub",
  nameTh: null,
  icon: "📦",
  leadId: null,
  status: "dev",
  priority: "p2",
  due: null,
  progress: 50,
  progressPrev: null,
  progressUpdatedAt: null,
  quarter: null,
  tags: [],
  position: 100,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  teamIds: [],
  team: [],
  lead: null,
};

const mockPayload: PortfolioPayload = {
  board: {
    id: "board-1",
    name: "Test Board",
    nameTh: null,
    icon: "▦",
    color: "#7C5CFF",
    ownerId: "user-1",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  members: [],
  projects: [
    {
      id: "proj-1",
      boardId: "board-1",
      name: "Test Project",
      nameTh: null,
      icon: "📁",
      color: "#3A86FF",
      type: "year_plan",
      position: 100,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      subProjects: [mockSub],
    },
  ],
};

describe("usePortfolioStore.patchSubProject", () => {
  beforeEach(() => {
    usePortfolioStore.setState({
      status: "ready",
      payload: mockPayload,
      errorMessage: null,
      _currentBoardId: "board-1",
    });
    vi.clearAllMocks();
  });

  it("applies optimistic patch immediately and replaces with server response", async () => {
    const updatedSub: SubProjectWithRelations = {
      ...mockSub,
      status: "uat",
      progress: 85,
    };

    vi.mocked(apiClient.put).mockResolvedValueOnce(updatedSub);

    await usePortfolioStore
      .getState()
      .patchSubProject("sp-1", { status: "uat" });

    const finalState = usePortfolioStore.getState();
    const finalSub = finalState.payload?.projects[0]?.subProjects[0];
    expect(finalSub?.status).toBe("uat");
    expect(finalSub?.progress).toBe(85);
  });

  it("rolls back to original on API error", async () => {
    vi.mocked(apiClient.put).mockRejectedValueOnce(
      new ApiClientError({ code: "INTERNAL_ERROR", message: "Server error", status: 500 })
    );

    await usePortfolioStore
      .getState()
      .patchSubProject("sp-1", { status: "uat" });

    const state = usePortfolioStore.getState();
    const sub = state.payload?.projects[0]?.subProjects[0];
    expect(sub?.status).toBe("dev");
  });
});
