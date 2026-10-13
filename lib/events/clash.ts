import type { ListedEvent } from "./schema";
import { intervalsFor } from "./derive";

export type Clash = { with: ListedEvent; minutes: number };

export function overlapMinutes(a: ListedEvent, b: ListedEvent): number {
  if (a.id === b.id) return 0;
  const A = intervalsFor(a);
  const B = intervalsFor(b);
  let total = 0;
  for (const [s1, e1] of A) {
    for (const [s2, e2] of B) {
      const o = Math.min(e1, e2) - Math.max(s1, s2);
      if (o > 0) total += o;
    }
  }
  return total;
}

export function clashesWith(
  event: ListedEvent,
  lineup: ListedEvent[],
): Clash[] {
  const out: Clash[] = [];
  for (const other of lineup) {
    if (other.id === event.id) continue;
    const minutes = overlapMinutes(event, other);
    if (minutes > 0) out.push({ with: other, minutes });
  }
  return out.sort((x, y) => y.minutes - x.minutes);
}

/** Every unordered clashing pair inside the lineup. */
export function lineupConflicts(
  lineup: ListedEvent[],
): { a: ListedEvent; b: ListedEvent; minutes: number }[] {
  const out: { a: ListedEvent; b: ListedEvent; minutes: number }[] = [];
  for (let i = 0; i < lineup.length; i++) {
    for (let j = i + 1; j < lineup.length; j++) {
      const minutes = overlapMinutes(lineup[i], lineup[j]);
      if (minutes > 0) out.push({ a: lineup[i], b: lineup[j], minutes });
    }
  }
  return out;
}

/** Greedy lane packing for the day timeline. Returns lane index per event id. */
export function packLanes(
  events: { id: string; start: number; end: number }[],
): Map<string, number> {
  const sorted = [...events].sort(
    (a, b) => a.start - b.start || b.end - b.start - (a.end - a.start),
  );
  const laneEnds: number[] = [];
  const lanes = new Map<string, number>();
  for (const e of sorted) {
    let lane = laneEnds.findIndex((end) => end <= e.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(e.end);
    } else laneEnds[lane] = e.end;
    lanes.set(e.id, lane);
  }
  return lanes;
}
