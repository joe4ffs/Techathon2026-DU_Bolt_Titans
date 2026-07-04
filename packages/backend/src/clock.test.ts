import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SimClock } from "./clock.js";

describe("SimClock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("defaults to a speed multiplier faster than real time", () => {
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const clock = new SimClock();
    const t0 = clock.now().getTime();
    vi.advanceTimersByTime(1000); // 1 real second
    const t1 = clock.now().getTime();
    expect(t1 - t0).toBeGreaterThan(1000);
  });

  it("advances simulated time proportionally to speedMultiplier", () => {
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const clock = new SimClock({ speedMultiplier: 60 });
    const t0 = clock.now().getTime();
    vi.advanceTimersByTime(1000); // 1 real second
    const t1 = clock.now().getTime();
    expect(t1 - t0).toBe(60_000); // 60x speed -> 60 simulated seconds
  });

  it("respects a custom startTime as the simulated baseline", () => {
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const start = new Date("2026-01-01T08:50:00.000Z");
    const clock = new SimClock({ startTime: start, speedMultiplier: 1 });
    expect(clock.now().getTime()).toBe(start.getTime());
  });

  it("with speedMultiplier 1, tracks real elapsed time exactly", () => {
    const startReal = new Date("2026-01-01T00:00:00.000Z");
    vi.setSystemTime(startReal);
    const clock = new SimClock({ speedMultiplier: 1 });
    vi.advanceTimersByTime(5000);
    expect(clock.now().getTime() - startReal.getTime()).toBe(5000);
  });

  it("nowIso returns a valid, parseable ISO string", () => {
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const clock = new SimClock();
    expect(Number.isNaN(Date.parse(clock.nowIso()))).toBe(false);
  });

  it("simulated time strictly increases across successive real-time advances", () => {
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const clock = new SimClock({ speedMultiplier: 10 });
    const t0 = clock.now().getTime();
    vi.advanceTimersByTime(100);
    const t1 = clock.now().getTime();
    vi.advanceTimersByTime(100);
    const t2 = clock.now().getTime();
    expect(t1).toBeGreaterThan(t0);
    expect(t2).toBeGreaterThan(t1);
  });
});
