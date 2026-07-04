import type { Device, RoomId } from "@office-monitor/shared-types";
import { ROOM_LABELS } from "@office-monitor/shared-types";

/** e.g. "Work Room 1 — Fan 1: OFF, Fan 2: OFF, Light 1: ON, Light 2: ON, Light 3: OFF" */
export function formatRoomStatus(room: RoomId, devices: Device[]): string {
  const lines = devices.map((d) => `${d.label}: ${d.status.toUpperCase()}`);
  return `${ROOM_LABELS[room]} — ${lines.join(", ")}`;
}
