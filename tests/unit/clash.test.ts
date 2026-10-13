import { describe, expect, it } from "vitest";
import { clashesWith, lineupConflicts, overlapMinutes, packLanes } from "@/lib/events/clash";
import { sessionInterval, istToEpochMin } from "@/lib/events/time";
import { sessionsFor } from "@/lib/events/derive";
import { ampersand, civicForge, evening, frame48, makeEvent, seedStage } from "./fixtures";

describe("time", () => {
  it("converts IST wall-clock to epoch minutes", () => {
    // 2026-11-14 10:00 IST == 04:30 UTC
    expect(istToEpochMin("2026-11-14", "10:00") * 60_000).toBe(Date.UTC(2026, 10, 14, 4, 30));
  });

  it("treats a 23:59 end as midnight so overnight sessions join without a gap", () => {
    const [, endFri] = sessionInterval(civicForge.sessions[0]);
    const [startSat] = sessionInterval(civicForge.sessions[1]);
    expect(endFri).toBe(startSat);
  });
});

describe("overlapMinutes", () => {
  it("detects the overnight hackathon overlapping a Saturday daytime event", () => {
    // CivicForge runs until Sat 18:00; Seed Stage is Sat 10:00–17:00 → 7h
    expect(overlapMinutes(civicForge, seedStage)).toBe(7 * 60);
  });

  it("uses real sessions for multi-day events, not the whole span", () => {
    // Frame/48 has a Sat 10:00–17:00 session; Ampersand is Sat 15:00–21:00 → 2h, not 6h
    expect(overlapMinutes(frame48, ampersand)).toBe(2 * 60);
    // Sunday evening is outside Frame/48's Sunday 10:00–17:00 session
    expect(overlapMinutes(frame48, evening)).toBe(0);
  });

  it("sums overlaps across several shared days", () => {
    // Frame/48 Fri+Sat 10–17 vs CivicForge Fri 18–24, Sat 00–18 → only Sat 10–17 = 7h
    expect(overlapMinutes(frame48, civicForge)).toBe(7 * 60);
  });

  it("does not count back-to-back events as clashing", () => {
    const a = makeEvent({ id: "a", sessions: [{ event_date: "2026-11-14", start_time: "10:00", end_time: "13:30" }] });
    const b = makeEvent({ id: "b", sessions: [{ event_date: "2026-11-14", start_time: "13:30", end_time: "15:00" }] });
    expect(overlapMinutes(a, b)).toBe(0);
  });

  it("never clashes an event with itself", () => {
    expect(overlapMinutes(seedStage, seedStage)).toBe(0);
  });
});

describe("clashesWith / lineupConflicts", () => {
  it("lists clashes sorted by overlap, excluding the event itself", () => {
    const clashes = clashesWith(seedStage, [seedStage, ampersand, civicForge]);
    expect(clashes.map((c) => c.with.id)).toEqual([civicForge.id, ampersand.id]);
    expect(clashes.map((c) => c.minutes)).toEqual([420, 120]);
  });

  it("finds every conflicting pair in a lineup", () => {
    const pairs = lineupConflicts([seedStage, ampersand, evening]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].minutes).toBe(120);
  });
});

describe("sessionsFor", () => {
  it("approximates multi-day events without detail as continuous coverage", () => {
    const noDetail = { ...frame48, sessions: [] };
    const s = sessionsFor(noDetail);
    expect(s).toHaveLength(3);
    expect(s[0]).toEqual({ event_date: "2026-11-13", start_time: "10:00", end_time: "23:59" });
    expect(s[2]).toEqual({ event_date: "2026-11-15", start_time: "00:00", end_time: "17:00" });
  });
});

describe("packLanes", () => {
  it("places non-overlapping events in the same lane", () => {
    const lanes = packLanes([
      { id: "a", start: 0, end: 60 },
      { id: "b", start: 30, end: 90 },
      { id: "c", start: 60, end: 120 },
    ]);
    expect(lanes.get("a")).toBe(lanes.get("c"));
    expect(lanes.get("b")).not.toBe(lanes.get("a"));
  });
});
