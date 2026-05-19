import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// Mock supabaseAdmin before importing app so the module factory runs first
vi.mock("@/api/supabaseAdmin", () => ({
  supabaseAdmin: {
    auth: {
      signInWithPassword: vi.fn(),
      getUser: vi.fn(),
      admin: {
        signOut: vi.fn(),
      },
    },
    from: vi.fn(),
  },
}));

import { app } from "@/api/server";
import { supabaseAdmin } from "@/api/supabaseAdmin";

const sb = supabaseAdmin as unknown as {
  auth: {
    signInWithPassword: ReturnType<typeof vi.fn>;
    getUser: ReturnType<typeof vi.fn>;
    admin: { signOut: ReturnType<typeof vi.fn> };
  };
  from: ReturnType<typeof vi.fn>;
};

const ACTIVE_PROFILE = {
  id: "user-1",
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

function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "eq", "single", "maybeSingle", "insert", "update", "delete", "in", "order", "limit", "gte", "lte", "neq"];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  (chain["single"] as ReturnType<typeof vi.fn>).mockResolvedValue(result);
  (chain["maybeSingle"] as ReturnType<typeof vi.fn>).mockResolvedValue(result);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/login", () => {
  it("returns 200 with tokens on valid credentials", async () => {
    sb.auth.signInWithPassword.mockResolvedValue({
      data: {
        session: { access_token: "tok-access", refresh_token: "tok-refresh" },
        user: { id: "user-1" },
      },
      error: null,
    });

    const chain = makeChain({ data: ACTIVE_PROFILE, error: null });
    sb.from.mockReturnValue(chain);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "anan@gridwork.dev", password: "Seed1234!" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.accessToken).toBe("tok-access");
    expect(res.body.data.profile.email).toBe("anan@gridwork.dev");
  });

  it("returns 401 on invalid credentials", async () => {
    sb.auth.signInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: "Invalid login credentials" },
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "bad@example.com", password: "wrong" });

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("returns 403 on suspended user", async () => {
    sb.auth.signInWithPassword.mockResolvedValue({
      data: {
        session: { access_token: "tok", refresh_token: "ref" },
        user: { id: "user-sus" },
      },
      error: null,
    });

    const suspendedProfile = { ...ACTIVE_PROFILE, status: "suspended" };
    const chain = makeChain({ data: suspendedProfile, error: null });
    sb.from.mockReturnValue(chain);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "sus@example.com", password: "Seed1234!" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("USER_SUSPENDED");
  });

  it("returns 400 on missing body fields", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "not-an-email" });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});

describe("GET /api/auth/me", () => {
  function stubAuth() {
    sb.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
  }

  it("returns 200 with profile when authenticated", async () => {
    stubAuth();

    sb.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return makeChain({ data: ACTIVE_PROFILE, error: null });
      }
      if (table === "board_members") {
        const chain = makeChain({ data: [], error: null });
        (chain["select"] as ReturnType<typeof vi.fn>).mockReturnValue(chain);
        return chain;
      }
      return makeChain({ data: null, error: null });
    });

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.profile.id).toBe("user-1");
    expect(Array.isArray(res.body.data.boards)).toBe(true);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });
});

describe("POST /api/auth/logout", () => {
  it("returns 200 on successful logout", async () => {
    sb.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const chain = makeChain({ data: ACTIVE_PROFILE, error: null });
    sb.from.mockReturnValue(chain);
    sb.auth.admin.signOut.mockResolvedValue({ error: null });

    const res = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(401);
  });
});
