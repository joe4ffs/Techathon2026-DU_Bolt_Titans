import { describe, it, expect } from "vitest";
import { formatUsage } from "./formatUsage.js";

describe("formatUsage", () => {
  it("matches the spec's example output format", () => {
    const result = formatUsage({
      totalWattsNow: 740,
      perRoomWatts: { drawing: 0, work1: 0, work2: 0 },
      estimatedKwhToday: 4.2,
    });
    expect(result).toBe(
      "Total power right now: 740W. Today's estimated usage: 4.2 kWh."
    );
  });

  it("rounds kWh to 1 decimal place", () => {
    const result = formatUsage({
      totalWattsNow: 100,
      perRoomWatts: { drawing: 0, work1: 0, work2: 0 },
      estimatedKwhToday: 1.2345,
    });
    expect(result).toContain("1.2 kWh");
  });

  it("handles zero usage without throwing", () => {
    const result = formatUsage({
      totalWattsNow: 0,
      perRoomWatts: { drawing: 0, work1: 0, work2: 0 },
      estimatedKwhToday: 0,
    });
    expect(result).toBe(
      "Total power right now: 0W. Today's estimated usage: 0.0 kWh."
    );
  });
});
