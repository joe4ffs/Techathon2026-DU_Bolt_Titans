export interface Clock {
  now(): Date;
  nowIso(): string;
}

export interface SimClockOptions {
  /** How many simulated milliseconds pass per real millisecond. Default 300x. */
  speedMultiplier?: number;
  /** The simulated time the clock starts at. Defaults to real "now". */
  startTime?: Date;
}

/**
 * A clock that runs faster than real time, so a full simulated office day
 * (and therefore every alert condition) can reliably occur within a short
 * demo, regardless of what time of day the demo actually happens.
 */
export class SimClock implements Clock {
  private readonly speedMultiplier: number;
  private readonly realStartMs: number;
  private readonly simStartMs: number;

  constructor(options: SimClockOptions = {}) {
    this.speedMultiplier = options.speedMultiplier ?? 300;
    this.realStartMs = Date.now();
    this.simStartMs = (options.startTime ?? new Date()).getTime();
  }

  now(): Date {
    const realElapsedMs = Date.now() - this.realStartMs;
    const simElapsedMs = realElapsedMs * this.speedMultiplier;
    return new Date(this.simStartMs + simElapsedMs);
  }

  nowIso(): string {
    return this.now().toISOString();
  }
}
