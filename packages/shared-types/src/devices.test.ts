import { describe, it, expect } from "vitest";
import {
  createInitialDevices,
  ROOM_IDS,
  ROOM_LABELS,
  WATTAGE,
} from "./devices.js";

describe("createInitialDevices", () => {
  it("creates exactly 15 devices", () => {
    const devices = createInitialDevices();
    expect(devices).toHaveLength(15);
  });

  it("creates exactly 3 rooms with 5 devices each", () => {
    const devices = createInitialDevices();
    for (const room of ROOM_IDS) {
      const roomDevices = devices.filter((d) => d.room === room);
      expect(roomDevices).toHaveLength(5);
    }
  });

  it("creates exactly 2 fans and 3 lights per room", () => {
    const devices = createInitialDevices();
    for (const room of ROOM_IDS) {
      const fans = devices.filter((d) => d.room === room && d.type === "fan");
      const lights = devices.filter(
        (d) => d.room === room && d.type === "light"
      );
      expect(fans).toHaveLength(2);
      expect(lights).toHaveLength(3);
    }
  });

  it("initializes all devices as off", () => {
    const devices = createInitialDevices();
    expect(devices.every((d) => d.status === "off")).toBe(true);
  });

  it("assigns correct wattage per device type", () => {
    const devices = createInitialDevices();
    for (const d of devices) {
      expect(d.wattage).toBe(WATTAGE[d.type]);
    }
  });

  it("produces unique device ids", () => {
    const devices = createInitialDevices();
    const ids = new Set(devices.map((d) => d.id));
    expect(ids.size).toBe(devices.length);
  });

  it("sets lastChanged to the provided timestamp", () => {
    const fixedTime = "2026-01-01T09:00:00.000Z";
    const devices = createInitialDevices(fixedTime);
    expect(devices.every((d) => d.lastChanged === fixedTime)).toBe(true);
  });

  it("defaults lastChanged to a valid ISO timestamp when not provided", () => {
    const devices = createInitialDevices();
    const parsed = Date.parse(devices[0].lastChanged);
    expect(Number.isNaN(parsed)).toBe(false);
  });

  it("assigns human-readable labels like 'Fan 1' and 'Light 3', unique within each room", () => {
    const devices = createInitialDevices();
    for (const room of ROOM_IDS) {
      const roomDevices = devices.filter((d) => d.room === room);
      const labels = roomDevices.map((d) => d.label);
      expect(labels.sort()).toEqual(
        ["Fan 1", "Fan 2", "Light 1", "Light 2", "Light 3"].sort()
      );
    }
  });

  it("has a ROOM_LABELS entry for every RoomId", () => {
    for (const room of ROOM_IDS) {
      expect(ROOM_LABELS[room]).toBeTruthy();
    }
  });
});
