import { describe, expect, it } from "vitest";
import { MalformedResponseError, parseEventDetail, parseEventList } from "@/lib/events/schema";
import { availability, fitsSquad, priceFor } from "@/lib/events/derive";
import { applyFilters, DEFAULT_FILTERS, filtersToParams, matchesQuery, paramsToFilters, sortEvents } from "@/lib/events/filter";
import { buildIcs } from "@/lib/lineup/ics";
import { decodeLineup, encodeLineup } from "@/lib/lineup/store";
import { ampersand, civicForge, evening, makeEvent, seedStage } from "./fixtures";

const { sessions: _s, ...summary } = seedStage;

describe("parseEventList", () => {
  it("keeps valid events and drops invalid or duplicate ones", () => {
    const r = parseEventList({ events: [summary, { ...summary }, { id: "x" }, null] });
    expect(r.events).toHaveLength(1);
    expect(r.invalid).toBe(3);
  });

  it("throws a typed error for a non-list body (e.g. HTML error page)", () => {
    expect(() => parseEventList("<html>")).toThrow(MalformedResponseError);
    expect(() => parseEventList({ data: [] })).toThrow(MalformedResponseError);
  });
});

describe("parseEventDetail", () => {
  const detail = {
    ...summary,
    description: "Para one.\n\nPara two.",
    banner_image_url: summary.cover_image_url,
    banner_image_alt: "",
    gallery_images: [],
    highlights: ["Great"],
    what_to_expect: [],
    eligibility: [],
    prerequisites: [],
    rules: [],
    prizes: [
      { rank: 1, title: "Winner", amount: 1000, description: "" },
      // Real API quirk: special awards have rank: null
      { rank: null, title: "Special", amount: 500, description: "" },
      { rank: 2, title: "Broken", amount: "lots", description: "" },
    ],
    faqs: [],
    schedules: [{ event_date: "2026-11-14", start_time: "10:00", end_time: "17:00", venue: "Lab" }],
    organizers: [],
    coordinators: [],
  };

  it("accepts null prize ranks and drops only the malformed item", () => {
    const d = parseEventDetail({ event: detail });
    expect(d.prizes.map((p) => p.title)).toEqual(["Winner", "Special"]);
  });

  it("still rejects a detail missing core fields", () => {
    const { schedules: _x, ...broken } = detail;
    expect(() => parseEventDetail({ event: { ...broken, name: 42 } })).toThrow(MalformedResponseError);
  });
});

describe("squad + pricing", () => {
  it("matches team-size rules", () => {
    expect(fitsSquad(seedStage, 1)).toBe(false);
    expect(fitsSquad(seedStage, 3)).toBe(true);
    expect(fitsSquad(ampersand, 5)).toBe(true);
    expect(fitsSquad(evening, null)).toBe(true);
  });

  it("splits per-team fees across the squad and leaves per-head fees alone", () => {
    expect(priceFor(seedStage, 3)).toMatchObject({ primary: "₹600", perPerson: 200 });
    expect(priceFor(seedStage, null)).toMatchObject({ unit: "per team", perPerson: null });
    expect(priceFor(evening, 1)).toMatchObject({ primary: "Free", perPerson: 0 });
  });

  it("derives availability from status, seats and deadline", () => {
    expect(availability(makeEvent({ id: "s", seats_filled: 40 }))).toBe("sold_out");
    expect(availability(makeEvent({ id: "c", event_status: "COMPLETED" }))).toBe("completed");
    expect(availability(seedStage, Date.parse("2026-12-01"))).toBe("deadline_passed");
    expect(availability(seedStage, Date.parse("2026-10-13"))).toBe("open");
  });
});

describe("filters", () => {
  const all = [seedStage, ampersand, evening, civicForge];

  it("searches name, category and tags with every term", () => {
    expect(matchesQuery(seedStage, "venture pitch")).toBe(true);
    expect(matchesQuery(seedStage, "venture dance")).toBe(false);
    expect(matchesQuery(evening, "TESTING")).toBe(true);
  });

  it("combines day, kind, price and squad filters", () => {
    expect(applyFilters(all, { ...DEFAULT_FILTERS, day: "2026-11-15" }, null)).toEqual([evening]);
    expect(applyFilters(all, { ...DEFAULT_FILTERS, free: true }, null)).toEqual([evening]);
    expect(applyFilters(all, { ...DEFAULT_FILTERS, kind: "cultural" }, null)).toEqual([evening]);
    expect(applyFilters(all, DEFAULT_FILTERS, 1)).toEqual([evening]);
    // The overnight hackathon appears on both of its days
    expect(applyFilters(all, { ...DEFAULT_FILTERS, day: "2026-11-13" }, null)).toEqual([civicForge]);
  });

  it("sorts by start time by default", () => {
    expect(sortEvents(all, "start", null).map((e) => e.id)[0]).toBe(civicForge.id);
  });

  it("round-trips through the URL, writing only non-defaults", () => {
    const f = { ...DEFAULT_FILTERS, q: "robot", day: "2026-11-14", free: true };
    const p = filtersToParams(f, "timeline");
    expect(p.toString()).toBe("q=robot&day=2026-11-14&free=1&view=timeline");
    expect(paramsToFilters(p)).toEqual({ filters: f, view: "timeline" });
    expect(paramsToFilters(new URLSearchParams("day=<script>&sort=evil")).filters).toEqual(DEFAULT_FILTERS);
  });
});

describe("share links", () => {
  it("encodes 8-char prefixes and resolves only unambiguous matches", () => {
    const ids = [seedStage.id, ampersand.id, civicForge.id];
    // seedStage and ampersand share the prefix "aaaaaaaa" → ambiguous, ignored
    expect(decodeLineup(encodeLineup([civicForge.id, seedStage.id]), ids)).toEqual([civicForge.id]);
    expect(decodeLineup("not-valid.zz", ids)).toEqual([]);
  });
});

describe("buildIcs", () => {
  it("emits one VEVENT per session in UTC", () => {
    const ics = buildIcs([civicForge], { now: new Date("2026-10-13T00:00:00Z") });
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    // Fri 18:00 IST = 12:30 UTC; Sat 18:00 IST = 12:30 UTC
    expect(ics).toContain("DTSTART:20261113T123000Z");
    expect(ics).toContain("DTEND:20261114T123000Z");
    expect(ics).toContain("SUMMARY:CivicForge 24: Build for the City (day 1 of 2)");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
});
