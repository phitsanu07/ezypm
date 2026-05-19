import { describe, it, expect } from "vitest";
import { STATUS_OPTIONS } from "@/types";

describe("StatusCell options", () => {
  it("has 6 status options with correct shape", () => {
    expect(STATUS_OPTIONS).toHaveLength(6);
    for (const opt of STATUS_OPTIONS) {
      expect(opt).toHaveProperty("id");
      expect(opt).toHaveProperty("label");
      expect(opt).toHaveProperty("labelTh");
      expect(opt).toHaveProperty("dot");
      expect(opt).toHaveProperty("bg");
      expect(opt).toHaveProperty("fg");
    }
  });

  it("includes go_live with correct bg color", () => {
    const goLive = STATUS_OPTIONS.find((o) => o.id === "go_live");
    expect(goLive?.bg).toBe("#D7F1E3");
    expect(goLive?.label).toBe("Go Live");
  });
});
