import type { Device, RoomId, DeviceType } from "./types.js";

export const ROOM_IDS: RoomId[] = ["drawing", "work1", "work2"];

export const WATTAGE: Record<DeviceType, number> = {
  fan: 60,
  light: 15,
};

const DEVICES_PER_ROOM: { type: DeviceType; count: number }[] = [
  { type: "fan", count: 2 },
  { type: "light", count: 3 },
];

/**
 * Generates the fixed set of 15 devices (3 rooms x (2 fans + 3 lights)).
 * All devices start "off" with lastChanged set to the provided timestamp.
 */
export function createInitialDevices(
  now: string = new Date().toISOString()
): Device[] {
  const devices: Device[] = [];

  for (const room of ROOM_IDS) {
    for (const { type, count } of DEVICES_PER_ROOM) {
      for (let i = 1; i <= count; i++) {
        devices.push({
          id: `${room}-${type}-${i}`,
          type,
          room,
          status: "off",
          wattage: WATTAGE[type],
          lastChanged: now,
        });
      }
    }
  }

  return devices;
}
