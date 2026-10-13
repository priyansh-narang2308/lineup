import * as z from "zod/mini";

/**
 * Runtime contracts for the Render72 Events API.
 * https://render72.pages.dev/api/test/events
 *
 * Enum-like fields are validated as strings so a new upstream value degrades
 * to a neutral UI state instead of failing the whole list.
 */

const scheduleSummary = z.object({
  start_date: z.string(),
  start_time: z.string(),
  end_date: z.string(),
  end_time: z.string(),
});

export const eventSummarySchema = z.object({
  id: z.string().check(z.minLength(1)),
  name: z.string().check(z.minLength(1)),
  blurb: z.string(),
  cover_image_url: z.string(),
  cover_image_alt: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
  event_type: z.string(),
  event_mode: z.string(),
  event_status: z.string(),
  is_featured: z.boolean(),
  is_technical: z.boolean(),
  price: z.number(),
  is_per_head: z.boolean(),
  min_teamsize: z.number(),
  max_teamsize: z.number(),
  total_seats: z.number(),
  seats_filled: z.number(),
  registration_status: z.string(),
  registration_deadline: z.string(),
  schedule_summary: scheduleSummary,
});

const sessionSchema = z.object({
  event_date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  venue: z.string(),
});

export const eventDetailSchema = z.extend(eventSummarySchema, {
  description: z.string(),
  banner_image_url: z.string(),
  banner_image_alt: z.string(),
  gallery_images: z.array(z.string()),
  highlights: z.array(z.string()),
  what_to_expect: z.array(z.string()),
  eligibility: z.array(z.string()),
  prerequisites: z.array(z.string()),
  rules: z.array(z.string()),
  prizes: z.array(
    z.object({
      // Special awards come through with rank: null.
      rank: z.nullable(z.number()),
      title: z.string(),
      amount: z.nullable(z.number()),
      description: z.string(),
    }),
  ),
  faqs: z.array(z.object({ question: z.string(), answer: z.string() })),
  schedules: z.array(sessionSchema),
  organizers: z.array(
    z.object({ id: z.string(), name: z.string(), org_type: z.string() }),
  ),
  coordinators: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      role: z.string(),
      contact: z.string(),
    }),
  ),
});

export type EventSummary = z.infer<typeof eventSummarySchema>;
export type EventDetail = z.infer<typeof eventDetailSchema>;
export type Session = z.infer<typeof sessionSchema>;

/** A list event enriched with its real sessions (from detail, when multi-day). */
export type ListedEvent = EventSummary & {
  sessions: Pick<Session, "event_date" | "start_time" | "end_time">[];
  /** True when sessions were derived from schedule_summary because detail was unavailable. */
  sessions_approximate?: boolean;
};

export type EventsPayload = {
  events: ListedEvent[];
  /** Events dropped because they failed validation. */
  invalid: number;
  fetchedAt: number;
};

/** Validate the list body item-by-item so one bad record never blanks the page. */
export function parseEventList(body: unknown): {
  events: EventSummary[];
  invalid: number;
} {
  if (
    !body ||
    typeof body !== "object" ||
    !Array.isArray((body as { events?: unknown }).events)
  ) {
    throw new MalformedResponseError(
      "Expected an object with an `events` array.",
    );
  }
  const raw = (body as { events: unknown[] }).events;
  const events: EventSummary[] = [];
  let invalid = 0;
  const seen = new Set<string>();
  for (const item of raw) {
    const r = eventSummarySchema.safeParse(item);
    if (r.success && !seen.has(r.data.id)) {
      seen.add(r.data.id);
      events.push(r.data);
    } else invalid++;
  }
  return { events, invalid };
}

/** Optional list sections: a malformed item drops that item, never the whole event. */
const LIST_SECTIONS = [
  "gallery_images",
  "highlights",
  "what_to_expect",
  "eligibility",
  "prerequisites",
  "rules",
  "prizes",
  "faqs",
  "organizers",
  "coordinators",
] as const;

export function parseEventDetail(body: unknown): EventDetail {
  const raw = body && typeof body === "object" ? (body as { event?: unknown }).event : undefined;
  if (!raw || typeof raw !== "object") {
    throw new MalformedResponseError("Event detail did not match the expected shape.");
  }
  const event = { ...(raw as Record<string, unknown>) };
  const shape = eventDetailSchema.def.shape;
  for (const key of LIST_SECTIONS) {
    const item = (shape[key] as z.ZodMiniArray).def.element;
    const value = event[key];
    event[key] = Array.isArray(value) ? value.filter((v) => z.safeParse(item, v).success) : [];
  }
  const r = eventDetailSchema.safeParse(event);
  if (!r.success) {
    throw new MalformedResponseError("Event detail did not match the expected shape.");
  }
  return r.data;
}

const listedEventSchema = z.extend(eventSummarySchema, {
  sessions: z.array(
    z.object({
      event_date: z.string(),
      start_time: z.string(),
      end_time: z.string(),
    }),
  ),
  sessions_approximate: z.optional(z.boolean()),
});

/** Validates our own /api/events payload on the client. */
export function parseEventsPayload(body: unknown): EventsPayload {
  if (
    !body ||
    typeof body !== "object" ||
    !Array.isArray((body as { events?: unknown }).events)
  ) {
    throw new MalformedResponseError(
      "Expected an object with an `events` array.",
    );
  }
  const b = body as {
    events: unknown[];
    invalid?: unknown;
    fetchedAt?: unknown;
  };
  const events: ListedEvent[] = [];
  let invalid = typeof b.invalid === "number" ? b.invalid : 0;
  for (const item of b.events) {
    const r = listedEventSchema.safeParse(item);
    if (r.success) events.push(r.data);
    else invalid++;
  }
  return {
    events,
    invalid,
    fetchedAt: typeof b.fetchedAt === "number" ? b.fetchedAt : Date.now(),
  };
}

export class MalformedResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MalformedResponseError";
  }
}
