export type DeviceType = "fan" | "light";
export type RoomId = "drawing" | "work1" | "work2";
export type DeviceStatus = "on" | "off";

export interface Device {
  id: string; // e.g. "work1-fan-1"
  type: DeviceType;
  label: string; // human-readable, e.g. "Fan 1" (scoped to its room)
  room: RoomId;
  status: DeviceStatus;
  wattage: number; // rated draw when ON
  lastChanged: string; // ISO timestamp
}

export type AlertType = "after-hours" | "room-continuous-on";

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  room?: RoomId;
  deviceId?: string;
  triggeredAt: string; // ISO timestamp
  resolvedAt?: string; // ISO timestamp, present once the condition clears
}

export interface UsageSnapshot {
  totalWattsNow: number;
  perRoomWatts: Record<RoomId, number>;
  estimatedKwhToday: number;
}
