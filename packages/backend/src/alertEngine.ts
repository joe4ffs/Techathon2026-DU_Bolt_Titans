import type { Alert, Device, RoomId } from "@office-monitor/shared-types";
import { ROOM_IDS, ROOM_LABELS } from "@office-monitor/shared-types";
import type { Clock } from "./clock.js";

export interface AlertEngineOptions {
  clock: Clock;
  /** Office hours are [officeHourStart, officeHourEnd) in UTC. Default 9-17. */
  officeHourStart?: number;
  officeHourEnd?: number;
  /** How long a room must be fully-on before it alerts. Default 2 hours. */
  continuousOnThresholdMs?: number;
}

export interface EvaluateResult {
  active: Alert[];
  newlyTriggered: Alert[];
  newlyResolved: Alert[];
}

/**
 * Watches device state and raises two alert types:
 *  - after-hours: a device left ON outside office hours
 *  - room-continuous-on: a room where every device has been ON continuously
 *    for longer than the threshold
 *
 * Alerts have an active/resolved lifecycle: calling evaluate() repeatedly
 * while a condition persists does not re-trigger it, and the alert is
 * automatically resolved (with a resolvedAt timestamp) once the condition
 * stops being true.
 *
 * Office-hour checks use UTC hours specifically so behavior is identical
 * regardless of which timezone the server or the test runner happens to be
 * in — a common source of "works on my machine" bugs otherwise.
 */
export class AlertEngine {
  private readonly clock: Clock;
  private readonly officeHourStart: number;
  private readonly officeHourEnd: number;
  private readonly continuousOnThresholdMs: number;

  private roomFullyOnSince: Partial<Record<RoomId, string>> = {};
  private activeAlerts: Map<string, Alert> = new Map();

  constructor(options: AlertEngineOptions) {
    this.clock = options.clock;
    this.officeHourStart = options.officeHourStart ?? 9;
    this.officeHourEnd = options.officeHourEnd ?? 17;
    this.continuousOnThresholdMs =
      options.continuousOnThresholdMs ?? 2 * 60 * 60 * 1000;
  }

  /** Re-evaluates all alert conditions against the current device list. */
  evaluate(devices: Device[]): EvaluateResult {
    const now = this.clock.now();
    const nowIso = now.toISOString();
    const newlyTriggered: Alert[] = [];
    const newlyResolved: Alert[] = [];

    this.evaluateAfterHours(devices, now, nowIso, newlyTriggered, newlyResolved);
    this.evaluateRoomContinuousOn(devices, now, nowIso, newlyTriggered, newlyResolved);

    return {
      active: this.getActiveAlerts(),
      newlyTriggered,
      newlyResolved,
    };
  }

  getActiveAlerts(): Alert[] {
    return [...this.activeAlerts.values()];
  }

  private isWithinOfficeHours(date: Date): boolean {
    const hour = date.getUTCHours();
    return hour >= this.officeHourStart && hour < this.officeHourEnd;
  }

  private evaluateAfterHours(
    devices: Device[],
    now: Date,
    nowIso: string,
    newlyTriggered: Alert[],
    newlyResolved: Alert[]
  ): void {
    const isAfterHours = !this.isWithinOfficeHours(now);

    for (const device of devices) {
      const key = `after-hours:${device.id}`;
      const shouldBeActive = isAfterHours && device.status === "on";
      const existing = this.activeAlerts.get(key);

      if (shouldBeActive && !existing) {
        const alert: Alert = {
          id: key,
          type: "after-hours",
          message: `${device.label} in ${ROOM_LABELS[device.room]} was left ON after office hours.`,
          room: device.room,
          deviceId: device.id,
          triggeredAt: nowIso,
        };
        this.activeAlerts.set(key, alert);
        newlyTriggered.push(alert);
      } else if (!shouldBeActive && existing) {
        const resolved: Alert = { ...existing, resolvedAt: nowIso };
        this.activeAlerts.delete(key);
        newlyResolved.push(resolved);
      }
    }
  }

  private evaluateRoomContinuousOn(
    devices: Device[],
    now: Date,
    nowIso: string,
    newlyTriggered: Alert[],
    newlyResolved: Alert[]
  ): void {
    for (const room of ROOM_IDS) {
      const roomDevices = devices.filter((d) => d.room === room);
      const allOn =
        roomDevices.length > 0 && roomDevices.every((d) => d.status === "on");
      const key = `room-continuous-on:${room}`;
      const existing = this.activeAlerts.get(key);

      if (!allOn) {
        // Any device off resets the continuous-on window entirely.
        delete this.roomFullyOnSince[room];
        if (existing) {
          const resolved: Alert = { ...existing, resolvedAt: nowIso };
          this.activeAlerts.delete(key);
          newlyResolved.push(resolved);
        }
        continue;
      }

      if (!this.roomFullyOnSince[room]) {
        this.roomFullyOnSince[room] = nowIso;
      }

      const sinceMs = new Date(this.roomFullyOnSince[room]!).getTime();
      const elapsedMs = now.getTime() - sinceMs;
      const thresholdExceeded = elapsedMs > this.continuousOnThresholdMs;

      if (thresholdExceeded && !existing) {
        const alert: Alert = {
          id: key,
          type: "room-continuous-on",
          message: `${ROOM_LABELS[room]} has had all devices ON continuously for over 2 hours.`,
          room,
          triggeredAt: nowIso,
        };
        this.activeAlerts.set(key, alert);
        newlyTriggered.push(alert);
      }
    }
  }
}
