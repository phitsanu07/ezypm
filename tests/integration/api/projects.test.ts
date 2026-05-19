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

const BOARD_ID = "bbbbbbbb-0000-0000-0000-000000000001";
const PROJECT_ID = "bbbbbbbb-0000-0000-0000-000000000002";
const USER_ID = "bbbbbbbb-0000-0000-0000-000000000003";

const PROFILE = {
  id: USER_ID,
  email: "anan@gridwork.dev",
  name: "Anan Saetang",
  name_th: "",
  role: "editor",
  status: "active",
  color: "#7C5CFF",
  initials: "AS",
  last_active_at: null,
  suspended_at: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const PROJECT_ROW = {
  id: PROJECT_ID,
  board_id: BOARD_ID,
  name: "Retail Platform",
  name_th: null,
  icon: "▦",
  color: "#7C5CFF",
  type: "year_plan",
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/projects", () => {
  it("returns 201 on successful project creation", async () => {
    stubAuth();

    sb.from.mockImplementation((table: string) => {
      if (table === "profiles") return makeChain({ data: PROFILE, error: null });
      if (table === "board_members") return makeChain({ data: { board_id: BOARD_ID }, error: null });
      if (table === "projects") {
        const chain = makeChain({ data: PROJECT_ROW, error: null });
        (chain["maybeSingle"] as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null }); // max position
        (chain["single"] as ReturnType<typeof vi.fn>).mockResolvedValue({ data: PROJECT_ROW, error: null }); // insert result
        return chain;
      }
      return makeChain({ data: null, error: null });
    });

    const res = await request(app)
      .post("/api/projects")
      .set("Authorization", "Bearer valid-tok")
      .send({ boardId: BOARD_ID, name: "Retail Platform" });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.name).toBe("Retail Platform");
  });

  it("returns 401 without token", async () => {
    const res = await request(app)
      .post("/api/projects")
      .send({ boardId: BOARD_ID, name: "Test" });

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });

  it("returns 403 for viewer role", async () => {
    stubAuth();
    const viewerProfile = { ...PROFILE, role: "viewer" };

    sb.from.mockImplementation((table: string) => {
      if (table === "profiles") return makeChain({ data: viewerProfile, error: null });
      return makeChain({ data: null, error: null });
    });

    const res = await request(app)
      .post("/api/projects")
      .set("Authorization", "Bearer valid-tok")
      .send({ boardId: BOARD_ID, name: "Test" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("returns 422 when boardId is missing", async () => {
    stubAuth();
    sb.from.mockImplementation((table: string) => {
      if (table === "profiles") return makeChain({ data: PROFILE, error: null });
      return makeChain({ data: null, error: null });
    });

    const res = await request(app)
      .post("/api/projects")
      .set("Authorization", "Bearer valid-tok")
      .send({ name: "No Board" });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});

describe("PUT /api/projects/:id", () => {
  it("returns 200 on successful update", async () => {
    stubAuth();
    const updatedRow = { ...PROJECT_ROW, name: "Updated Name" };

    sb.from.mockImplementation((table: string) => {
      if (table === "profiles") return makeChain({ data: PROFILE, error: null });
      if (table === "projects") {
        const chain = makeChain({ data: updatedRow, error: null });
        (chain["maybeSingle"] as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: PROJECT_ID, board_id: BOARD_ID }, error: null });
        (chain["single"] as ReturnType<typeof vi.fn>).mockResolvedValue({ data: updatedRow, error: null });
        return chain;
      }
      if (table === "board_members") return makeChain({ data: { board_id: BOARD_ID }, error: null });
      return makeChain({ data: null, error: null });
    });

    const res = await request(app)
      .put(`/api/projects/${PROJECT_ID}`)
      .set("Authorization", "Bearer valid-tok")
      .send({ name: "Updated Name" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("returns 404 when project not found", async () => {
    stubAuth();

    sb.from.mockImplementation((table: string) => {
      if (table === "profiles") return makeChain({ data: PROFILE, error: null });
      if (table === "projects") return makeChain({ data: null, error: null });
      return makeChain({ data: null, error: null });
    });

    const res = await request(app)
      .put(`/api/projects/${PROJECT_ID}`)
      .set("Authorization", "Bearer valid-tok")
      .send({ name: "Ghost" });

    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
  });

  it("returns 401 without token", async () => {
    const res = await request(app)
      .put(`/api/projects/${PROJECT_ID}`)
      .send({ name: "X" });

    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/projects/:id", () => {
  it("returns 200 on successful delete", async () => {
    stubAuth();

    sb.from.mockImplementation((table: string) => {
      if (table === "profiles") return makeChain({ data: PROFILE, error: null });
      if (table === "projects") return makeChain({ data: { id: PROJECT_ID, board_id: BOARD_ID }, error: null });
      if (table === "board_members") return makeChain({ data: { board_id: BOARD_ID }, error: null });
      return makeChain({ data: null, error: null });
    });

    const res = await request(app)
      .delete(`/api/projects/${PROJECT_ID}`)
      .set("Authorization", "Bearer valid-tok");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.id).toBe(PROJECT_ID);
  });

  it("returns 403 for non-member", async () => {
    stubAuth();

    sb.from.mockImplementation((table: string) => {
      if (table === "profiles") return makeChain({ data: PROFILE, error: null });
      if (table === "projects") return makeChain({ data: { id: PROJECT_ID, board_id: BOARD_ID }, error: null });
      if (table === "board_members") return makeChain({ data: null, error: null }); // not a member
      return makeChain({ data: null, error: null });
    });

    const res = await request(app)
      .delete(`/api/projects/${PROJECT_ID}`)
      .set("Authorization", "Bearer valid-tok");

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).delete(`/api/projects/${PROJECT_ID}`);
    expect(res.status).toBe(401);
  });
});
