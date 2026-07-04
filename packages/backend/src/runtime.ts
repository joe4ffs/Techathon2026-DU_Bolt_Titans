import type { Alert, Device, UsageSnapshot } from "@office-monitor/shared-types";
import type { Clock } from "./clock.js";
import { DeviceStore } from "./deviceStore.js";
import { Simulator } from "./simulator.js";
import { AlertEngine, type EvaluateResult } from "./alertEngine.js";
import { calculateWattage, UsageAccumulator } from "./powerCalc.js";

export interface AppRuntimeOptions {
  clock: Clock;
  /** Injectable RNG, passed through to the Simulator. Defaults to Math.random. */
  random?: () => number;
  toggleProbability?: number;
}

export interface TickEvent {
  devices: Device[];
  changed: Device[];
  usage: UsageSnapshot;
  alerts: EvaluateResult;
}

type Listener = (event: TickEvent) => void;

/**
 * Wires the store, simulator, alert engine, and usage accumulator together
 * into one tick loop, and is the single object both the REST routes and the
 * WebSocket broadcaster read from — this is what makes "one source of
 * truth" a real, enforced property instead of just a diagram claim.
 *
 * This class has no HTTP/WS-specific code in it; the transport layer
 * (server.ts) just calls into this and forwards results, which keeps all
 * the actual logic testable without spinning up a server.
 */
export class AppRuntime {
  readonly clock: Clock;
  readonly store: DeviceStore;
  readonly simulator: Simulator;
  readonly alertEngine: AlertEngine;
  private readonly usageAccumulator: UsageAccumulator;
  private readonly listeners = new Set<Listener>();
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(options: AppRuntimeOptions) {
    this.clock = options.clock;
    this.store = new DeviceStore(this.clock.nowIso());
    this.simulator = new Simulator({
      store: this.store,
      clock: this.clock,
      random: options.random,
      toggleProbability: options.toggleProbability,
    });
    this.alertEngine = new AlertEngine({ clock: this.clock });
    this.usageAccumulator = new UsageAccumulator(this.clock);
  }

  getUsageSnapshot(): UsageSnapshot {
    const { totalWattsNow, perRoomWatts } = calculateWattage(
      this.store.getAll()
    );
    return {
      totalWattsNow,
      perRoomWatts,
      estimatedKwhToday: this.usageAccumulator.getTotal(),
    };
  }

  getActiveAlerts(): Alert[] {
    return this.alertEngine.getActiveAlerts();
  }

  /**
   * Runs one full tick. Order matters here: we sample kWh usage using the
   * device state as it existed *before* this tick's toggles — that state is
   * what was actually true for the interval that just elapsed. Only after
   * sampling do we apply the simulator's toggles for the *next* interval.
   * Sampling with the post-toggle state instead would attribute this tick's
   * new wattage to the time that already passed under the old state.
   */
  runTick(): TickEvent {
    const wattageBeforeTick = calculateWattage(this.store.getAll());
    const estimatedKwhToday = this.usageAccumulator.sample(
      wattageBeforeTick.totalWattsNow
    );

    const changed = this.simulator.tick();
    const devices = this.store.getAll();
    const currentWattage = calculateWattage(devices);
    const alerts = this.alertEngine.evaluate(devices);

    const event: TickEvent = {
      devices,
      changed,
      usage: {
        totalWattsNow: currentWattage.totalWattsNow,
        perRoomWatts: currentWattage.perRoomWatts,
        estimatedKwhToday,
      },
      alerts,
    };

    for (const listener of this.listeners) listener(event);
    return event;
  }

  /** Subscribe to every tick's result. Returns an unsubscribe function. */
  onTick(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  start(intervalMs: number): void {
    if (this.timer) return; // idempotent — already running
    this.timer = setInterval(() => this.runTick(), intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }
}
