import { describe, it, expect } from "vitest";
import { resolveRoom } from "./resolveRoom.js";

describe("resolveRoom", () => {
  it("resolves exact ids", () => {
    expect(resolveRoom("drawing")).toBe("drawing");
    expect(resolveRoom("work1")).toBe("work1");
    expect(resolveRoom("work2")).toBe("work2");
  });

  it("is case-insensitive", () => {
    expect(resolveRoom("DRAWING")).toBe("drawing");
    expect(resolveRoom("Work1")).toBe("work1");
  });

  it("ignores surrounding whitespace", () => {
    expect(resolveRoom("  work1  ")).toBe("work1");
  });

  it("resolves natural-language variants with spaces or hyphens", () => {
    expect(resolveRoom("Work Room 1")).toBe("work1");
    expect(resolveRoom("work-room-2")).toBe("work2");
    expect(resolveRoom("drawing room")).toBe("drawing");
  });

  it("returns null for an unrecognized room", () => {
    expect(resolveRoom("basement")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(resolveRoom("")).toBeNull();
  });
});
