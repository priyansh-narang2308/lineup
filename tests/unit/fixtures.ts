import type { ListedEvent } from "@/lib/events/schema";

/** Minimal event factory mirroring the Render72 API shape. */
export function makeEvent(overrides: Partial<ListedEvent> & { id: string }): ListedEvent {
  const base: ListedEvent = {
    id: overrides.id,
    name: `Event ${overrides.id}`,
    blurb: "A test event.",
    cover_image_url: "https://images.pexels.com/photos/1/pexels-photo-1.jpeg",
    cover_image_alt: "",
    category: "Coding",
    tags: ["Testing"],
    event_type: "EVENT",
    event_mode: "OFFLINE",
    event_status: "ACTIVE",
    is_featured: false,
    is_technical: true,
    price: 600,
    is_per_head: false,
    min_teamsize: 2,
    max_teamsize: 4,
    total_seats: 40,
    seats_filled: 10,
    registration_status: "OPEN",
    registration_deadline: "2026-11-10T18:00:00+05:30",
    schedule_summary: { start_date: "2026-11-14", start_time: "10:00", end_date: "2026-11-14", end_time: "17:00" },
    sessions: [{ event_date: "2026-11-14", start_time: "10:00", end_time: "17:00" }],
  };
  return { ...base, ...overrides };
}

/** Real shapes from the API: overnight hackathon and a 3-day sprint with daily sessions. */
export const civicForge = makeEvent({
  id: "dff53692-cd0c-5464-9282-d90b791d9ecb",
  name: "CivicForge 24: Build for the City",
  schedule_summary: { start_date: "2026-11-13", start_time: "18:00", end_date: "2026-11-14", end_time: "18:00" },
  sessions: [
    { event_date: "2026-11-13", start_time: "18:00", end_time: "23:59" },
    { event_date: "2026-11-14", start_time: "00:00", end_time: "18:00" },
  ],
});

export const frame48 = makeEvent({
  id: "b9148fa1-2795-563d-85a4-68d1f5ffe979",
  name: "Frame / Forty-Eight: Short Film Sprint",
  schedule_summary: { start_date: "2026-11-13", start_time: "10:00", end_date: "2026-11-15", end_time: "17:00" },
  sessions: [
    { event_date: "2026-11-13", start_time: "10:00", end_time: "17:00" },
    { event_date: "2026-11-14", start_time: "10:00", end_time: "17:00" },
    { event_date: "2026-11-15", start_time: "10:00", end_time: "17:00" },
  ],
});

export const seedStage = makeEvent({ id: "aaaaaaaa-0000-0000-0000-000000000001", name: "Seed Stage: The Campus Venture Pitch" });

export const ampersand = makeEvent({
  id: "aaaaaaaa-0000-0000-0000-000000000002",
  name: "Ampersand: Battle of the Bands",
  min_teamsize: 3,
  max_teamsize: 8,
  price: 800,
  schedule_summary: { start_date: "2026-11-14", start_time: "15:00", end_date: "2026-11-14", end_time: "21:00" },
  sessions: [{ event_date: "2026-11-14", start_time: "15:00", end_time: "21:00" }],
});

export const evening = makeEvent({
  id: "aaaaaaaa-0000-0000-0000-000000000003",
  name: "SkyLedger: A Guided Observing Night",
  is_technical: false,
  price: 0,
  is_per_head: true,
  min_teamsize: 1,
  max_teamsize: 1,
  schedule_summary: { start_date: "2026-11-15", start_time: "18:30", end_date: "2026-11-15", end_time: "21:30" },
  sessions: [{ event_date: "2026-11-15", start_time: "18:30", end_time: "21:30" }],
});
