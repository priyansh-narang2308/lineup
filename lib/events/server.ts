import { cacheLife, cacheTag } from "next/cache";
import {
  parseEventDetail,
  parseEventList,
  type EventDetail,
  type EventsPayload,
  type ListedEvent,
} from "./schema";
import { sessionsFor } from "./derive";

export const API_BASE = process.env.EVENTS_API_BASE ?? "https://render72.pages.dev";
const UPSTREAM_TIMEOUT_MS = 6000;

export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: "timeout" | "network" | "http" | "malformed" | "not_found",
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

/** One retry with a short backoff for transient failures (network, timeout, 5xx). */
async function upstream(path: string): Promise<unknown> {
  try {
    return await upstreamOnce(path);
  } catch (err) {
    const transient = err instanceof UpstreamError && (err.code === "timeout" || err.code === "network" || (err.code === "http" && err.status >= 500));
    if (!transient) throw err;
    await new Promise((r) => setTimeout(r, 300));
    return upstreamOnce(path);
  }
}

async function upstreamOnce(path: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (err) {
    const timeout = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    throw new UpstreamError(timeout ? "Events API timed out" : "Events API unreachable", 504, timeout ? "timeout" : "network");
  }
  if (res.status === 404) throw new UpstreamError("Not found", 404, "not_found");
  if (!res.ok) throw new UpstreamError(`Events API responded ${res.status}`, res.status, "http");
  try {
    return await res.json();
  } catch {
    throw new UpstreamError("Events API returned a non-JSON body", 502, "malformed");
  }
}

/**
 * All events, validated, with real sessions for multi-day events.
 * Only multi-day events need their detail (2 of 30 today), so the list costs
 * 1 + k upstream requests per revalidation window — never one per visitor.
 * Throws on failure so failures are never cached; Next keeps serving the last
 * good entry while revalidation fails.
 */
export async function getEvents(): Promise<EventsPayload> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 86_400 });
  cacheTag("events");

  const body = await upstream("/api/test/events");
  let parsed;
  try {
    parsed = parseEventList(body);
  } catch (e) {
    throw new UpstreamError((e as Error).message, 502, "malformed");
  }

  const multiDay = parsed.events.filter((e) => e.schedule_summary.start_date !== e.schedule_summary.end_date);
  const details = await Promise.allSettled(multiDay.map((e) => getEventDetailUncached(e.id)));
  const sessionsById = new Map<string, ListedEvent["sessions"]>();
  details.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value.schedules.length) {
      sessionsById.set(
        multiDay[i].id,
        r.value.schedules.map(({ event_date, start_time, end_time }) => ({ event_date, start_time, end_time })),
      );
    }
  });

  const events: ListedEvent[] = parsed.events.map((e) => {
    const real = sessionsById.get(e.id);
    const isMulti = e.schedule_summary.start_date !== e.schedule_summary.end_date;
    return {
      ...e,
      sessions: real ?? sessionsFor(e),
      ...(isMulti && !real ? { sessions_approximate: true } : {}),
    };
  });

  return { events, invalid: parsed.invalid, fetchedAt: Date.now() };
}

async function getEventDetailUncached(id: string): Promise<EventDetail> {
  const body = await upstream(`/api/test/events/${encodeURIComponent(id)}`);
  try {
    return parseEventDetail(body);
  } catch (e) {
    throw new UpstreamError((e as Error).message, 502, "malformed");
  }
}

export async function getEventDetail(id: string): Promise<EventDetail> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 86_400 });
  cacheTag("events", `event:${id}`);
  return getEventDetailUncached(id);
}

/** Never throws — returns null so pages can render their client-side fallback. */
export async function tryGetEvents(): Promise<EventsPayload | null> {
  try {
    return await getEvents();
  } catch {
    return null;
  }
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
