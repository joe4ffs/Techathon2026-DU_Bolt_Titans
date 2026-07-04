import type { Device, RoomId } from "@office-monitor/shared-types";
import { ROOM_IDS, ROOM_LABELS } from "@office-monitor/shared-types";

/** e.g. "Drawing Room: 1 fan ON, 2 lights ON. Work Room 1: all off. ..." */
export function formatStatus(devices: Device[]): string {
  return ROOM_IDS.map((room) =>
    formatRoomSummary(room, devices.filter((d) => d.room === room))
  ).join(" ");
}

function formatRoomSummary(room: RoomId, devices: Device[]): string {
  const fansOn = devices.filter(
    (d) => d.type === "fan" && d.status === "on"
  ).length;
  const lightsOn = devices.filter(
    (d) => d.type === "light" && d.status === "on"
  ).length;

  if (fansOn === 0 && lightsOn === 0) {
    return `${ROOM_LABELS[room]}: all off.`;
  }

  const bits: string[] = [];
  if (fansOn > 0) bits.push(`${fansOn} fan${fansOn === 1 ? "" : "s"} ON`);
  if (lightsOn > 0)
    bits.push(`${lightsOn} light${lightsOn === 1 ? "" : "s"} ON`);

  return `${ROOM_LABELS[room]}: ${bits.join(", ")}.`;
}
