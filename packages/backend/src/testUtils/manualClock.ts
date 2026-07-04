import type { Clock } from "../clock.js";

export interface ManualClock extends Clock {
  advance(ms: number): void;
  set(date: Date): void;
}

/** A clock you control by hand — no waiting, no vi.useFakeTimers wiring needed. */
export function createManualClock(start: Date): ManualClock {
  let current = start.getTime();
  return {
    now: () => new Date(current),
    nowIso: () => new Date(current).toISOString(),
    advance: (ms: number) => {
      current += ms;
    },
    set: (date: Date) => {
      current = date.getTime();
    },
  };
}
