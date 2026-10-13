import type { ListedEvent } from "@/lib/events/schema";
import { sessionsFor } from "@/lib/events/derive";
import { sessionInterval } from "@/lib/events/time";

const pad = (n: number) => String(n).padStart(2, "0");
function utcStamp(epochMin: number): string {
  const d = new Date(epochMin * 60_000);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
}

function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length) {
    parts.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  return parts.join("\r\n");
}

export function buildIcs(
  events: ListedEvent[],
  opts: {
    venues?: Record<string, Record<string, string>>;
    url?: string;
    now?: Date;
  } = {},
): string {
  const stamp = utcStamp(
    Math.floor((opts.now ?? new Date()).getTime() / 60_000),
  );
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lineup//Render72//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:My Lineup",
  ];
  for (const e of events) {
    const sessions = sessionsFor(e);
    sessions.forEach((s, i) => {
      const [start, end] = sessionInterval(s);
      const venue = opts.venues?.[e.id]?.[s.event_date];
      const title =
        sessions.length > 1
          ? `${e.name} (day ${i + 1} of ${sessions.length})`
          : e.name;
      lines.push(
        "BEGIN:VEVENT",
        `UID:${e.id}-${i}@lineup`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${utcStamp(start)}`,
        `DTEND:${utcStamp(end)}`,
        fold(`SUMMARY:${escapeText(title)}`),
        fold(
          `DESCRIPTION:${escapeText(e.blurb + (opts.url ? `\n\n${opts.url}` : ""))}`,
        ),
        ...(venue ? [fold(`LOCATION:${escapeText(venue)}`)] : []),
        "END:VEVENT",
      );
    });
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
