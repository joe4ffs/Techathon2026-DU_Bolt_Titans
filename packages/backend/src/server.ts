import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { WebSocketServer, WebSocket } from "ws";
import { ROOM_IDS } from "@office-monitor/shared-types";
import type { RoomId } from "@office-monitor/shared-types";
import type { AppRuntime } from "./runtime.js";

function isRoomId(value: string): value is RoomId {
  return (ROOM_IDS as readonly string[]).includes(value);
}

export interface BuiltServer {
  app: FastifyInstance;
  wss: WebSocketServer;
}

/**
 * Builds the Fastify app and attaches a WebSocket server to the same
 * underlying HTTP server. REST routes and the WS broadcaster both read
 * exclusively from AppRuntime — neither has its own copy of device state.
 */
export async function buildServer(runtime: AppRuntime): Promise<BuiltServer> {
  const app = Fastify({ logger: false });

  await app.register(cors, { origin: true });

  app.get("/api/devices", async () => runtime.store.getAll());

  app.get<{ Params: { room: string } }>(
    "/api/rooms/:room",
    async (request, reply) => {
      const { room } = request.params;
      if (!isRoomId(room)) {
        reply.code(404);
        return { error: `Unknown room: ${room}` };
      }
      return runtime.store.getByRoom(room);
    }
  );

  app.get("/api/usage", async () => runtime.getUsageSnapshot());

  app.get("/api/alerts", async () => runtime.getActiveAlerts());

  // WebSocket shares the same HTTP server Fastify already created, rather
  // than using a separate framework plugin — avoids any plugin-version API
  // drift and gives us a well-documented, stable client/server contract.
  const wss = new WebSocketServer({ noServer: true, path: "/ws" });

  app.server.on("upgrade", (request, socket, head) => {
    if (request.url === "/ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", (socket: WebSocket) => {
    socket.send(
      JSON.stringify({
        type: "snapshot",
        devices: runtime.store.getAll(),
        usage: runtime.getUsageSnapshot(),
        alerts: runtime.getActiveAlerts(),
      })
    );

    const unsubscribe = runtime.onTick((event) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            type: "update",
            devices: event.devices,
            changed: event.changed,
            usage: event.usage,
            alerts: event.alerts.active,
          })
        );
      }
    });

    socket.on("close", () => unsubscribe());
  });

  return { app, wss };
}
