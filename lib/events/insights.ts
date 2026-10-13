import type { ListedEvent } from "./schema";
import { availability, eventDays, intervalsFor, isPast } from "./derive";
import { overlapMinutes } from "./clash";
import { isoToIst, istToEpochMin } from "./time";

/** Facts derived from real API data for the landing page. Nothing here is hard-coded. */

export function activeEvents(events: ListedEvent[]) {
  return events.filter((e) => !isPast(e) && e.event_status === "ACTIVE");
}

/** Sorted IST dates covered by active events. */
export function festDays(events: ListedEvent[]): string[] {
  return [...new Set(activeEvents(events).flatMap(eventDays))].sort();
}

export function eventsOnDay(events: ListedEvent[], day: string) {
  return activeEvents(events).filter((e) => eventDays(e).includes(day));
}

/** Number of events running at the top of each hour on a day. */
export function concurrencyByHour(
  events: ListedEvent[],
  day: string,
  fromHour = 8,
  toHour = 22,
) {
  const list = eventsOnDay(events, day).map(intervalsFor);
  const out: { hour: number; count: number }[] = [];
  for (let h = fromHour; h < toHour; h++) {
    const t = istToEpochMin(day, `${String(h).padStart(2, "0")}:00`);
    out.push({
      hour: h,
      count: list.filter((iv) => iv.some(([s, e]) => s <= t && t < e)).length,
    });
  }
  return out;
}

export function peakConcurrency(events: ListedEvent[]) {
  let best = { day: "", hour: 0, count: 0, until: 0 };
  for (const day of festDays(events)) {
    const series = concurrencyByHour(events, day);
    const i = series.reduce(
      (bi, p, idx) => (p.count > series[bi].count ? idx : bi),
      0,
    );
    if (series[i].count <= best.count) continue;
    let end = i; // extend the peak window across consecutive equal hours
    while (end + 1 < series.length && series[end + 1].count === series[i].count)
      end++;
    best = {
      day,
      hour: series[i].hour,
      count: series[i].count,
      until: series[end].hour + 1,
    };
  }
  return best;
}

export function overlappingPairs(events: ListedEvent[]): number {
  const list = activeEvents(events);
  let n = 0;
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++)
      if (overlapMinutes(list[i], list[j]) > 0) n++;
  return n;
}

export function distinctDeadlines(events: ListedEvent[]): number {
  return new Set(
    activeEvents(events)
      .filter((e) => e.registration_status === "OPEN")
      .map((e) => isoToIst(e.registration_deadline)?.date)
      .filter(Boolean),
  ).size;
}

export function teamSizeRange(events: ListedEvent[]) {
  const list = activeEvents(events);
  return {
    min: Math.min(...list.map((e) => e.min_teamsize)),
    max: Math.max(...list.map((e) => e.max_teamsize)),
  };
}

/** Open events ordered by registration deadline (earliest first). */
export function closingSoon(events: ListedEvent[], nowMs: number, limit = 4) {
  return activeEvents(events)
    .filter((e) => availability(e, nowMs) === "open")
    .map((e) => ({ e, deadline: isoToIst(e.registration_deadline) }))
    .filter(
      (
        x,
      ): x is {
        e: ListedEvent;
        deadline: NonNullable<ReturnType<typeof isoToIst>>;
      } => !!x.deadline,
    )
    .sort((a, b) => a.deadline.epochMs - b.deadline.epochMs)
    .slice(0, limit);
}

export function featured(events: ListedEvent[], limit = 3) {
  return activeEvents(events)
    .filter((e) => e.is_featured)
    .sort(
      (a, b) =>
        Number(availability(b) === "open") - Number(availability(a) === "open"),
    )
    .slice(0, limit);
}
