import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildServer } from "./server.js";
import { AppRuntime } from "./runtime.js";
import { createManualClock } from "./testUtils/manualClock.js";
import type { FastifyInstance } from "fastify";
import type { WebSocketServer } from "ws";

describe("REST API", () => {
  let app: FastifyInstance;
  let wss: WebSocketServer;
  let runtime: AppRuntime;

  beforeEach(async () => {
    const clock = createManualClock(new Date("2026-01-01T09:00:00.000Z"));
    runtime = new AppRuntime({ clock, random: () => 1 }); // nothing auto-toggles
    const built = await buildServer(runtime);
    app = built.app;
    wss = built.wss;
    await app.ready();
  });

  afterEach(async () => {
    wss.close();
    await app.close();
  });

  it("GET /api/devices returns all 15 devices", async () => {
    const res = await app.inject({ method: "GET", url: "/api/devices" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(15);
  });

  it("GET /api/rooms/:room returns 5 devices for a valid room", async () => {
    const res = await app.inject({ method: "GET", url: "/api/rooms/work1" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(5);
  });

  it("GET /api/rooms/:room returns 404 for an invalid room", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/rooms/basement",
    });
    expect(res.statusCode).toBe(404);
  });

  it("GET /api/usage returns a valid usage snapshot shape", async () => {
    const res = await app.inject({ method: "GET", url: "/api/usage" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty("totalWattsNow");
    expect(body).toHaveProperty("perRoomWatts");
    expect(body).toHaveProperty("estimatedKwhToday");
  });

  it("GET /api/usage reflects a device turned on directly via the store", async () => {
    runtime.store.setStatus(
      "drawing-fan-1",
      "on",
      "2026-01-01T09:05:00.000Z"
    );
    const res = await app.inject({ method: "GET", url: "/api/usage" });
    expect(res.json().totalWattsNow).toBe(60);
  });

  it("GET /api/alerts returns an empty array when nothing is active", async () => {
    const res = await app.inject({ method: "GET", url: "/api/alerts" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it("GET /api/alerts reflects an alert triggered by a tick", async () => {
    const clock = createManualClock(new Date("2026-01-01T20:00:00.000Z")); // after hours
    const afterHoursRuntime = new AppRuntime({
      clock,
      random: () => 0,
      toggleProbability: 1,
    });
    const built = await buildServer(afterHoursRuntime);
    afterHoursRuntime.runTick(); // all devices on, after-hours -> alert

    const res = await built.app.inject({ method: "GET", url: "/api/alerts" });
    expect(res.json().length).toBeGreaterThan(0);

    built.wss.close();
    await built.app.close();
  });
});
