import { describe, it, expect } from "vitest";
import { formatStatus } from "./formatStatus.js";
import { createInitialDevices } from "@office-monitor/shared-types";
import type { Device } from "@office-monitor/shared-types";

function withOn(ids: string[]): Device[] {
  return createInitialDevices("2026-01-01T00:00:00.000Z").map((d) =>
    ids.includes(d.id) ? { ...d, status: "on" as const } : d
  );
}

describe("formatStatus", () => {
  it("reports all rooms off when nothing is on", () => {
    const result = formatStatus(createInitialDevices());
    expect(result).toBe(
      "Drawing Room: all off. Work Room 1: all off. Work Room 2: all off."
    );
  });

  it("matches the spec's example output format for mixed state", () => {
    const devices = withOn([
      "drawing-fan-1",
      "drawing-light-1",
      "drawing-light-2",
      "work2-fan-1",
      "work2-fan-2",
      "work2-light-1",
      "work2-light-2",
      "work2-light-3",
    ]);
    const result = formatStatus(devices);
    expect(result).toBe(
      "Drawing Room: 1 fan ON, 2 lights ON. Work Room 1: all off. Work Room 2: 2 fans ON, 3 lights ON."
    );
  });

  it("uses singular wording for exactly one fan or light", () => {
    const devices = withOn(["drawing-fan-1"]);
    const result = formatStatus(devices);
    expect(result).toContain("1 fan ON");
    expect(result).not.toContain("1 fans");
  });

  it("uses plural wording for more than one", () => {
    const devices = withOn(["drawing-fan-1", "drawing-fan-2"]);
    const result = formatStatus(devices);
    expect(result).toContain("2 fans ON");
  });
});
