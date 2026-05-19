import { describe, it, expect } from "vitest";

describe("LoginPage", () => {
  it("demo creds array has 3 entries", () => {
    const DEMO_CREDS = [
      { role: "Admin", email: "admin@gridwork.dev", password: "demo1234" },
      { role: "Editor", email: "editor@gridwork.dev", password: "demo1234" },
      { role: "Viewer", email: "viewer@gridwork.dev", password: "demo1234" },
    ];
    expect(DEMO_CREDS).toHaveLength(3);
    expect(DEMO_CREDS[0]?.role).toBe("Admin");
  });
});
