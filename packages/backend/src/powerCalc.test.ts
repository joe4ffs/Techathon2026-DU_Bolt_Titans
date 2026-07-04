import { describe, it, expect } from "vitest";
import { calculateWattage, UsageAccumulator } from "./powerCalc.js";
import { createInitialDevices } from "@office-monitor/shared-types";
import type { Clock } from "./clock.js";

function withStatuses(onIds: string[]) {
  return createInitialDevices("2026-01-01T00:00:00.000Z").map((d) =>
    onIds.includes(d.id) ? { ...d, status: "on" as const } : d
  );
}

describe("calculateWattage", () => {
  it("returns 0 total and 0 per room when all devices are off", () => {
    const devices = createInitialDevices();
    const result = calculateWattage(devices);
    expect(result.totalWattsNow).toBe(0);
    expect(result.perRoomWatts.drawing).toBe(0);
    expect(result.perRoomWatts.work1).toBe(0);
    expect(result.perRoomWatts.work2).toBe(0);
  });

  it("sums a single fan correctly", () => {
    const devices = withStatuses(["drawing-fan-1"]);
    const result = calculateWattage(devices);
    expect(result.totalWattsNow).toBe(60);
    expect(result.perRoomWatts.drawing).toBe(60);
  });

  it("sums mixed devices across multiple rooms correctly", () => {
    const devices = withStatuses([
      "drawing-fan-1",
      "work1-light-1",
      "work1-light-2",
    ]);
    const result = calculateWattage(devices);
    expect(result.perRoomWatts.drawing).toBe(60);
    expect(result.perRoomWatts.work1).toBe(30);
    expect(result.totalWattsNow).toBe(90);
  });

  it("sums all 15 devices on to the full office max wattage", () => {
    const devices = createInitialDevices().map((d) => ({
      ...d,
      status: "on" as const,
    }));
    const result = calculateWattage(devices);
    // 6 fans * 60W + 9 lights * 15W = 360 + 135 = 495
    expect(result.totalWattsNow).toBe(495);
  });

  it("always includes all 3 room keys even when a room has zero usage", () => {
    const devices = withStatuses(["work2-fan-1"]);
    const result = calculateWattage(devices);
    expect(Object.keys(result.perRoomWatts).sort()).toEqual([
      "drawing",
      "work1",
      "work2",
    ]);
  });
});

describe("UsageAccumulator", () => {
  function manualClock(startMs: number): Clock & { advance: (ms: number) => void } {
    let current = startMs;
    return {
      now: () => new Date(current),
      nowIso: () => new Date(current).toISOString(),
      advance: (ms: number) => {
        current += ms;
      },
    };
  }

  it("adds ~0 kWh when sampled immediately with no elapsed time", () => {
    const clock = manualClock(0);
    const acc = new UsageAccumulator(clock);
    const total = acc.sample(1000);
    expect(total).toBe(0);
  });

  it("adds exactly 1 kWh for 1000W sustained over 1 simulated hour", () => {
    const clock = manualClock(0);
    const acc = new UsageAccumulator(clock);
    clock.advance(3_600_000); // 1 hour
    const total = acc.sample(1000);
    expect(total).toBeCloseTo(1, 5);
  });

  it("accumulates correctly across multiple samples with varying wattage", () => {
    const clock = manualClock(0);
    const acc = new UsageAccumulator(clock);
    clock.advance(1_800_000); // 30 min at 1000W -> 0.5 kWh
    acc.sample(1000);
    clock.advance(1_800_000); // 30 min at 2000W -> 1.0 kWh
    const total = acc.sample(2000);
    expect(total).toBeCloseTo(1.5, 5);
  });

  it("adds 0 kWh when wattage is 0 regardless of elapsed time", () => {
    const clock = manualClock(0);
    const acc = new UsageAccumulator(clock);
    clock.advance(3_600_000);
    const total = acc.sample(0);
    expect(total).toBe(0);
  });

  it("getTotal reflects the same value as the last sample() call", () => {
    const clock = manualClock(0);
    const acc = new UsageAccumulator(clock);
    clock.advance(3_600_000);
    const sampled = acc.sample(500);
    expect(acc.getTotal()).toBe(sampled);
  });
});
