import { describe, it, expect } from "vitest";
import { AlertEngine } from "./alertEngine.js";
import { createManualClock } from "./testUtils/manualClock.js";
import { createInitialDevices } from "@office-monitor/shared-types";
import type { Device, RoomId } from "@office-monitor/shared-types";

function devicesWithStatus(overrides: Record<string, "on" | "off">): Device[] {
  return createInitialDevices("2026-01-01T00:00:00.000Z").map((d) =>
    overrides[d.id] ? { ...d, status: overrides[d.id] } : d
  );
}

function allOnInRoom(room: RoomId, devices: Device[]): Device[] {
  return devices.map((d) => (d.room === room ? { ...d, status: "on" } : d));
}

describe("AlertEngine — after-hours", () => {
  it("triggers when a device is on before office hours (8:59)", () => {
    const clock = createManualClock(new Date("2026-01-01T08:59:00.000Z"));
    const engine = new AlertEngine({ clock });
    const devices = devicesWithStatus({ "drawing-light-1": "on" });

    const result = engine.evaluate(devices);
    expect(result.newlyTriggered).toHaveLength(1);
    expect(result.newlyTriggered[0].type).toBe("after-hours");
  });

  it("does not trigger exactly at 9:00 (start of office hours)", () => {
    const clock = createManualClock(new Date("2026-01-01T09:00:00.000Z"));
    const engine = new AlertEngine({ clock });
    const devices = devicesWithStatus({ "drawing-light-1": "on" });

    const result = engine.evaluate(devices);
    expect(result.newlyTriggered).toHaveLength(0);
  });

  it("does not trigger at 16:59 (still within office hours)", () => {
    const clock = createManualClock(new Date("2026-01-01T16:59:00.000Z"));
    const engine = new AlertEngine({ clock });
    const devices = devicesWithStatus({ "drawing-light-1": "on" });

    const result = engine.evaluate(devices);
    expect(result.newlyTriggered).toHaveLength(0);
  });

  it("triggers exactly at 17:00 (office hours have ended)", () => {
    const clock = createManualClock(new Date("2026-01-01T17:00:00.000Z"));
    const engine = new AlertEngine({ clock });
    const devices = devicesWithStatus({ "drawing-light-1": "on" });

    const result = engine.evaluate(devices);
    expect(result.newlyTriggered).toHaveLength(1);
  });

  it("triggers one alert per device when multiple are left on after-hours", () => {
    const clock = createManualClock(new Date("2026-01-01T20:00:00.000Z"));
    const engine = new AlertEngine({ clock });
    const devices = devicesWithStatus({
      "drawing-light-1": "on",
      "work1-fan-1": "on",
    });

    const result = engine.evaluate(devices);
    expect(result.newlyTriggered).toHaveLength(2);
  });

  it("does not re-trigger on repeated evaluate() calls while still after-hours and on", () => {
    const clock = createManualClock(new Date("2026-01-01T20:00:00.000Z"));
    const engine = new AlertEngine({ clock });
    const devices = devicesWithStatus({ "drawing-light-1": "on" });

    engine.evaluate(devices);
    const second = engine.evaluate(devices);
    expect(second.newlyTriggered).toHaveLength(0);
    expect(second.active).toHaveLength(1); // still active, just not "newly"
  });

  it("resolves the alert once the device is turned off", () => {
    const clock = createManualClock(new Date("2026-01-01T20:00:00.000Z"));
    const engine = new AlertEngine({ clock });
    const on = devicesWithStatus({ "drawing-light-1": "on" });
    const off = devicesWithStatus({ "drawing-light-1": "off" });

    engine.evaluate(on);
    const result = engine.evaluate(off);

    expect(result.newlyResolved).toHaveLength(1);
    expect(result.active).toHaveLength(0);
    expect(result.newlyResolved[0].resolvedAt).toBeTruthy();
  });

  it("resolves the alert once office hours resume, even if the device is still on", () => {
    const clock = createManualClock(new Date("2026-01-01T20:00:00.000Z"));
    const engine = new AlertEngine({ clock });
    const devices = devicesWithStatus({ "drawing-light-1": "on" });

    engine.evaluate(devices);
    clock.set(new Date("2026-01-02T09:30:00.000Z"));
    const result = engine.evaluate(devices);

    expect(result.newlyResolved).toHaveLength(1);
    expect(result.active).toHaveLength(0);
  });

  it("never triggers for a device that stays off after-hours", () => {
    const clock = createManualClock(new Date("2026-01-01T20:00:00.000Z"));
    const engine = new AlertEngine({ clock });
    const devices = devicesWithStatus({});

    const result = engine.evaluate(devices);
    expect(result.newlyTriggered).toHaveLength(0);
  });
});

describe("AlertEngine — room continuous-on", () => {
  it("does not trigger at exactly the 2-hour boundary", () => {
    const clock = createManualClock(new Date("2026-01-01T09:00:00.000Z"));
    const engine = new AlertEngine({ clock });
    const fullyOn = allOnInRoom("work1", devicesWithStatus({}));

    engine.evaluate(fullyOn); // starts the continuous-on window
    clock.advance(2 * 60 * 60 * 1000); // exactly 2 hours later
    const result = engine.evaluate(fullyOn);

    expect(result.newlyTriggered).toHaveLength(0);
  });

  it("triggers just past the 2-hour boundary", () => {
    const clock = createManualClock(new Date("2026-01-01T09:00:00.000Z"));
    const engine = new AlertEngine({ clock });
    const fullyOn = allOnInRoom("work1", devicesWithStatus({}));

    engine.evaluate(fullyOn);
    clock.advance(2 * 60 * 60 * 1000 + 1); // 1ms past 2 hours
    const result = engine.evaluate(fullyOn);

    expect(result.newlyTriggered).toHaveLength(1);
    expect(result.newlyTriggered[0].type).toBe("room-continuous-on");
    expect(result.newlyTriggered[0].room).toBe("work1");
  });

  it("does not trigger when only 4 of 5 devices in a room are on", () => {
    const clock = createManualClock(new Date("2026-01-01T09:00:00.000Z"));
    const engine = new AlertEngine({ clock });
    const partiallyOn = devicesWithStatus({
      "work1-fan-1": "on",
      "work1-fan-2": "on",
      "work1-light-1": "on",
      "work1-light-2": "on",
      // work1-light-3 stays off
    });

    engine.evaluate(partiallyOn);
    clock.advance(3 * 60 * 60 * 1000);
    const result = engine.evaluate(partiallyOn);

    expect(result.newlyTriggered).toHaveLength(0);
  });

  it("resets the continuous-on timer when a device turns off, even briefly", () => {
    const clock = createManualClock(new Date("2026-01-01T09:00:00.000Z"));
    const engine = new AlertEngine({ clock });
    const fullyOn = allOnInRoom("work1", devicesWithStatus({}));

    engine.evaluate(fullyOn);
    clock.advance(1 * 60 * 60 * 1000); // 1 hour fully on

    const partial = fullyOn.map((d) =>
      d.id === "work1-fan-1" ? { ...d, status: "off" as const } : d
    );
    engine.evaluate(partial); // breaks the streak

    clock.advance(1 * 60 * 60 * 1000 + 1); // 1hr+ since the break, not since original start
    const backOn = allOnInRoom("work1", devicesWithStatus({}));
    const result = engine.evaluate(backOn);

    // Only ~1hr+1ms has passed since the timer restarted, well under 2hrs
    expect(result.newlyTriggered).toHaveLength(0);
  });

  it("resolves the alert once a device in the room turns off", () => {
    const clock = createManualClock(new Date("2026-01-01T09:00:00.000Z"));
    const engine = new AlertEngine({ clock });
    const fullyOn = allOnInRoom("work1", devicesWithStatus({}));

    engine.evaluate(fullyOn);
    clock.advance(2 * 60 * 60 * 1000 + 1);
    const triggered = engine.evaluate(fullyOn);
    expect(triggered.active).toHaveLength(1);

    const oneOff = fullyOn.map((d) =>
      d.id === "work1-fan-1" ? { ...d, status: "off" as const } : d
    );
    const resolved = engine.evaluate(oneOff);

    expect(resolved.newlyResolved).toHaveLength(1);
    expect(resolved.active).toHaveLength(0);
  });

  it("does not re-trigger on repeated evaluate() calls past the threshold", () => {
    const clock = createManualClock(new Date("2026-01-01T09:00:00.000Z"));
    const engine = new AlertEngine({ clock });
    const fullyOn = allOnInRoom("work1", devicesWithStatus({}));

    engine.evaluate(fullyOn);
    clock.advance(2 * 60 * 60 * 1000 + 1);
    engine.evaluate(fullyOn);
    const again = engine.evaluate(fullyOn);

    expect(again.newlyTriggered).toHaveLength(0);
    expect(again.active).toHaveLength(1);
  });

  it("tracks rooms independently — one room alerting doesn't affect another", () => {
    const clock = createManualClock(new Date("2026-01-01T09:00:00.000Z"));
    const engine = new AlertEngine({ clock });

    let devices = allOnInRoom("work1", devicesWithStatus({}));
    engine.evaluate(devices);
    clock.advance(2 * 60 * 60 * 1000 + 1);
    const result1 = engine.evaluate(devices);
    expect(result1.newlyTriggered).toHaveLength(1);
    expect(result1.newlyTriggered[0].room).toBe("work1");

    // Now bring work2 fully on too, starting fresh
    devices = allOnInRoom("work2", devices);
    const result2 = engine.evaluate(devices);
    expect(result2.newlyTriggered).toHaveLength(0); // work2 just started, not yet past threshold

    clock.advance(2 * 60 * 60 * 1000 + 1);
    const result3 = engine.evaluate(devices);
    expect(result3.newlyTriggered).toHaveLength(1);
    expect(result3.newlyTriggered[0].room).toBe("work2");
    expect(result3.active).toHaveLength(2); // both rooms now alerting
  });
});

describe("AlertEngine — general", () => {
  it("getActiveAlerts reflects the same alerts returned by the last evaluate()", () => {
    const clock = createManualClock(new Date("2026-01-01T20:00:00.000Z"));
    const engine = new AlertEngine({ clock });
    const devices = devicesWithStatus({ "drawing-light-1": "on" });

    engine.evaluate(devices);
    expect(engine.getActiveAlerts()).toHaveLength(1);
  });

  it("all alerts carry a valid ISO triggeredAt timestamp", () => {
    const clock = createManualClock(new Date("2026-01-01T20:00:00.000Z"));
    const engine = new AlertEngine({ clock });
    const devices = devicesWithStatus({ "drawing-light-1": "on" });

    const result = engine.evaluate(devices);
    const triggeredAt = result.newlyTriggered[0].triggeredAt;
    expect(Number.isNaN(Date.parse(triggeredAt))).toBe(false);
  });
});
