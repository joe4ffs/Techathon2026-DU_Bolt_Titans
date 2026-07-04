import { describe, it, expect, vi } from "vitest";
import { AppRuntime, type TickEvent } from "./runtime.js";
import { createManualClock } from "./testUtils/manualClock.js";

describe("AppRuntime", () => {
  it("initializes with 15 devices, all off, 0 usage", () => {
    const clock = createManualClock(new Date("2026-01-01T09:00:00.000Z"));
    const runtime = new AppRuntime({ clock });
    expect(runtime.store.getAll()).toHaveLength(15);
    expect(runtime.getUsageSnapshot().totalWattsNow).toBe(0);
  });

  it("runTick returns a full event with devices, changed, usage, and alerts", () => {
    const clock = createManualClock(new Date("2026-01-01T09:00:00.000Z"));
    const runtime = new AppRuntime({ clock, random: () => 1 }); // nothing toggles
    const event = runtime.runTick();
    expect(event.devices).toHaveLength(15);
    expect(event.changed).toHaveLength(0);
    expect(event.usage.totalWattsNow).toBe(0);
    expect(event.alerts.active).toHaveLength(0);
  });

  it("reports current wattage immediately after this tick's toggle", () => {
    const clock = createManualClock(new Date("2026-01-01T09:00:00.000Z"));
    const runtime = new AppRuntime({
      clock,
      random: () => 0,
      toggleProbability: 1, // force every device on
    });
    const event = runtime.runTick();
    // 6 fans * 60W + 9 lights * 15W = 495W
    expect(event.usage.totalWattsNow).toBe(495);
    expect(event.usage.estimatedKwhToday).toBe(0); // no elapsed time yet
  });

  it("accumulates kWh based on wattage during the elapsed interval, not after this tick's toggle", () => {
    const clock = createManualClock(new Date("2026-01-01T09:00:00.000Z"));
    const runtime = new AppRuntime({
      clock,
      random: () => 0,
      toggleProbability: 1, // every tick flips every device
    });

    runtime.runTick(); // 0 elapsed so far, then all 15 devices -> ON
    clock.advance(60 * 60 * 1000); // 1 simulated hour passes while fully ON
    const event = runtime.runTick(); // samples the ON hour, then flips everything OFF

    // 495W sustained for 1 hour = 0.495 kWh
    expect(event.usage.estimatedKwhToday).toBeCloseTo(0.495, 5);
    expect(event.usage.totalWattsNow).toBe(0); // now off, after this tick's toggle
  });

  it("notifies subscribed listeners on every tick", () => {
    const clock = createManualClock(new Date("2026-01-01T09:00:00.000Z"));
    const runtime = new AppRuntime({ clock, random: () => 1 });
    const received: TickEvent[] = [];
    runtime.onTick((e) => received.push(e));

    runtime.runTick();
    runtime.runTick();

    expect(received).toHaveLength(2);
  });

  it("stops notifying a listener after it unsubscribes", () => {
    const clock = createManualClock(new Date("2026-01-01T09:00:00.000Z"));
    const runtime = new AppRuntime({ clock, random: () => 1 });
    const received: TickEvent[] = [];
    const unsubscribe = runtime.onTick((e) => received.push(e));

    runtime.runTick();
    unsubscribe();
    runtime.runTick();

    expect(received).toHaveLength(1);
  });

  it("start() schedules runTick on the given interval", () => {
    vi.useFakeTimers();
    const clock = createManualClock(new Date("2026-01-01T09:00:00.000Z"));
    const runtime = new AppRuntime({ clock, random: () => 1 });
    const spy = vi.spyOn(runtime, "runTick");

    runtime.start(1000);
    vi.advanceTimersByTime(3500);

    expect(spy).toHaveBeenCalledTimes(3);
    runtime.stop();
    vi.useRealTimers();
  });

  it("start() is idempotent — calling it twice does not double-schedule", () => {
    vi.useFakeTimers();
    const clock = createManualClock(new Date("2026-01-01T09:00:00.000Z"));
    const runtime = new AppRuntime({ clock, random: () => 1 });
    const spy = vi.spyOn(runtime, "runTick");

    runtime.start(1000);
    runtime.start(1000);
    vi.advanceTimersByTime(1000);

    expect(spy).toHaveBeenCalledTimes(1);
    runtime.stop();
    vi.useRealTimers();
  });

  it("stop() cancels the scheduled tick", () => {
    vi.useFakeTimers();
    const clock = createManualClock(new Date("2026-01-01T09:00:00.000Z"));
    const runtime = new AppRuntime({ clock, random: () => 1 });
    const spy = vi.spyOn(runtime, "runTick");

    runtime.start(1000);
    runtime.stop();
    vi.advanceTimersByTime(5000);

    expect(spy).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("getActiveAlerts reflects alerts triggered by the most recent tick", () => {
    const clock = createManualClock(new Date("2026-01-01T20:00:00.000Z")); // after hours
    const runtime = new AppRuntime({
      clock,
      random: () => 0,
      toggleProbability: 1,
    });
    runtime.runTick(); // all devices ON, after-hours -> should alert
    expect(runtime.getActiveAlerts().length).toBeGreaterThan(0);
  });
});
