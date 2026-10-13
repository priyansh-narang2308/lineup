import type { EventSummary, ListedEvent } from "./schema";
import { availability, sessionsFor, type Availability } from "./derive";
import { formatDay, formatDeadline, isoToIst, weekdayShort } from "./time";

/** "10:00 – 17:00" or "Fri 18:00 → Sat 18:00" for multi-day events. */
export function timeRange(e: EventSummary): string {
  const s = e.schedule_summary;
  if (s.start_date === s.end_date) return `${s.start_time} – ${s.end_time}`;
  return `${weekdayShort(s.start_date)} ${s.start_time} → ${weekdayShort(s.end_date)} ${s.end_time}`;
}

export function dateLabel(e: EventSummary): string {
  return formatDay(e.schedule_summary.start_date);
}

export function sessionCount(e: ListedEvent): number {
  return sessionsFor(e).length;
}

export const availabilityLabel: Record<Availability, string> = {
  open: "Open",
  sold_out: "Sold out",
  closed: "Registration closed",
  completed: "Completed",
  deadline_passed: "Deadline passed",
};

/** Status badge shown in card footers. */
export function statusBadge(e: EventSummary): { tone: "warn" | "neutral"; label: string } {
  const a = availability(e);
  if (a === "open") {
    const d = isoToIst(e.registration_deadline);
    return { tone: "warn", label: d ? `Closes ${formatDeadline(e.registration_deadline).split(",")[0]}` : "Open" };
  }
  return { tone: "neutral", label: availabilityLabel[a] };
}
