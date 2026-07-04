import type { Device, RoomId } from "@office-monitor/shared-types";
import { ROOM_IDS } from "@office-monitor/shared-types";
import type { Clock } from "./clock.js";

export interface WattageSnapshot {
  totalWattsNow: number;
  perRoomWatts: Record<RoomId, number>;
}

/** Pure function: sums wattage of devices currently "on", overall and per room. */
export function calculateWattage(devices: Device[]): WattageSnapshot {
  const perRoomWatts = Object.fromEntries(
    ROOM_IDS.map((room) => [room, 0])
  ) as Record<RoomId, number>;

  for (const device of devices) {
    if (device.status === "on") {
      perRoomWatts[device.room] += device.wattage;
    }
  }

  const totalWattsNow = Object.values(perRoomWatts).reduce(
    (a, b) => a + b,
    0
  );
  return { totalWattsNow, perRoomWatts };
}

/**
 * Integrates wattage over (simulated) time to produce a running kWh total.
 * Call sample() periodically with the current total wattage; it uses the
 * elapsed simulated time since the last sample to add the correct energy.
 */
export class UsageAccumulator {
  private kwhAccumulated = 0;
  private lastSampleMs: number;
  private readonly clock: Clock;

  constructor(clock: Clock) {
    this.clock = clock;
    this.lastSampleMs = clock.now().getTime();
  }

  sample(totalWattsNow: number): number {
    const nowMs = this.clock.now().getTime();
    const elapsedHours = Math.max(0, nowMs - this.lastSampleMs) / 3_600_000;
    this.kwhAccumulated += (totalWattsNow * elapsedHours) / 1000;
    this.lastSampleMs = nowMs;
    return this.kwhAccumulated;
  }

  getTotal(): number {
    return this.kwhAccumulated;
  }
}
