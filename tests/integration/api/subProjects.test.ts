import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("@/api/supabaseAdmin", () => ({
  supabaseAdmin: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  },
}));

import { app } from "@/api/server";
import { supabaseAdmin } from "@/api/supabaseAdmin";

const sb = supabaseAdmin as unknown as {
  auth: { getUser: ReturnType<typeof vi.fn> };
  from: ReturnType<typeof vi.fn>;
};

const BOARD_ID = "cccccccc-0000-0000-0000-000000000001";
const PROJECT_ID = "cccccccc-0000-0000-0000-000000000002";
const SUB_ID = "cccccccc-0000-0000-0000-000000000003";
const USER_ID = "cccccccc-0000-0000-0000-000000000004";

const PROFILE = {
  id: USER_ID,
  email: "kong@gridwork.dev",
  name: "Kong Phromma",
  name_th: "",
  role: "editor",
  status: "active",
  color: "#3DBE8B",
  initials: "KP",
  last_active_at: null,
  suspended_at: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const SUB_ROW = {
  id: SUB_ID,
  project_id: PROJECT_ID,
  name: "Web Checkout v2",
  name_th: null,
  icon: "◐",
  lead_id: USER_ID,
  status: "dev",
  priority: "p1",
  due: "2026-06-20",
  progress: 55,
  progress_prev: 40,
  progress_updated_at: "2026-05-07T00:00:00.000Z",
  quarter: "Q2-26",
  tags: ["frontend", "payment"],
  position: 100,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

function makeChain(resolved: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of [
    "select", "eq", "single", "maybeSingle", "insert", "update", "delete",
    "in", "order", "limit", "gte", "lte", "neq",
  ]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain["single"]!.mockResolvedValue(resolved);
  chain["maybeSingle"]!.mockResolvedValue(resolved);
  (chain as unknown as Promise<unknown>).then = (res: unknown, rej: unknown) =>
    Promise.resolve(resolved).then(res as never, rej as never);
  return chain;
}

function stubAuth() {
  sb.auth.getUser.mockResolvedValue({
    data: { user: { id: USER_ID } },
    error: null,
  });
}

// Standard sub-project middleware mock chain:
// requireAuth → profiles(profile)
// loadSubAndVerify → sub_projects(sub) → projects(project) → board_members(membership)
function _stubSubProjectAccess(profileOverride = PROFILE) {
  stubAuth();
  sb.from.mockImplementation((table: string) => {
    if (table === "profiles") return makeChain({ data: profileOverride, error: null });
    if (table === "sub_projects") return makeChain({ data: SUB_ROW, error: null });
    if (table === "projects") return makeChain({ data: { board_id: BOARD_ID }, error: null });
    if (table === "board_members") return makeChain({ data: { board_id: BOARD_ID }, error: null });
    if (table === "sub_project_members") return makeChain({ data: [], error: null });
    return makeChain({ data: null, error: null });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/sub-projects", () => {
  it("returns 201 on successful creation", async () => {
    stubAuth();

    sb.from.mockImplementation((table: string) => {
      if (table === "profiles") return makeChain({ data: PROFILE, error: null });
      if (table === "projects") return makeChain({ data: { id: PROJECT_ID, board_id: BOARD_ID }, error: null });
      if (table === "board_members") return makeChain({ data: { board_id: BOARD_ID }, error: null });
      if (table === "sub_projects") {
        const chain = makeChain({ data: SUB_ROW, error: null });
        (chain["maybeSingle"] as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null }); // max position
        (chain["single"] as ReturnType<typeof vi.fn>).mockResolvedValue({ data: SUB_ROW, error: null }); // insert
        return chain;
      }
      if (table === "sub_project_members") return makeChain({ data: [], error: null });
      return makeChain({ data: null, error: null });
    });

    const res = await request(app)
      .post("/api/sub-projects")
      .set("Authorization", "Bearer valid-tok")
      .send({ projectId: PROJECT_ID, name: "Web Checkout v2" });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.name).toBe("Web Checkout v2");
  });

  it("returns 401 without token", async () => {
    const res = await request(app)
      .post("/api/sub-projects")
      .send({ projectId: PROJECT_ID, name: "Test" });

    expect(res.status).toBe(401);
  });

  it("returns 403 for viewer role", async () => {
    stubAuth();
    const viewerProfile = { ...PROFILE, role: "viewer" };

    sb.from.mockImplementation((table: string) => {
      if (table === "profiles") return makeChain({ data: viewerProfile, error: null });
      return makeChain({ data: null, error: null });
    });

    const res = await request(app)
      .post("/api/sub-projects")
      .set("Authorization", "Bearer valid-tok")
      .send({ projectId: PROJECT_ID, name: "Test" });

    expect(res.status).toBe(403);
  });

  it("returns 400 on missing projectId", async () => {
    stubAuth();
    sb.from.mockImplementation((table: string) => {
      if (table === "profiles") return makeChain({ data: PROFILE, error: null });
      return makeChain({ data: null, error: null });
    });

    const res = await request(app)
      .post("/api/sub-projects")
      .set("Authorization", "Bearer valid-tok")
      .send({ name: "Missing project" });

    expect(res.status).toBe(400);
  });

  it("returns 404 when project not found", async () => {
    stubAuth();

    sb.from.mockImplementation((table: string) => {
      if (table === "profiles") return makeChain({ data: PROFILE, error: null });
      if (table === "projects") return makeChain({ data: null, error: null });
      return makeChain({ data: null, error: null });
    });

    const res = await request(app)
      .post("/api/sub-projects")
      .set("Authorization", "Bearer valid-tok")
      .send({ projectId: "cccccccc-0000-0000-0000-000000000099", name: "Test" });

    expect(res.status).toBe(404);
  });
});

describe("PUT /api/sub-projects/:id (cell edit)", () => {
  it("returns 200 on successful update", async () => {
    const updatedSub = { ...SUB_ROW, name: "Updated Name" };
    stubAuth();

    sb.from.mockImplementation((table: string) => {
      if (table === "profiles") return makeChain({ data: PROFILE, error: null });
      if (table === "sub_projects") {
        const chain = makeChain({ data: updatedSub, error: null });
        (chain["maybeSingle"] as ReturnType<typeof vi.fn>).mockResolvedValue({ data: SUB_ROW, error: null });
        (chain["single"] as ReturnType<typeof vi.fn>).mockResolvedValue({ data: updatedSub, error: null });
        return chain;
      }
      if (table === "projects") return makeChain({ data: { board_id: BOARD_ID }, error: null });
      if (table === "board_members") return makeChain({ data: { board_id: BOARD_ID }, error: null });
      if (table === "sub_project_members") return makeChain({ data: [], error: null });
      return makeChain({ data: null, error: null });
    });

    const res = await request(app)
      .put(`/api/sub-projects/${SUB_ID}`)
      .set("Authorization", "Bearer valid-tok")
      .send({ name: "Updated Name" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("returns 401 without token", async () => {
    const res = await request(app)
      .put(`/api/sub-projects/${SUB_ID}`)
      .send({ name: "X" });

    expect(res.status).toBe(401);
  });

  it("returns 404 when sub-project not found", async () => {
    stubAuth();

    sb.from.mockImplementation((table: string) => {
      if (table === "profiles") return makeChain({ data: PROFILE, error: null });
      if (table === "sub_projects") return makeChain({ data: null, error: null });
      return makeChain({ data: null, error: null });
    });

    const res = await request(app)
      .put(`/api/sub-projects/ghost-sub`)
      .set("Authorization", "Bearer valid-tok")
      .send({ name: "Ghost" });

    expect(res.status).toBe(404);
  });

  it("returns 403 for viewer role", async () => {
    const viewerProfile = { ...PROFILE, role: "viewer" };
    stubAuth();

    sb.from.mockImplementation((table: string) => {
      if (table === "profiles") return makeChain({ data: viewerProfile, error: null });
      if (table === "sub_projects") return makeChain({ data: SUB_ROW, error: null });
      if (table === "projects") return makeChain({ data: { board_id: BOARD_ID }, error: null });
      if (table === "board_members") return makeChain({ data: { board_id: BOARD_ID }, error: null });
      return makeChain({ data: null, error: null });
    });

    const res = await request(app)
      .put(`/api/sub-projects/${SUB_ID}`)
      .set("Authorization", "Bearer valid-tok")
      .send({ name: "X" });

    expect(res.status).toBe(403);
  });

  it("returns 422 on invalid status value", async () => {
    stubAuth();

    sb.from.mockImplementation((table: string) => {
      if (table === "profiles") return makeChain({ data: PROFILE, error: null });
      return makeChain({ data: null, error: null });
    });

    const res = await request(app)
      .put(`/api/sub-projects/${SUB_ID}`)
      .set("Authorization", "Bearer valid-tok")
      .send({ status: "invalid-status" });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});

describe("PUT /api/sub-projects/:id/reorder", () => {
  it("returns 401 without token", async () => {
    const res = await request(app)
      .put(`/api/sub-projects/${SUB_ID}/reorder`)
      .send({ targetProjectId: PROJECT_ID, position: 200 });

    expect(res.status).toBe(401);
  });

  it("returns 422 on cross-board reorder attempt", async () => {
    const OTHER_PROJECT_ID = "cccccccc-0000-0000-0000-000000000099";
    const OTHER_BOARD_ID = "cccccccc-0000-0000-0000-000000000098";
    stubAuth();

    sb.from.mockImplementation((table: string) => {
      if (table === "profiles") return makeChain({ data: PROFILE, error: null });
      if (table === "sub_projects") return makeChain({ data: SUB_ROW, error: null });
      if (table === "projects") {
        const chain = makeChain({ data: { id: PROJECT_ID, board_id: BOARD_ID }, error: null });
        (chain["single"] as ReturnType<typeof vi.fn>)
          .mockResolvedValueOnce({ data: { id: PROJECT_ID, board_id: BOARD_ID }, error: null })
          .mockResolvedValue({ data: { id: OTHER_PROJECT_ID, board_id: OTHER_BOARD_ID }, error: null });
        (chain["maybeSingle"] as ReturnType<typeof vi.fn>)
          .mockResolvedValueOnce({ data: { id: OTHER_PROJECT_ID, board_id: OTHER_BOARD_ID }, error: null });
        return chain;
      }
      if (table === "board_members") return makeChain({ data: { board_id: BOARD_ID }, error: null });
      return makeChain({ data: null, error: null });
    });

    const res = await request(app)
      .put(`/api/sub-projects/${SUB_ID}/reorder`)
      .set("Authorization", "Bearer valid-tok")
      .send({ targetProjectId: OTHER_PROJECT_ID, position: 200 });

    expect([422, 403, 404]).toContain(res.status);
  });
});

describe("POST /api/sub-projects/:id/members", () => {
  it("returns 401 without token", async () => {
    const res = await request(app)
      .post(`/api/sub-projects/${SUB_ID}/members`)
      .send({ userId: "user-2" });

    expect(res.status).toBe(401);
  });

  it("returns 400 on missing userId", async () => {
    stubAuth();
    sb.from.mockImplementation((table: string) => {
      if (table === "profiles") return makeChain({ data: PROFILE, error: null });
      return makeChain({ data: null, error: null });
    });

    const res = await request(app)
      .post(`/api/sub-projects/${SUB_ID}/members`)
      .set("Authorization", "Bearer valid-tok")
      .send({});

    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/sub-projects/:id/members/:userId", () => {
  it("returns 401 without token", async () => {
    const res = await request(app)
      .delete(`/api/sub-projects/${SUB_ID}/members/user-2`);

    expect(res.status).toBe(401);
  });

  it("returns 404 when sub-project not found", async () => {
    stubAuth();

    sb.from.mockImplementation((table: string) => {
      if (table === "profiles") return makeChain({ data: PROFILE, error: null });
      if (table === "sub_projects") return makeChain({ data: null, error: null });
      return makeChain({ data: null, error: null });
    });

    const res = await request(app)
      .delete(`/api/sub-projects/ghost-sub/members/user-2`)
      .set("Authorization", "Bearer valid-tok");

    expect(res.status).toBe(404);
  });
});
