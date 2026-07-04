import type { Device } from "@office-monitor/shared-types";
import type { DeviceStore } from "./deviceStore.js";
import type { Clock } from "./clock.js";

export interface SimulatorOptions {
  store: DeviceStore;
  clock: Clock;
  /** Injectable RNG so ticks are deterministic in tests. Defaults to Math.random. */
  random?: () => number;
  /** Probability any single device toggles on a given tick. Default 5%. */
  toggleProbability?: number;
}

/**
 * Randomly flips a subset of devices on each tick, simulating people turning
 * lights/fans on and off throughout the (simulated) day.
 */
export class Simulator {
  private readonly store: DeviceStore;
  private readonly clock: Clock;
  private readonly random: () => number;
  private readonly toggleProbability: number;

  constructor(options: SimulatorOptions) {
    this.store = options.store;
    this.clock = options.clock;
    this.random = options.random ?? Math.random;
    this.toggleProbability = options.toggleProbability ?? 0.05;
  }

  /** Runs one simulation tick, returning only the devices that changed. */
  tick(): Device[] {
    const now = this.clock.nowIso();
    const changed: Device[] = [];

    for (const device of this.store.getAll()) {
      if (this.random() < this.toggleProbability) {
        const nextStatus = device.status === "on" ? "off" : "on";
        changed.push(this.store.setStatus(device.id, nextStatus, now));
      }
    }

    return changed;
  }
}
