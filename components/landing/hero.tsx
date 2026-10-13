import { ArrowRight } from "lucide-react";
import type { EventsPayload, ListedEvent } from "@/lib/events/schema";
import { availability, sessionsFor } from "@/lib/events/derive";
import { clashesWith, packLanes } from "@/lib/events/clash";
import { eventsOnDay, festDays, peakConcurrency } from "@/lib/events/insights";
import {
  formatDayMonth,
  formatDuration,
  istToEpochMin,
  parseClock,
  weekdayLong,
  weekdayShort,
} from "@/lib/events/time";
import { formatINR } from "@/lib/events/derive";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { Reveal } from "@/components/motion/reveal";

export function Hero({ data }: { data: EventsPayload | null }) {
  const events = data?.events ?? [];
  const active = events.filter((e) => e.event_status === "ACTIVE");
  const days = festDays(events);
  const range = days.length
    ? `${formatDayMonth(days[0]).split(" ")[0]}–${formatDayMonth(days[days.length - 1])}`
    : null;

  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 -top-105 h-225 w-350 max-w-none -translate-x-1/2 bg-[radial-gradient(closest-side,rgb(205_255_90/0.085),transparent)]"
      />
      <div className="container-page relative flex flex-col items-center pt-16 text-center sm:pt-24 lg:pt-28">
        {/* LCP text: CSS entrance animation, painted immediately on first frame. */}
        <div className="mt-6 flex justify-center animate-rise">
          <h1
            id="hero-title"
            className="text-display-xl max-w-[14ch] text-balance"
          >
            Your fest, without the clashes.
          </h1>
        </div>
        <p className="mt-6 max-w-152 text-[17px] leading-7 text-fg-2 sm:text-[18px] sm:leading-7 animate-rise [animation-delay:60ms]">
          Most of this weekend&apos;s events overlap. Pick what you love -
          Lineup flags every clash, matches events to your squad size and keeps
          every registration deadline in view.
        </p>
        <div className="mt-8 flex flex-col items-stretch gap-3 self-stretch sm:flex-row sm:items-center sm:self-auto animate-rise [animation-delay:120ms]">
          <ButtonLink
            href="/events"
            iconRight={<ArrowRight aria-hidden className="size-4" />}
          >
            Build your lineup
          </ButtonLink>
          <ButtonLink href="/events?view=cards" variant="secondary">
            Browse all {events.length || ""} events
          </ButtonLink>
        </div>
      </div>
      {data && <HeroPreview events={events} />}
    </section>
  );
}

type Block = {
  e: ListedEvent;
  start: number;
  end: number;
  lane: number;
  kind: "in" | "clash" | "default" | "muted";
  meta: string;
  continues?: string;
};

function buildPreview(events: ListedEvent[]) {
  const peak = peakConcurrency(events);
  const day = peak.day || festDays(events)[0];
  if (!day) return null;
  const dayEvents = eventsOnDay(events, day);
  const AX0 = 9,
    AX1 = 21;
  const ax0 = istToEpochMin(day, "09:00");
  const ax1 = istToEpochMin(day, "21:00");

  const sessionOn = (e: ListedEvent) =>
    sessionsFor(e).find((s) => s.event_date === day)!;
  const span = (e: ListedEvent) => {
    const s = sessionOn(e);
    const a = istToEpochMin(day, s.start_time);
    const b = istToEpochMin(day, s.end_time === "23:59" ? "24:00" : s.end_time);
    return [Math.max(a, ax0), Math.min(b, ax1)] as const;
  };

  const open = dayEvents
    .filter((e) => availability(e) === "open")
    .sort((a, b) => span(a)[0] - span(b)[0]);
  const picks: ListedEvent[] = [];
  for (const e of open) {
    const [a, b] = span(e);
    if (b - a > 4 * 60) continue;
    if (picks.every((p) => clashesWith(e, [p]).length === 0)) picks.push(e);
    if (picks.length === 2) break;
  }

  const others = dayEvents.filter((e) => !picks.includes(e));
  const lanes = packLanes(
    others.map((e) => ({ id: e.id, start: span(e)[0], end: span(e)[1] })),
  );
  const blocks: Block[] = [];
  for (const e of picks) {
    const [start, end] = span(e);
    blocks.push({
      e,
      start,
      end,
      lane: 0,
      kind: "in",
      meta: `${sessionOn(e).start_time}–${sessionOn(e).end_time} · ${e.price ? formatINR(e.price) : "Free"}`,
    });
  }
  for (const e of others) {
    const [start, end] = span(e);
    const c = clashesWith(e, picks);
    const s = sessionOn(e);
    const unavailable = availability(e) !== "open";
    const all = sessionsFor(e);
    const idx = all.findIndex((x) => x.event_date === day);
    const continues = e.sessions_approximate
      ? "times approx."
      : idx > 0 && s.start_time === "00:00" && all[idx - 1].end_time === "23:59"
        ? `overnight from ${weekdayShort(all[idx - 1].event_date)}`
        : all.length > 1
          ? `day ${idx + 1} of ${all.length}`
          : undefined;
    blocks.push({
      e,
      start,
      end,
      lane: (lanes.get(e.id) ?? 0) + (picks.length ? 1 : 0),
      kind: unavailable ? "muted" : c.length ? "clash" : "default",
      meta: unavailable
        ? "Sold out"
        : c.length
          ? `clashes ${formatDuration(c.reduce((t, x) => t + x.minutes, 0))}`
          : `${s.start_time}–${s.end_time}`,
      continues,
    });
  }

  const focus = blocks
    .filter((b) => b.kind === "clash")
    .map((b) => ({ b, c: clashesWith(b.e, picks) }))
    .sort(
      (x, y) =>
        y.c.length - x.c.length || x.b.end - x.b.start - (y.b.end - y.b.start),
    )[0];
  if (focus) {
    // Pin it directly under the lineup lane; shift everything else down.
    for (const b of blocks) if (b !== focus.b && b.lane >= 1) b.lane += 1;
    focus.b.lane = picks.length ? 1 : 0;
    // Close any lane gap left behind.
    const used = [...new Set(blocks.map((b) => b.lane))].sort((a, b) => a - b);
    for (const b of blocks) b.lane = used.indexOf(b.lane);
  }

  return { day, AX0, AX1, ax0, picks, blocks, focus, peak };
}

function HeroPreview({ events }: { events: ListedEvent[] }) {
  const p = buildPreview(events);
  if (!p) return null;
  const { day, AX0, AX1, ax0, picks, blocks, focus, peak } = p;
  const hours = AX1 - AX0;
  const pct = (min: number) => ((min - ax0) / (hours * 60)) * 100;
  const LANE = 64;
  const laneCount = Math.max(...blocks.map((b) => b.lane)) + 1;
  const days = festDays(events);
  const total = picks.reduce((t, e) => t + e.price, 0);

  return (
    <div className="container-page relative mt-14 sm:mt-16">
      <Reveal delay={0.16} y={24} className="relative mx-auto max-w-295">
        <div
          className="relative overflow-hidden rounded-[20px] border border-line bg-surface shadow-(--shadow-overlay)"
          role="img"
          aria-label={`Preview of the ${weekdayLong(day)} timeline: ${picks.map((e) => e.name).join(" and ")} are in the lineup; overlapping events are flagged as clashes.`}
        >
          <div className="flex h-14 items-center justify-between gap-3 border-b border-line-subtle px-4 sm:px-5">
            <div className="flex items-center gap-0.5 rounded-full border border-line bg-raised p-0.75">
              {days.map((d) => (
                <span
                  key={d}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium",
                    d === day ? "bg-hover text-fg" : "text-fg-3",
                  )}
                >
                  {weekdayShort(d)} {Number(d.slice(8))}
                  <span
                    className={cn(
                      "font-mono text-[11px]",
                      d === day ? "text-accent" : "text-fg-3",
                    )}
                  >
                    {eventsOnDay(events, d).length}
                  </span>
                </span>
              ))}
            </div>
            <div className="hidden items-center gap-4 text-[12px] font-medium text-fg-2 md:flex">
              <span className="flex items-center gap-1.5">
                <i className="size-2.5 rounded-[3px] bg-accent" />
                In your lineup
              </span>
              <span className="flex items-center gap-1.5">
                <i className="size-2.5 rounded-[3px] bg-clash" />
                Clashes
              </span>
              <span className="flex items-center gap-1.5">
                <i className="size-2.5 rounded-[3px] bg-fg-3/60" />
                Sold out
              </span>
            </div>
          </div>

          <div className="relative overflow-hidden mask-[linear-gradient(to_right,black_80%,transparent)] md:mask-none">
            <div
              className="relative min-w-[880px] px-5"
              style={{ height: 48 + laneCount * LANE }}
            >
              {Array.from({ length: hours + 1 }, (_, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0"
                  style={{ left: `calc(20px + (100% - 40px) * ${i / hours})` }}
                >
                  <div
                    className={cn(
                      "h-full w-px",
                      (AX0 + i) % 3 === 0 ? "bg-line" : "bg-line-subtle",
                    )}
                  />
                  <span className="absolute left-1.5 top-2.5 font-mono text-[11px] text-fg-3">
                    {String(AX0 + i).padStart(2, "0")}:00
                  </span>
                </div>
              ))}
              {blocks.map((b) => (
                <div
                  key={b.e.id}
                  className={cn(
                    "absolute flex h-[54px] items-center gap-2.5 overflow-hidden rounded-[10px] border py-1 pl-1 pr-2.5 text-left",
                    b.kind === "in" && "border-accent bg-accent-subtle",
                    b.kind === "clash" &&
                      (focus?.b === b
                        ? "border-dashed border-clash bg-clash-subtle"
                        : "border-line bg-raised"),
                    b.kind === "default" && "border-line bg-raised",
                    b.kind === "muted" && "border-line-subtle bg-surface",
                  )}
                  style={{
                    top: 40 + b.lane * LANE,
                    left: `calc(20px + (100% - 40px) * ${pct(b.start) / 100} + 2px)`,
                    width: `calc((100% - 40px) * ${(pct(b.end) - pct(b.start)) / 100} - 4px)`,
                  }}
                >
                  <span
                    className={cn(
                      "h-full w-[3px] shrink-0 rounded-full",
                      b.kind === "in"
                        ? "bg-accent"
                        : b.kind === "clash"
                          ? "bg-clash"
                          : "bg-line-strong",
                    )}
                  />
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block truncate text-[12px] font-medium",
                        b.kind === "muted" ? "text-fg-2" : "text-fg",
                      )}
                    >
                      {b.continues
                        ? `${b.e.name.split(":")[0]} · ${b.continues}`
                        : b.e.name}
                    </span>
                    <span
                      className={cn(
                        "block truncate font-mono text-[11px]",
                        b.kind === "in"
                          ? "text-accent"
                          : b.kind === "clash"
                            ? "text-clash"
                            : "text-fg-3",
                      )}
                    >
                      {b.meta}
                    </span>
                  </span>
                </div>
              ))}
              {focus && (
                <div
                  className="absolute z-10 hidden items-center gap-2.5 rounded-xl border border-line-strong bg-elevated px-3.5 py-2.5 shadow-[var(--shadow-overlay)] lg:flex"
                  style={{
                    top: 40 + focus.b.lane * LANE + 8,
                    left: `calc(20px + (100% - 40px) * ${pct(focus.b.end) / 100} + 12px)`,
                  }}
                >
                  <span className="text-[12px] font-medium text-clash">
                    Clashes with {focus.c.length}
                  </span>
                  <span className="text-[12px] text-fg-2">
                    {focus.c
                      .map(
                        (c) =>
                          `${c.with.name.split(":")[0]} · ${formatDuration(c.minutes)}`,
                      )
                      .join("   ")}
                  </span>
                </div>
              )}
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-surface"
            />
          </div>
        </div>

        {picks.length === 2 && (
          <aside
            aria-label="Example lineup summary"
            className="absolute -right-6 top-[140px] hidden w-[340px] rounded-[18px] border border-line-strong bg-raised p-4 text-left shadow-[var(--shadow-overlay)] xl:block"
          >
            <div className="flex items-center justify-between">
              <p className="text-[17px] font-semibold tracking-[-0.01em]">
                Your {weekdayLong(day)}
              </p>
              <span className="rounded-full bg-accent-subtle px-2 py-0.5 text-[12px] font-medium text-accent">
                Clash-free
              </span>
            </div>
            <p className="mt-1 text-[13px] text-fg-3">
              {picks.length} events · {formatINR(total)} total
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {picks.map((e) => {
                const s = sessionsFor(e).find((x) => x.event_date === day)!;
                return (
                  <li
                    key={e.id}
                    className="flex gap-3 rounded-xl bg-elevated p-3"
                  >
                    <span className="w-11 shrink-0 font-mono text-[12px] leading-4">
                      {s.start_time}
                      <br />
                      <span className="text-fg-3">{s.end_time}</span>
                    </span>
                    <span className="min-w-0 text-[13px] leading-5 font-medium">
                      {e.name}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2.5 pl-3 font-mono text-[11px] text-fg-3">
              {formatDuration(
                parseClock(
                  sessionsFor(picks[1]).find((x) => x.event_date === day)!
                    .start_time,
                ) -
                  parseClock(
                    sessionsFor(picks[0]).find((x) => x.event_date === day)!
                      .end_time,
                  ),
              )}{" "}
              free between
            </p>
          </aside>
        )}
        <p className="sr-only">
          At peak, {peak.count} events run at the same time on{" "}
          {weekdayLong(day)}.
        </p>
      </Reveal>
    </div>
  );
}
