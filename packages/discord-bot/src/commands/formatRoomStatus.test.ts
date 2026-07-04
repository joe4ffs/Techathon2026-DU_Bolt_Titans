import { describe, it, expect } from "vitest";
import { formatRoomStatus } from "./formatRoomStatus.js";
import { createInitialDevices } from "@office-monitor/shared-types";

describe("formatRoomStatus", () => {
  it("includes the room's display label", () => {
    const devices = createInitialDevices().filter((d) => d.room === "work1");
    const result = formatRoomStatus("work1", devices);
    expect(result).toContain("Work Room 1");
  });

  it("lists every device in the room with its state", () => {
    const devices = createInitialDevices().filter((d) => d.room === "work1");
    const result = formatRoomStatus("work1", devices);
    expect(result).toContain("Fan 1: OFF");
    expect(result).toContain("Fan 2: OFF");
    expect(result).toContain("Light 1: OFF");
    expect(result).toContain("Light 2: OFF");
    expect(result).toContain("Light 3: OFF");
  });

  it("reflects ON state correctly", () => {
    const devices = createInitialDevices()
      .filter((d) => d.room === "drawing")
      .map((d) => (d.id === "drawing-fan-1" ? { ...d, status: "on" as const } : d));
    const result = formatRoomStatus("drawing", devices);
    expect(result).toContain("Fan 1: ON");
  });
});
