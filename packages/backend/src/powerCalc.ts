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
 * Integrates wattage over (simulated) time to produce a running kWh total,
 * resetting whenever the simulated clock crosses into a new UTC day.
 *
 * Without a reset, this would accumulate indefinitely for as long as the
 * process runs — harmless over a normal few-minute demo, but the simulated
 * clock runs 300x faster than real time by design, so a dev server left
 * running for a couple of real hours represents *weeks* of simulated time.
 * "estimatedKwhToday" should mean today, not a running lifetime total.
 *
 * Simplification: on a day-boundary crossing, the fractional interval
 * immediately before midnight is attributed to the day that just ended
 * (i.e. simply dropped rather than split precisely at 00:00:00) — a
 * negligible amount of energy for a demo of this scale, in exchange for
 * much simpler logic.
 */
export class UsageAccumulator {
  private kwhAccumulated = 0;
  private lastSampleMs: number;
  private currentDayKey: string;
  private readonly clock: Clock;

  constructor(clock: Clock) {
    this.clock = clock;
    const now = clock.now();
    this.lastSampleMs = now.getTime();
    this.currentDayKey = dayKey(now);
  }

  sample(totalWattsNow: number): number {
    const now = this.clock.now();
    const nowMs = now.getTime();
    const nowDayKey = dayKey(now);

    if (nowDayKey !== this.currentDayKey) {
      this.kwhAccumulated = 0;
      this.currentDayKey = nowDayKey;
      this.lastSampleMs = nowMs;
    }

    const elapsedHours = Math.max(0, nowMs - this.lastSampleMs) / 3_600_000;
    this.kwhAccumulated += (totalWattsNow * elapsedHours) / 1000;
    this.lastSampleMs = nowMs;
    return this.kwhAccumulated;
  }

  getTotal(): number {
    return this.kwhAccumulated;
  }
}

/** UTC calendar day key ("YYYY-MM-DD"), so the reset is deterministic
 *  regardless of server/test-runner timezone — same reasoning as the
 *  alert engine's UTC office-hours check. */
function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
