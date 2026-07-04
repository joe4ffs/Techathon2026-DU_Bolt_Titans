import { describe, it, expect } from "vitest";
import { Simulator } from "./simulator.js";
import { DeviceStore } from "./deviceStore.js";
import type { Clock } from "./clock.js";

const fixedClock: Clock = {
  now: () => new Date("2026-01-01T09:00:00.000Z"),
  nowIso: () => "2026-01-01T09:00:00.000Z",
};

describe("Simulator", () => {
  it("toggles every device when random() always returns below the probability", () => {
    const store = new DeviceStore("2026-01-01T00:00:00.000Z");
    const sim = new Simulator({
      store,
      clock: fixedClock,
      random: () => 0,
      toggleProbability: 0.5,
    });
    const changed = sim.tick();
    expect(changed).toHaveLength(15);
    expect(store.getAll().every((d) => d.status === "on")).toBe(true);
  });

  it("toggles no device when random() always returns above the probability", () => {
    const store = new DeviceStore("2026-01-01T00:00:00.000Z");
    const sim = new Simulator({
      store,
      clock: fixedClock,
      random: () => 0.99,
      toggleProbability: 0.5,
    });
    const changed = sim.tick();
    expect(changed).toHaveLength(0);
    expect(store.getAll().every((d) => d.status === "off")).toBe(true);
  });

  it("returns only the devices that actually changed, not the full list", () => {
    const store = new DeviceStore("2026-01-01T00:00:00.000Z");
    let call = 0;
    const random = () => (call++ === 0 ? 0 : 1); // only first device flips
    const sim = new Simulator({
      store,
      clock: fixedClock,
      random,
      toggleProbability: 0.5,
    });
    const changed = sim.tick();
    expect(changed).toHaveLength(1);
  });

  it("stamps changed devices with the clock's current time", () => {
    const store = new DeviceStore("2026-01-01T00:00:00.000Z");
    const sim = new Simulator({
      store,
      clock: fixedClock,
      random: () => 0,
      toggleProbability: 1,
    });
    const changed = sim.tick();
    expect(
      changed.every((d) => d.lastChanged === "2026-01-01T09:00:00.000Z")
    ).toBe(true);
  });

  it("toggling twice flips a device back to its original state", () => {
    const store = new DeviceStore("2026-01-01T00:00:00.000Z");
    const sim = new Simulator({
      store,
      clock: fixedClock,
      random: () => 0,
      toggleProbability: 1,
    });
    sim.tick();
    const afterFirst = store.getById("drawing-light-1")!.status;
    sim.tick();
    const afterSecond = store.getById("drawing-light-1")!.status;
    expect(afterFirst).toBe("on");
    expect(afterSecond).toBe("off");
  });

  it("defaults to a low toggle probability so a mid-range random value causes no change", () => {
    const store = new DeviceStore("2026-01-01T00:00:00.000Z");
    const sim = new Simulator({ store, clock: fixedClock, random: () => 0.5 });
    const changed = sim.tick();
    expect(changed).toHaveLength(0); // default probability (0.05) < 0.5 always
  });
});
