import { describe, it, expect, vi } from "vitest";
import { ApiClient } from "./apiClient.js";

function fakeFetch(status: number, body: unknown) {
  return vi.fn(async (_url: string) => {
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as Response;
  });
}

describe("ApiClient", () => {
  it("getDevices requests /api/devices and returns parsed JSON", async () => {
    const devices = [{ id: "drawing-fan-1" }];
    const fetchImpl = fakeFetch(200, devices);
    const client = new ApiClient({
      baseUrl: "http://localhost:3001",
      fetchImpl,
    });

    const result = await client.getDevices();

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3001/api/devices"
    );
    expect(result).toEqual(devices);
  });

  it("getRoom includes the room id in the request path", async () => {
    const fetchImpl = fakeFetch(200, []);
    const client = new ApiClient({
      baseUrl: "http://localhost:3001",
      fetchImpl,
    });

    await client.getRoom("work1");

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3001/api/rooms/work1"
    );
  });

  it("getUsage requests /api/usage", async () => {
    const usage = {
      totalWattsNow: 100,
      perRoomWatts: {},
      estimatedKwhToday: 0,
    };
    const fetchImpl = fakeFetch(200, usage);
    const client = new ApiClient({
      baseUrl: "http://localhost:3001",
      fetchImpl,
    });

    const result = await client.getUsage();

    expect(fetchImpl).toHaveBeenCalledWith("http://localhost:3001/api/usage");
    expect(result).toEqual(usage);
  });

  it("getAlerts requests /api/alerts", async () => {
    const fetchImpl = fakeFetch(200, []);
    const client = new ApiClient({
      baseUrl: "http://localhost:3001",
      fetchImpl,
    });

    await client.getAlerts();

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3001/api/alerts"
    );
  });

  it("strips a trailing slash from baseUrl before building request paths", async () => {
    const fetchImpl = fakeFetch(200, []);
    const client = new ApiClient({
      baseUrl: "http://localhost:3001/",
      fetchImpl,
    });

    await client.getDevices();

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3001/api/devices"
    );
  });

  it("throws a descriptive error on a non-ok response", async () => {
    const fetchImpl = fakeFetch(404, { error: "not found" });
    const client = new ApiClient({
      baseUrl: "http://localhost:3001",
      fetchImpl,
    });

    await expect(client.getRoom("work1")).rejects.toThrow(/404/);
  });
});
