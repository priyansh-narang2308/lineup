const IST_OFFSET_MIN = 330;
const DAY_MS = 86_400_000;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const WEEKDAYS_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function parseClock(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  return h * 60 + m;
}

/** Epoch minutes for an IST date + clock time. */
export function istToEpochMin(date: string, hhmm: string): number {
  const [y, mo, d] = date.split("-").map(Number);
  const utcMs = Date.UTC(y, mo - 1, d) + parseClock(hhmm) * 60_000;
  return Math.round(utcMs / 60_000) - IST_OFFSET_MIN;
}

/** Interval in epoch minutes. "23:59" end is treated as midnight so overnight sessions join up. */
export function sessionInterval(s: {
  event_date: string;
  start_time: string;
  end_time: string;
}): [number, number] {
  const start = istToEpochMin(s.event_date, s.start_time);
  let end = istToEpochMin(
    s.event_date,
    s.end_time === "23:59" ? "24:00" : s.end_time,
  );
  if (end <= start) end += 24 * 60; // defensive: session crossing midnight
  return [start, end];
}

function dateParts(date: string) {
  const [y, mo, d] = date.split("-").map(Number);
  const dow = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
  return { y, mo, d, dow };
}

/** "Sat 14 Nov" */
export function formatDay(date: string): string {
  const { mo, d, dow } = dateParts(date);
  return `${WEEKDAYS[dow]} ${d} ${MONTHS[mo - 1]}`;
}

/** "Saturday" */
export function weekdayLong(date: string): string {
  return WEEKDAYS_LONG[dateParts(date).dow];
}

/** "Sat" */
export function weekdayShort(date: string): string {
  return WEEKDAYS[dateParts(date).dow];
}

/** "14 Nov" */
export function formatDayMonth(date: string): string {
  const { mo, d } = dateParts(date);
  return `${d} ${MONTHS[mo - 1]}`;
}

export function monthShort(date: string): string {
  return MONTHS[dateParts(date).mo - 1];
}

export function dayOfMonth(date: string): number {
  return dateParts(date).d;
}

/** Wall-clock IST parts of an ISO timestamp with offset (registration_deadline). */
export function isoToIst(
  iso: string,
): { date: string; time: string; epochMs: number } | null {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  const ist = new Date(ms + IST_OFFSET_MIN * 60_000);
  const date = ist.toISOString().slice(0, 10);
  const time = ist.toISOString().slice(11, 16);
  return { date, time, epochMs: ms };
}

/** "6 Nov, 18:00" */
export function formatDeadline(iso: string): string {
  const p = isoToIst(iso);
  if (!p) return "Date unavailable";
  return `${formatDayMonth(p.date)}, ${p.time}`;
}

/** Relative countdown — only call on the client after mount (depends on now). */
export function relativeDays(targetMs: number, nowMs: number): string {
  const diff = targetMs - nowMs;
  if (diff <= 0) return "closed";
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return hours <= 1 ? "in 1 hour" : `in ${hours} hours`;
  const days = Math.round(diff / DAY_MS);
  return days === 1 ? "in 1 day" : `in ${days} days`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}
