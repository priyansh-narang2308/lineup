import type { ListedEvent } from "./schema";
import {
  availability,
  eventDays,
  fitsSquad,
  seatsLeft,
  type Squad,
} from "./derive";
import { isoToIst, istToEpochMin } from "./time";

export type Sort = "start" | "deadline" | "price" | "seats";
export type View = "cards" | "timeline";

export type Filters = {
  q: string;
  day: string | null; // "2026-11-14"
  kind: "all" | "technical" | "cultural";
  free: boolean;
  openOnly: boolean;
  online: boolean;
  sort: Sort;
};

export const DEFAULT_FILTERS: Filters = {
  q: "",
  day: null,
  kind: "all",
  free: false,
  openOnly: false,
  online: false,
  sort: "start",
};

const norm = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

/** Every term must match name, blurb, category or a tag. */
export function matchesQuery(e: ListedEvent, q: string): boolean {
  const terms = norm(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const hay = norm(
    [
      e.name,
      e.blurb,
      e.category,
      e.event_type,
      e.event_mode === "ONLINE" ? "online" : "on campus offline",
      ...e.tags,
    ].join(" "),
  );
  return terms.every((t) => hay.includes(t));
}

export function applyFilters(
  events: ListedEvent[],
  f: Filters,
  squad: Squad | null,
): ListedEvent[] {
  return events.filter((e) => {
    if (!matchesQuery(e, f.q)) return false;
    if (f.day && !eventDays(e).includes(f.day)) return false;
    if (f.kind === "technical" && !e.is_technical) return false;
    if (f.kind === "cultural" && e.is_technical) return false;
    if (f.free && e.price !== 0) return false;
    if (f.online && e.event_mode !== "ONLINE") return false;
    if (f.openOnly && availability(e) !== "open") return false;
    if (!fitsSquad(e, squad)) return false;
    return true;
  });
}

const startOf = (e: ListedEvent) =>
  istToEpochMin(e.schedule_summary.start_date, e.schedule_summary.start_time);
const deadlineOf = (e: ListedEvent) =>
  isoToIst(e.registration_deadline)?.epochMs ?? Infinity;

export function sortEvents(
  events: ListedEvent[],
  sort: Sort,
  squad: Squad | null,
): ListedEvent[] {
  const list = [...events];
  const perPerson = (e: ListedEvent) =>
    e.is_per_head || e.price === 0
      ? e.price
      : e.price / (squad && squad > 1 ? squad : Math.max(1, e.min_teamsize));
  const by: Record<Sort, (a: ListedEvent, b: ListedEvent) => number> = {
    start: (a, b) => startOf(a) - startOf(b),
    deadline: (a, b) =>
      Number(availability(b) === "open") - Number(availability(a) === "open") ||
      deadlineOf(a) - deadlineOf(b),
    price: (a, b) => perPerson(a) - perPerson(b) || startOf(a) - startOf(b),
    seats: (a, b) =>
      Number(availability(b) === "open") - Number(availability(a) === "open") ||
      seatsLeft(a) - seatsLeft(b),
  };
  return list.sort((a, b) => by[sort](a, b) || a.name.localeCompare(b.name));
}

/** Upcoming events grouped by first day; completed and organiser-closed events returned separately. */
export function groupByDay(events: ListedEvent[]): {
  upcoming: { day: string; events: ListedEvent[] }[];
  past: ListedEvent[];
} {
  const inactive = (e: ListedEvent) => e.event_status !== "ACTIVE";
  const past = events.filter(inactive);
  const map = new Map<string, ListedEvent[]>();
  for (const e of events) {
    if (inactive(e)) continue;
    const d = e.schedule_summary.start_date;
    (map.get(d) ?? map.set(d, []).get(d)!).push(e);
  }
  return {
    upcoming: [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, events]) => ({ day, events })),
    past,
  };
}

export function activeFilterCount(f: Filters): number {
  return [
    f.q.trim() !== "",
    f.day !== null,
    f.kind !== "all",
    f.free,
    f.openOnly,
    f.online,
  ].filter(Boolean).length;
}

/** URL <-> filters (only non-default values are written). */
export function filtersToParams(f: Filters, view: View): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.day) p.set("day", f.day);
  if (f.kind !== "all") p.set("kind", f.kind);
  if (f.free) p.set("free", "1");
  if (f.openOnly) p.set("open", "1");
  if (f.online) p.set("online", "1");
  if (f.sort !== "start") p.set("sort", f.sort);
  if (view !== "cards") p.set("view", view);
  return p;
}

export function paramsToFilters(p: URLSearchParams): {
  filters: Filters;
  view: View;
} {
  const kind = p.get("kind");
  const sort = p.get("sort");
  const day = p.get("day");
  return {
    filters: {
      q: (p.get("q") ?? "").slice(0, 80),
      day: day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null,
      kind: kind === "technical" || kind === "cultural" ? kind : "all",
      free: p.get("free") === "1",
      openOnly: p.get("open") === "1",
      online: p.get("online") === "1",
      sort:
        sort === "deadline" || sort === "price" || sort === "seats"
          ? sort
          : "start",
    },
    view: p.get("view") === "timeline" ? "timeline" : "cards",
  };
}
