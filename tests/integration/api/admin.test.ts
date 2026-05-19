import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("@/api/supabaseAdmin", () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn(),
      admin: {
        createUser: vi.fn(),
        deleteUser: vi.fn(),
        listUsers: vi.fn(),
      },
    },
    from: vi.fn(),
  },
}));

import { app } from "@/api/server";
import { supabaseAdmin } from "@/api/supabaseAdmin";

const sb = supabaseAdmin as unknown as {
  auth: {
    getUser: ReturnType<typeof vi.fn>;
    admin: {
      createUser: ReturnType<typeof vi.fn>;
      deleteUser: ReturnType<typeof vi.fn>;
      listUsers: ReturnType<typeof vi.fn>;
    };
  };
  from: ReturnType<typeof vi.fn>;
};

const ADMIN_ID = "eeeeeeee-0000-0000-0000-000000000001";
const EDITOR_ID = "eeeeeeee-0000-0000-0000-000000000002";
const TARGET_USER_ID = "eeeeeeee-0000-0000-0000-000000000003";

const ADMIN_PROFILE = {
  id: ADMIN_ID,
  email: "anan@gridwork.dev",
  name: "Anan Saetang",
  name_th: "อนันต์",
  role: "admin",
  status: "active",
  color: "#7C5CFF",
  initials: "AS",
  last_active_at: null,
  suspended_at: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const EDITOR_PROFILE = {
  ...ADMIN_PROFILE,
  id: EDITOR_ID,
  role: "editor",
  email: "editor@gridwork.dev",
  initials: "ED",
};

const NEW_USER_PROFILE = {
  ...ADMIN_PROFILE,
  id: TARGET_USER_ID,
  email: "newuser@gridwork.dev",
  name: "New User",
  role: "editor",
  status: "invited",
  initials: "NU",
};

const SUSPENDED_PROFILE = {
  ...ADMIN_PROFILE,
  id: TARGET_USER_ID,
  email: "sus@gridwork.dev",
  name: "Sus User",
  role: "editor",
  status: "suspended",
  suspended_at: "2026-05-01T00:00:00.000Z",
  initials: "SU",
};

function makeChain(resolved: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of [
    "select", "eq", "single", "maybeSingle", "insert", "update", "delete",
    "upsert", "or", "ilike", "in", "order", "limit", "gte", "lte", "neq",
  ]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain["single"]!.mockResolvedValue(resolved);
  chain["maybeSingle"]!.mockResolvedValue(resolved);
  (chain as unknown as Promise<unknown>).then = (res: unknown, rej: unknown) =>
    Promise.resolve(resolved).then(res as never, rej as never);
  return chain;
}

function stubAuth(userId: string, profile: typeof ADMIN_PROFILE) {
  sb.auth.getUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  });
  sb.from.mockImplementation((table: string) => {
    if (table === "profiles") return makeChain({ data: profile, error: null });
    return makeChain({ data: null, error: null });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/admin/users (invite user)", () => {
  it("returns 201 with new profile on successful invite", async () => {
    stubAuth(ADMIN_ID, ADMIN_PROFILE);

    sb.auth.admin.createUser.mockResolvedValue({
      data: { user: { id: TARGET_USER_ID } },
      error: null,
    });

    // Sequence of profiles queries during invite:
    //   1. requireAuth → ADMIN_PROFILE via .single()
    //   2. invite duplicate check via .or() → empty list
    //   3. invite upsert → NEW_USER_PROFILE via .single()
    let profileCallCount = 0;
    sb.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        profileCallCount++;
        if (profileCallCount === 1) {
          return makeChain({ data: ADMIN_PROFILE, error: null });
        }
        if (profileCallCount === 2) {
          return makeChain({ data: [], error: null });
        }
        return makeChain({ data: NEW_USER_PROFILE, error: null });
      }
      return makeChain({ data: null, error: null });
    });

    const res = await request(app)
      .post("/api/admin/users")
      .set("Authorization", "Bearer admin-token")
      .send({
        email: "newuser@gridwork.dev",
        name: "New User",
        role: "editor",
        password: "Secure1234!",
      });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.email).toBe("newuser@gridwork.dev");
  });

  it("returns 403 for non-admin user", async () => {
    stubAuth(EDITOR_ID, EDITOR_PROFILE);

    const res = await request(app)
      .post("/api/admin/users")
      .set("Authorization", "Bearer editor-token")
      .send({
        email: "newuser@gridwork.dev",
        name: "New User",
        role: "editor",
        password: "Secure1234!",
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("returns 401 without token", async () => {
    const res = await request(app)
      .post("/api/admin/users")
      .send({ email: "x@x.com", name: "X", role: "editor", password: "Secure1234!" });

    expect(res.status).toBe(401);
  });

  it("returns 400 on missing required fields", async () => {
    stubAuth(ADMIN_ID, ADMIN_PROFILE);

    const res = await request(app)
      .post("/api/admin/users")
      .set("Authorization", "Bearer admin-token")
      .send({ email: "newuser@gridwork.dev" }); // missing name, role, password

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("returns 409 on duplicate email", async () => {
    stubAuth(ADMIN_ID, ADMIN_PROFILE);

    // Sequence:
    //   1. requireAuth → ADMIN_PROFILE
    //   2. invite duplicate check via .or() → existing match
    //      → throws EMAIL_TAKEN (createUser never called)
    let profileCallCount = 0;
    sb.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        profileCallCount++;
        if (profileCallCount === 1) {
          return makeChain({ data: ADMIN_PROFILE, error: null });
        }
        return makeChain({
          data: [
            {
              id: "existing-user-id",
              email: "anan@gridwork.dev",
              name: "Anan",
              status: "active",
              created_at: "2026-01-01T00:00:00.000Z",
            },
          ],
          error: null,
        });
      }
      return makeChain({ data: null, error: null });
    });

    const res = await request(app)
      .post("/api/admin/users")
      .set("Authorization", "Bearer admin-token")
      .send({
        email: "anan@gridwork.dev",
        name: "Anan Copy",
        role: "editor",
        password: "Secure1234!",
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_TAKEN");
  });
});

describe("PUT /api/admin/users/:id (suspend / reactivate)", () => {
  it("returns 200 on successful status update (suspend)", async () => {
    stubAuth(ADMIN_ID, ADMIN_PROFILE);

    let profileCallCount = 0;
    sb.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        profileCallCount++;
        if (profileCallCount === 1) return makeChain({ data: ADMIN_PROFILE, error: null });
        if (profileCallCount === 2) return makeChain({ data: { id: TARGET_USER_ID, status: "active" }, error: null }); // existing check
        return makeChain({ data: SUSPENDED_PROFILE, error: null }); // update result
      }
      return makeChain({ data: null, error: null });
    });

    const res = await request(app)
      .put(`/api/admin/users/${TARGET_USER_ID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ status: "suspended" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.status).toBe("suspended");
  });

  it("returns 200 on reactivate", async () => {
    stubAuth(ADMIN_ID, ADMIN_PROFILE);

    let profileCallCount = 0;
    sb.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        profileCallCount++;
        if (profileCallCount === 1) return makeChain({ data: ADMIN_PROFILE, error: null });
        if (profileCallCount === 2) return makeChain({ data: { id: TARGET_USER_ID, status: "suspended" }, error: null });
        return makeChain({ data: { ...SUSPENDED_PROFILE, status: "active", suspended_at: null }, error: null });
      }
      return makeChain({ data: null, error: null });
    });

    const res = await request(app)
      .put(`/api/admin/users/${TARGET_USER_ID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ status: "active" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("active");
  });

  it("returns 403 for non-admin", async () => {
    stubAuth(EDITOR_ID, EDITOR_PROFILE);

    const res = await request(app)
      .put(`/api/admin/users/${TARGET_USER_ID}`)
      .set("Authorization", "Bearer editor-token")
      .send({ status: "suspended" });

    expect(res.status).toBe(403);
  });

  it("returns 404 when target user not found", async () => {
    stubAuth(ADMIN_ID, ADMIN_PROFILE);

    let profileCallCount = 0;
    sb.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        profileCallCount++;
        if (profileCallCount === 1) return makeChain({ data: ADMIN_PROFILE, error: null });
        return makeChain({ data: null, error: null }); // user not found
      }
      return makeChain({ data: null, error: null });
    });

    const res = await request(app)
      .put(`/api/admin/users/ghost-user`)
      .set("Authorization", "Bearer admin-token")
      .send({ status: "suspended" });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("USER_NOT_FOUND");
  });

  it("returns 401 without token", async () => {
    const res = await request(app)
      .put(`/api/admin/users/${TARGET_USER_ID}`)
      .send({ status: "suspended" });

    expect(res.status).toBe(401);
  });
});

describe("POST /api/admin/boards (create board)", () => {
  it("returns 201 on successful board creation", async () => {
    const BOARD_ROW = {
      id: "board-new",
      name: "New Board",
      name_th: null,
      icon: "▦",
      color: "#7C5CFF",
      owner_id: ADMIN_ID,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };

    let profileCallCount = 0;
    sb.auth.getUser.mockResolvedValue({ data: { user: { id: ADMIN_ID } }, error: null });
    sb.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        profileCallCount++;
        if (profileCallCount === 1) return makeChain({ data: ADMIN_PROFILE, error: null });
        return makeChain({ data: ADMIN_PROFILE, error: null });
      }
      if (table === "boards") return makeChain({ data: BOARD_ROW, error: null });
      if (table === "board_members") return makeChain({ data: null, error: null });
      return makeChain({ data: null, error: null });
    });

    const res = await request(app)
      .post("/api/admin/boards")
      .set("Authorization", "Bearer admin-token")
      .send({ name: "New Board" });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.name).toBe("New Board");
  });

  it("returns 403 for non-admin", async () => {
    stubAuth(EDITOR_ID, EDITOR_PROFILE);

    const res = await request(app)
      .post("/api/admin/boards")
      .set("Authorization", "Bearer editor-token")
      .send({ name: "Board" });

    expect(res.status).toBe(403);
  });

  it("returns 400 on missing name", async () => {
    stubAuth(ADMIN_ID, ADMIN_PROFILE);

    const res = await request(app)
      .post("/api/admin/boards")
      .set("Authorization", "Bearer admin-token")
      .send({});

    expect(res.status).toBe(400);
  });
});
