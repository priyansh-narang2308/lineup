import {
  parseEventDetail,
  parseEventsPayload,
  type EventDetail,
  type EventsPayload,
} from "./schema";

export type FetchErrorKind =
  | "offline"
  | "timeout"
  | "server"
  | "not_found"
  | "malformed"
  | "rate_limited";

export class EventsFetchError extends Error {
  constructor(
    readonly kind: FetchErrorKind,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "EventsFetchError";
  }
}

export type Simulation =
  | "error"
  | "timeout"
  | "offline"
  | "empty"
  | "malformed"
  | "slow"
  | "notfound";
const SIMULATIONS: Simulation[] = [
  "error",
  "timeout",
  "offline",
  "empty",
  "malformed",
  "slow",
  "notfound",
];

export function toSimulation(v: string | null): Simulation | null {
  return v && (SIMULATIONS as string[]).includes(v) ? (v as Simulation) : null;
}

export function readSimulation(): Simulation | null {
  if (typeof window === "undefined") return null;
  return toSimulation(new URLSearchParams(window.location.search).get("simulate"));
}

const ATTEMPT_TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;
const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(signal.reason);
      },
      { once: true },
    );
  });

const retryable = (e: EventsFetchError) =>
  e.kind === "timeout" ||
  e.kind === "server" ||
  e.kind === "rate_limited" ||
  e.kind === "offline";

async function attempt(
  url: string,
  signal: AbortSignal | undefined,
  sim: Simulation | null,
): Promise<unknown> {
  if (sim === "offline")
    throw new EventsFetchError("offline", "You appear to be offline.");
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new EventsFetchError("offline", "You appear to be offline.");
  }
  if (sim === "timeout") {
    await sleep(ATTEMPT_TIMEOUT_MS > 2500 ? 2500 : ATTEMPT_TIMEOUT_MS, signal);
    throw new EventsFetchError(
      "timeout",
      "The events service didn’t respond in time.",
    );
  }
  if (sim === "error") {
    await sleep(350, signal);
    throw new EventsFetchError(
      "server",
      "The events service returned an error (HTTP 503).",
      503,
    );
  }
  if (sim === "slow") await sleep(2500, signal);

  const timeout = AbortSignal.timeout(ATTEMPT_TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: combined,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    if (timeout.aborted)
      throw new EventsFetchError(
        "timeout",
        "The events service didn’t respond in time.",
      );
    throw new EventsFetchError(
      "offline",
      "Couldn’t reach the events service. Check your connection.",
    );
  }
  if (res.status === 404)
    throw new EventsFetchError("not_found", "That event doesn’t exist.", 404);
  if (res.status === 400)
    throw new EventsFetchError(
      "not_found",
      "That isn’t a valid event link.",
      400,
    );
  if (res.status === 429)
    throw new EventsFetchError(
      "rate_limited",
      "Too many requests — retrying shortly.",
      429,
    );
  if (!res.ok)
    throw new EventsFetchError(
      "server",
      `The events service returned an error (HTTP ${res.status}).`,
      res.status,
    );
  try {
    return await res.json();
  } catch {
    throw new EventsFetchError(
      "malformed",
      "The events service sent a response we couldn’t read.",
    );
  }
}

async function withRetry<T>(
  fn: () => Promise<T>,
  signal?: AbortSignal,
  onRetry?: (n: number) => void,
): Promise<T> {
  for (let n = 0; ; n++) {
    try {
      return await fn();
    } catch (err) {
      if (
        !(err instanceof EventsFetchError) ||
        !retryable(err) ||
        n >= MAX_RETRIES ||
        signal?.aborted
      )
        throw err;
      onRetry?.(n + 1);
      const backoff = 400 * 3 ** n + Math.random() * 250; // ~400ms, ~1.2s
      await sleep(backoff, signal);
    }
  }
}

const inflight = new Map<string, Promise<unknown>>();
function dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const p = fn().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

export function fetchEvents(
  opts: { signal?: AbortSignal; onRetry?: (n: number) => void } = {},
): Promise<EventsPayload> {
  const sim = readSimulation();
  return dedupe(`list:${sim ?? ""}`, () =>
    withRetry(
      async () => {
        const body = await attempt("/api/events", opts.signal, sim);
        if (sim === "malformed")
          return parseOrThrow(() => parseEventsPayload({ data: "<html>" }));
        const payload = parseOrThrow(() => parseEventsPayload(body));
        return sim === "empty" ? { ...payload, events: [] } : payload;
      },
      opts.signal,
      opts.onRetry,
    ),
  );
}

const detailCache = new Map<string, EventDetail>();

export function getCachedDetail(id: string): EventDetail | undefined {
  return detailCache.get(id);
}

export function fetchEventDetail(
  id: string,
  opts: { signal?: AbortSignal } = {},
): Promise<EventDetail> {
  const cached = detailCache.get(id);
  if (cached) return Promise.resolve(cached);
  const sim = readSimulation();
  return dedupe(`detail:${id}:${sim ?? ""}`, () =>
    withRetry(async () => {
      if (sim === "notfound")
        throw new EventsFetchError(
          "not_found",
          "That event doesn’t exist.",
          404,
        );
      const body = await attempt(
        `/api/events/${encodeURIComponent(id)}`,
        opts.signal,
        sim === "empty" ? null : sim,
      );
      const detail = parseOrThrow(() => parseEventDetail(body));
      detailCache.set(id, detail);
      return detail;
    }, opts.signal),
  );
}

/** Warm the detail cache on hover/focus intent. Errors are ignored. */
export function prefetchEventDetail(id: string) {
  if (detailCache.has(id) || readSimulation()) return;
  fetchEventDetail(id).catch(() => {});
}

function parseOrThrow<T>(fn: () => T): T {
  try {
    return fn();
  } catch {
    throw new EventsFetchError(
      "malformed",
      "The events service sent data in an unexpected format.",
    );
  }
}
