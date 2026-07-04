import { describe, it, expect } from "vitest";
import { DeviceStore } from "./deviceStore.js";

describe("DeviceStore", () => {
  it("initializes with exactly 15 devices", () => {
    const store = new DeviceStore("2026-01-01T00:00:00.000Z");
    expect(store.getAll()).toHaveLength(15);
  });

  it("getById returns the correct device", () => {
    const store = new DeviceStore("2026-01-01T00:00:00.000Z");
    const device = store.getById("drawing-fan-1");
    expect(device?.id).toBe("drawing-fan-1");
  });

  it("getById returns undefined for an unknown id", () => {
    const store = new DeviceStore("2026-01-01T00:00:00.000Z");
    expect(store.getById("nonexistent-device")).toBeUndefined();
  });

  it("getByRoom returns exactly 5 devices for a valid room", () => {
    const store = new DeviceStore("2026-01-01T00:00:00.000Z");
    expect(store.getByRoom("work1")).toHaveLength(5);
  });

  it("setStatus updates status and lastChanged on a real transition", () => {
    const store = new DeviceStore("2026-01-01T00:00:00.000Z");
    const updated = store.setStatus(
      "work1-light-1",
      "on",
      "2026-01-01T09:00:00.000Z"
    );
    expect(updated.status).toBe("on");
    expect(updated.lastChanged).toBe("2026-01-01T09:00:00.000Z");
  });

  it("setStatus is a no-op and does not touch lastChanged for a redundant status", () => {
    const store = new DeviceStore("2026-01-01T00:00:00.000Z");
    const before = store.getById("work1-light-1")!;
    const result = store.setStatus(
      "work1-light-1",
      "off",
      "2026-01-01T09:00:00.000Z"
    );
    expect(result.lastChanged).toBe(before.lastChanged);
  });

  it("setStatus persists the change on subsequent reads", () => {
    const store = new DeviceStore("2026-01-01T00:00:00.000Z");
    store.setStatus("work2-fan-2", "on", "2026-01-01T09:05:00.000Z");
    expect(store.getById("work2-fan-2")?.status).toBe("on");
  });

  it("setStatus throws for an unknown device id", () => {
    const store = new DeviceStore("2026-01-01T00:00:00.000Z");
    expect(() =>
      store.setStatus("not-a-real-id", "on", "2026-01-01T09:00:00.000Z")
    ).toThrow(/Unknown device id/);
  });

  it("getAll returns a snapshot, not a live reference to internal state", () => {
    const store = new DeviceStore("2026-01-01T00:00:00.000Z");
    const all = store.getAll();
    all.pop();
    expect(store.getAll()).toHaveLength(15);
  });
});
