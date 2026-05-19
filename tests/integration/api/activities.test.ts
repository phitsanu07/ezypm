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

const BOARD_ID = "dddddddd-0000-0000-0000-000000000001";
const PROJECT_ID = "dddddddd-0000-0000-0000-000000000002";
const SUB_ID = "dddddddd-0000-0000-0000-000000000003";
const ACTIVITY_ID = "dddddddd-0000-0000-0000-000000000004";
const USER_ID = "dddddddd-0000-0000-0000-000000000005";
const OTHER_USER_ID = "dddddddd-0000-0000-0000-000000000006";

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

const ACTIVITY_ROW = {
  id: ACTIVITY_ID,
  sub_project_id: SUB_ID,
  author_id: USER_ID,
  type: "meeting",
  title: "Sprint review",
  body: "We reviewed sprint goals.",
  occurs_at: "2026-05-10T10:00:00.000Z",
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

function stubAuth(userId = USER_ID) {
  sb.auth.getUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  });
}

// Standard mock for board-membership chain:
// profiles → sub_projects → projects → board_members
function stubBoardMemberAccess(profileOverride = PROFILE) {
  stubAuth(profileOverride.id);
  sb.from.mockImplementation((table: string) => {
    if (table === "profiles") return makeChain({ data: profileOverride, error: null });
    if (table === "sub_projects") return makeChain({ data: { id: SUB_ID, project_id: PROJECT_ID }, error: null });
    if (table === "projects") return makeChain({ data: { board_id: BOARD_ID }, error: null });
    if (table === "board_members") return makeChain({ data: { board_id: BOARD_ID }, error: null });
    if (table === "activities") return makeChain({ data: ACTIVITY_ROW, error: null });
    return makeChain({ data: null, error: null });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/sub-projects/:id/activities", () => {
  it("returns 200 with activities list", async () => {
    stubBoardMemberAccess();

    sb.from.mockImplementation((table: string) => {
      if (table === "profiles") return makeChain({ data: PROFILE, error: null });
      if (table === "sub_projects") return makeChain({ data: { id: SUB_ID, project_id: PROJECT_ID }, error: null });
      if (table === "projects") return makeChain({ data: { board_id: BOARD_ID }, error: null });
      if (table === "board_members") return makeChain({ data: { board_id: BOARD_ID }, error: null });
      if (table === "activities") {
        const chain = makeChain({ data: [ACTIVITY_ROW], error: null });
        (chain as unknown as Promise<unknown>).then = (res: unknown, rej: unknown) =>
          Promise.resolve({ data: [ACTIVITY_ROW], error: null }).then(res as never, rej as never);
        return chain;
      }
      return makeChain({ data: null, error: null });
    });

    const res = await request(app)
      .get(`/api/sub-projects/${SUB_ID}/activities`)
      .set("Authorization", "Bearer valid-tok");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("returns 401 without token", async () => {
    const res = await request(app)
      .get(`/api/sub-projects/${SUB_ID}/activities`);

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
      .get(`/api/sub-projects/ghost-sub/activities`)
      .set("Authorization", "Bearer valid-tok");

    expect(res.status).toBe(404);
  });
});

describe("POST /api/activities", () => {
  it("returns 201 on successful creation", async () => {
    stubBoardMemberAccess();

    sb.from.mockImplementation((table: string) => {
      if (table === "profiles") return makeChain({ data: PROFILE, error: null });
      if (table === "sub_projects") return makeChain({ data: { id: SUB_ID, project_id: PROJECT_ID }, error: null });
      if (table === "projects") return makeChain({ data: { board_id: BOARD_ID }, error: null });
      if (table === "board_members") return makeChain({ data: { board_id: BOARD_ID }, error: null });
      if (table === "activities") return makeChain({ data: ACTIVITY_ROW, error: null });
      return makeChain({ data: null, error: null });
    });

    const res = await request(app)
      .post("/api/activities")
      .set("Authorization", "Bearer valid-tok")
      .send({
        subProjectId: SUB_ID,
        type: "meeting",
        title: "Sprint review",
        occursAt: "2026-05-10T10:00:00.000Z",
      });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.type).toBe("meeting");
  });

  it("returns 401 without token", async () => {
    const res = await request(app)
      .post("/api/activities")
      .send({ subProjectId: SUB_ID, type: "meeting", title: "X", occursAt: "2026-05-10T10:00:00.000Z" });

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
      .post("/api/activities")
      .set("Authorization", "Bearer valid-tok")
      .send({ subProjectId: SUB_ID, type: "note", title: "Note", occursAt: "2026-05-10T10:00:00.000Z" });

    expect(res.status).toBe(403);
  });

  it("returns 400 on invalid type", async () => {
    stubAuth();
    sb.from.mockImplementation((table: string) => {
      if (table === "profiles") return makeChain({ data: PROFILE, error: null });
      return makeChain({ data: null, error: null });
    });

    const res = await request(app)
      .post("/api/activities")
      .set("Authorization", "Bearer valid-tok")
      .send({ subProjectId: SUB_ID, type: "invalid-type", title: "X", occursAt: "2026-05-10T10:00:00.000Z" });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});

describe("PUT /api/activities/:id (author-only enforcement)", () => {
  it("returns 200 when author edits their activity", async () => {
    stubAuth(USER_ID);
    const updatedActivity = { ...ACTIVITY_ROW, title: "Updated title" };

    sb.from.mockImplementation((table: string) => {
      if (table === "profiles") return makeChain({ data: PROFILE, error: null });
      if (table === "activities") {
        const chain = makeChain({ data: updatedActivity, error: null });
        (chain["maybeSingle"] as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { author_id: USER_ID }, error: null });
        (chain["single"] as ReturnType<typeof vi.fn>).mockResolvedValue({ data: updatedActivity, error: null });
        return chain;
      }
      return makeChain({ data: null, error: null });
    });

    const res = await request(app)
      .put(`/api/activities/${ACTIVITY_ID}`)
      .set("Authorization", "Bearer valid-tok")
      .send({ title: "Updated title" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("returns 403 when non-author tries to edit", async () => {
    const otherProfile = { ...PROFILE, id: OTHER_USER_ID, email: "other@gridwork.dev" };
    stubAuth(OTHER_USER_ID);

    sb.from.mockImplementation((table: string) => {
      if (table === "profiles") return makeChain({ data: otherProfile, error: null });
      if (table === "activities") {
        const chain = makeChain({ data: { author_id: USER_ID }, error: null });
        (chain["maybeSingle"] as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { author_id: USER_ID }, error: null });
        return chain;
      }
      return makeChain({ data: null, error: null });
    });

    const res = await request(app)
      .put(`/api/activities/${ACTIVITY_ID}`)
      .set("Authorization", "Bearer valid-tok")
      .send({ title: "Hacked title" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("returns 401 without token", async () => {
    const res = await request(app)
      .put(`/api/activities/${ACTIVITY_ID}`)
      .send({ title: "X" });

    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/activities/:id", () => {
  it("returns 200 when author deletes their activity", async () => {
    stubAuth(USER_ID);

    sb.from.mockImplementation((table: string) => {
      if (table === "profiles") return makeChain({ data: PROFILE, error: null });
      if (table === "activities") {
        const chain = makeChain({ data: { id: ACTIVITY_ID }, error: null });
        (chain["maybeSingle"] as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { author_id: USER_ID }, error: null });
        return chain;
      }
      return makeChain({ data: null, error: null });
    });

    const res = await request(app)
      .delete(`/api/activities/${ACTIVITY_ID}`)
      .set("Authorization", "Bearer valid-tok");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("returns 200 when admin deletes any activity (admin override)", async () => {
    const adminProfile = { ...PROFILE, id: OTHER_USER_ID, role: "admin", email: "admin@gridwork.dev" };
    stubAuth(OTHER_USER_ID);

    sb.from.mockImplementation((table: string) => {
      if (table === "profiles") return makeChain({ data: adminProfile, error: null });
      if (table === "activities") return makeChain({ data: { id: ACTIVITY_ID }, error: null });
      return makeChain({ data: null, error: null });
    });

    const res = await request(app)
      .delete(`/api/activities/${ACTIVITY_ID}`)
      .set("Authorization", "Bearer valid-tok");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("returns 403 when non-author, non-admin tries to delete", async () => {
    const editorProfile = { ...PROFILE, id: OTHER_USER_ID, role: "editor", email: "other@gridwork.dev" };
    stubAuth(OTHER_USER_ID);

    sb.from.mockImplementation((table: string) => {
      if (table === "profiles") return makeChain({ data: editorProfile, error: null });
      if (table === "activities") {
        const chain = makeChain({ data: { author_id: USER_ID }, error: null });
        (chain["maybeSingle"] as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { author_id: USER_ID }, error: null });
        return chain;
      }
      return makeChain({ data: null, error: null });
    });

    const res = await request(app)
      .delete(`/api/activities/${ACTIVITY_ID}`)
      .set("Authorization", "Bearer valid-tok");

    expect(res.status).toBe(403);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).delete(`/api/activities/${ACTIVITY_ID}`);
    expect(res.status).toBe(401);
  });
});
