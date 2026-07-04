import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildServer } from "./server.js";
import { AppRuntime } from "./runtime.js";
import { createManualClock } from "./testUtils/manualClock.js";
import WebSocket from "ws";
import type { FastifyInstance } from "fastify";
import type { WebSocketServer } from "ws";

function waitForMessage(socket: WebSocket): Promise<any> {
  return new Promise((resolve, reject) => {
    socket.once("message", (data) => {
      try {
        resolve(JSON.parse(data.toString()));
      } catch (err) {
        reject(err);
      }
    });
    socket.once("error", reject);
  });
}

describe("WebSocket", () => {
  let app: FastifyInstance;
  let wss: WebSocketServer;
  let runtime: AppRuntime;
  let port: number;

  beforeEach(async () => {
    const clock = createManualClock(new Date("2026-01-01T09:00:00.000Z"));
    runtime = new AppRuntime({ clock, random: () => 1 });
    const built = await buildServer(runtime);
    app = built.app;
    wss = built.wss;
    await app.listen({ port: 0, host: "127.0.0.1" });

    const address = app.server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Expected the server to bind to a numeric port");
    }
    port = address.port;
  });

  afterEach(async () => {
    wss.close();
    await app.close();
  });

  it("sends a full initial snapshot on connect", async () => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const message = await waitForMessage(socket);
    expect(message.type).toBe("snapshot");
    expect(message.devices).toHaveLength(15);
    socket.close();
  });

  it("broadcasts an update to a connected client on tick", async () => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    await waitForMessage(socket); // consume the initial snapshot

    const nextMessage = waitForMessage(socket);
    runtime.runTick();
    const message = await nextMessage;

    expect(message.type).toBe("update");
    socket.close();
  });

  it("broadcasts the same update to multiple simultaneous clients", async () => {
    const socketA = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const socketB = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    await waitForMessage(socketA);
    await waitForMessage(socketB);

    const nextA = waitForMessage(socketA);
    const nextB = waitForMessage(socketB);
    runtime.runTick();
    const [messageA, messageB] = await Promise.all([nextA, nextB]);

    expect(messageA.type).toBe("update");
    expect(messageB.type).toBe("update");
    socketA.close();
    socketB.close();
  });

  it("keeps the server healthy after a client disconnects", async () => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    await waitForMessage(socket);
    socket.close();
    await new Promise((resolve) => setTimeout(resolve, 50));

    const socket2 = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const message = await waitForMessage(socket2);
    expect(message.type).toBe("snapshot");
    socket2.close();
  });
});
