import type { Device, DeviceStatus, RoomId } from "@office-monitor/shared-types";
import { createInitialDevices } from "@office-monitor/shared-types";

/**
 * In-memory source of truth for device state. Both the simulator and any
 * future REST/WebSocket layer read and write through this single store —
 * this is what makes "one source of truth" a real, testable property rather
 * than just an architecture diagram claim.
 */
export class DeviceStore {
  private devices: Map<string, Device>;

  constructor(initializedAt: string = new Date().toISOString()) {
    this.devices = new Map(
      createInitialDevices(initializedAt).map((d) => [d.id, d])
    );
  }

  getAll(): Device[] {
    return [...this.devices.values()];
  }

  getById(id: string): Device | undefined {
    return this.devices.get(id);
  }

  getByRoom(room: RoomId): Device[] {
    return this.getAll().filter((d) => d.room === room);
  }

  /**
   * Updates a device's status. No-ops (and does not touch lastChanged) if
   * the status is unchanged, so lastChanged always reflects a real transition.
   */
  setStatus(id: string, status: DeviceStatus, changedAt: string): Device {
    const device = this.devices.get(id);
    if (!device) {
      throw new Error(`Unknown device id: ${id}`);
    }
    if (device.status === status) {
      return device;
    }
    const updated: Device = { ...device, status, lastChanged: changedAt };
    this.devices.set(id, updated);
    return updated;
  }
}
