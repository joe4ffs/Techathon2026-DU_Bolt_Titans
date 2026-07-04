import type { RoomId } from "@office-monitor/shared-types";

const ALIASES: Record<string, RoomId> = {
  drawing: "drawing",
  drawingroom: "drawing",
  work1: "work1",
  workroom1: "work1",
  work2: "work2",
  workroom2: "work2",
};

/** Normalizes and resolves a user-typed room name, or returns null if unrecognized. */
export function resolveRoom(input: string): RoomId | null {
  const key = input
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  return ALIASES[key] ?? null;
}
