import type { EventSummary, ListedEvent } from "./schema";
import { isoToIst, sessionInterval } from "./time";

export type Squad = 1 | 2 | 3 | 4 | 5;

/** Real sessions for an event; falls back to schedule_summary for single-day events. */
export function sessionsFor(e: EventSummary & { sessions?: ListedEvent["sessions"] }): ListedEvent["sessions"] {
  if (e.sessions && e.sessions.length) return e.sessions;
  const s = e.schedule_summary;
  if (s.start_date === s.end_date) {
    return [{ event_date: s.start_date, start_time: s.start_time, end_time: s.end_time }];
  }
  // Multi-day with no detail: approximate one session per day, first-day start → last-day end.
  const out: ListedEvent["sessions"] = [];
  const start = new Date(`${s.start_date}T00:00:00Z`).getTime();
  const end = new Date(`${s.end_date}T00:00:00Z`).getTime();
  for (let t = start; t <= end; t += 86_400_000) {
    const date = new Date(t).toISOString().slice(0, 10);
    out.push({
      event_date: date,
      start_time: date === s.start_date ? s.start_time : "00:00",
      end_time: date === s.end_date ? s.end_time : "23:59",
    });
  }
  return out;
}

export function intervalsFor(e: ListedEvent): [number, number][] {
  return sessionsFor(e).map(sessionInterval);
}

/** IST dates on which the event has a session. */
export function eventDays(e: ListedEvent): string[] {
  return [...new Set(sessionsFor(e).map((s) => s.event_date))];
}

export type Availability = "open" | "sold_out" | "closed" | "completed" | "deadline_passed";

export function availability(e: EventSummary, nowMs?: number): Availability {
  if (e.event_status === "COMPLETED") return "completed";
  if (e.event_status === "CLOSED") return "closed";
  if (e.registration_status === "SOLD_OUT" || e.seats_filled >= e.total_seats) return "sold_out";
  if (e.registration_status !== "OPEN") return "closed";
  if (nowMs !== undefined) {
    const d = isoToIst(e.registration_deadline);
    if (d && d.epochMs <= nowMs) return "deadline_passed";
  }
  return "open";
}

export const isPast = (e: EventSummary) => e.event_status === "COMPLETED";

export function seatsLeft(e: EventSummary): number {
  return Math.max(0, e.total_seats - e.seats_filled);
}

export function fitsSquad(e: EventSummary, squad: Squad | null): boolean {
  if (squad === null) return true;
  if (squad === 5) return e.max_teamsize >= 5;
  return e.min_teamsize <= squad && squad <= e.max_teamsize;
}

/** "Solo", "Duos", "Teams of 2–4", "Crews of 4–10" */
export function teamLabel(e: EventSummary): string {
  const { min_teamsize: min, max_teamsize: max } = e;
  if (max === 1) return "Solo";
  if (min === max) return min === 2 ? "Pairs" : `Teams of ${min}`;
  if (min === 1) return `Solo or up to ${max}`;
  return `Teams of ${min}–${max}`;
}

export function formatINR(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}

export type Price = { primary: string; unit: string; perPerson: number | null };

/** Price shown on cards. Per-team fees are split across the chosen squad size. */
export function priceFor(e: EventSummary, squad: Squad | null): Price {
  if (e.price === 0) return { primary: "Free", unit: "", perPerson: 0 };
  if (e.is_per_head) return { primary: formatINR(e.price), unit: "per person", perPerson: e.price };
  const n = squad && fitsSquad(e, squad) ? (squad === 5 ? Math.max(5, e.min_teamsize) : squad) : null;
  if (n && n > 1) {
    return { primary: formatINR(e.price), unit: `per team · ${formatINR(Math.ceil(e.price / n))} each`, perPerson: Math.ceil(e.price / n) };
  }
  return { primary: formatINR(e.price), unit: "per team", perPerson: null };
}

export const modeLabel = (e: EventSummary) => (e.event_mode === "ONLINE" ? "Online" : "On campus");

export function categoryKey(e: EventSummary): string {
  return e.category.trim();
}
