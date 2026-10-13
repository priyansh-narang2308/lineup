import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarPlus,
  Link2,
  Users,
} from "lucide-react";
import type { EventsPayload } from "@/lib/events/schema";
import {
  closingSoon,
  concurrencyByHour,
  distinctDeadlines,
  eventsOnDay,
  featured,
  festDays,
  overlappingPairs,
  peakConcurrency,
  teamSizeRange,
} from "@/lib/events/insights";
import { formatINR, teamLabel } from "@/lib/events/derive";
import {
  dayOfMonth,
  formatDayMonth,
  monthShort,
  weekdayLong,
} from "@/lib/events/time";
import { eventImage } from "@/lib/event-image";
import { EventCard } from "@/components/events/event-card";
import { LineupToggle } from "@/components/lineup/lineup-toggle";
import { ButtonLink } from "@/components/ui/button";
import { RelativeDeadline } from "@/components/ui/relative-deadline";
import { cn } from "@/lib/cn";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";

function SectionHead({
  over,
  title,
  body,
  tone = "accent",
  id,
}: {
  over: string;
  title: string;
  body?: string;
  tone?: "accent" | "warn";
  id: string;
}) {
  return (
    <Reveal className="flex max-w-xl flex-col gap-4">
      <p
        className={cn(
          "text-overline",
          tone === "accent" ? "text-accent" : "text-warn",
        )}
      >
        {over}
      </p>
      <h2 id={id} className="text-display-m text-balance">
        {title}
      </h2>
      {body && (
        <p className="text-[16px] leading-7 text-fg-2 sm:text-[17px]">{body}</p>
      )}
    </Reveal>
  );
}

export function Problem({ data }: { data: EventsPayload }) {
  const { events } = data;
  const peak = peakConcurrency(events);
  if (!peak.day) return null;
  const series = concurrencyByHour(events, peak.day, 8, 22);
  const max = Math.max(...series.map((s) => s.count), 1);
  const pairs = overlappingPairs(events);
  const deadlines = distinctDeadlines(events);
  const team = teamSizeRange(events);
  const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;

  return (
    <section
      aria-labelledby="problem-title"
      className="container-page pt-28 sm:pt-40"
    >
      <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div className="flex flex-col gap-8">
          <SectionHead
            id="problem-title"
            over="The problem"
            title={`${weekdayLong(peak.day)}, ${hh(peak.hour)}. ${peak.count} things happen at once.`}
            body={`Across the weekend ${pairs} pairs of events overlap. Registration closes on ${deadlines} different dates. Team rules run from solo-only to crews of ${team.max}. Planning that in your head is how you miss the one thing you actually wanted.`}
          />
          <Stagger as="dl" className="flex flex-wrap gap-x-10 gap-y-4">
            {[
              [String(pairs), "overlapping pairs", "text-clash"],
              [String(deadlines), "registration deadlines", "text-warn"],
              [`${team.min}–${team.max}`, "people per team", "text-fg"],
            ].map(([n, l, c]) => (
              <StaggerItem key={l} className="flex flex-col-reverse gap-1">
                <dt className="text-[13px] text-fg-3">{l}</dt>
                <dd className={cn("text-heading-l", c)}>{n}</dd>
              </StaggerItem>
            ))}
          </Stagger>
        </div>

        <Reveal delay={0.1} y={28}>
        <figure className="rounded-3xl border border-line-subtle bg-surface p-5 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <figcaption className="text-[14px] font-medium text-fg-2">
              Events running at once · {weekdayLong(peak.day)}{" "}
              {formatDayMonth(peak.day)}
            </figcaption>
            <span className="rounded-full bg-clash-subtle px-2.5 py-0.5 text-[12px] font-medium text-clash">
              Peak {peak.count} · {hh(peak.hour)}–{hh(peak.until)}
            </span>
          </div>
          <div
            className="mt-6 flex h-[220px] items-end gap-1 sm:h-[260px] sm:gap-2"
            role="list"
            aria-label="Concurrent events per hour"
          >
            {series.map((s) => (
              <div
                key={s.hour}
                role="listitem"
                aria-label={`${hh(s.hour)}: ${s.count} events`}
                className="flex h-full flex-1 flex-col items-center justify-end gap-2"
              >
                <span
                  className={cn(
                    "font-mono text-[11px]",
                    s.count === max ? "text-clash" : "text-fg-3",
                  )}
                >
                  {s.count}
                </span>
                <span
                  className={cn(
                    "w-full rounded-md",
                    s.count === max
                      ? "bg-clash"
                      : s.count >= max - 1
                        ? "bg-clash/30"
                        : "bg-hover",
                  )}
                  style={{ height: `${Math.max(2, (s.count / max) * 78)}%` }}
                />
                <span className="font-mono text-[10px] text-fg-3 sm:text-[11px]">
                  {String(s.hour).padStart(2, "0")}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-5 text-[13px] leading-5 text-fg-3">
            Computed live from session times in the events API — including the
            overnight hackathon and multi-day sprint.
          </p>
        </figure>
        </Reveal>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const card =
    "flex min-w-0 flex-col gap-6 rounded-3xl border border-line-subtle bg-surface p-5 sm:p-7";
  const stage =
    "flex h-[176px] flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-line-subtle bg-inset px-3 sm:px-4";
  return (
    <section
      id="how"
      aria-labelledby="how-title"
      className="container-page scroll-mt-20 pt-28 sm:pt-40"
    >
      <SectionHead
        id="how-title"
        over="How it works"
        title="Three steps to a weekend that fits."
      />
      <Stagger as="ol" className="mt-12 grid gap-5 md:grid-cols-3">
        <StaggerItem as="li" className={card}>
          <div className={stage} aria-hidden>
            <div className="flex items-center gap-0.5 rounded-full border border-line bg-raised p-[3px] text-[12px] font-medium">
              <span className="flex items-center gap-1.5 px-2 text-fg-3">
                <Users className="size-3.5" />
                <span className="hidden min-[400px]:inline">Going as</span>
              </span>
              {["Solo", "2", "3", "4", "5+"].map((x) => (
                <span
                  key={x}
                  className={cn(
                    "rounded-full px-2.5 py-1",
                    x === "3" ? "bg-fg text-on-accent" : "text-fg-2",
                  )}
                >
                  {x}
                </span>
              ))}
            </div>
            <p className="font-mono text-[13px] text-accent">
              ₹600 / team → ₹200 each
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-[17px] font-semibold">
              <span className="mr-2 font-mono text-[13px] text-fg-3">01</span>
              Tell us who’s coming
            </h3>
            <p className="text-[14px] leading-6 text-fg-2">
              Events your squad can’t enter fade back. Per-team fees turn into
              what each of you actually pays.
            </p>
          </div>
        </StaggerItem>
        <StaggerItem as="li" className={card}>
          <div className={stage} aria-hidden>
            <div className="flex w-full max-w-[300px] items-center gap-2.5 rounded-[10px] border border-accent bg-accent-subtle py-1 pl-1 pr-3">
              <span className="h-11 w-[3px] rounded-full bg-accent" />
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-medium">
                  Lines in Motion: Live Illustration Jam
                </span>
                <span className="block font-mono text-[11px] text-accent">
                  10:00–13:30 · in lineup
                </span>
              </span>
            </div>
            <div className="flex w-full max-w-[300px] items-center gap-2.5 rounded-[10px] border border-dashed border-clash bg-clash-subtle py-1 pl-1 pr-3">
              <span className="h-11 w-[3px] rounded-full bg-clash" />
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-medium">
                  Unmuted: Student Slam Poetry
                </span>
                <span className="block font-mono text-[11px] text-clash">
                  11:00–14:30 · clashes 2h 30m
                </span>
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-[17px] font-semibold">
              <span className="mr-2 font-mono text-[13px] text-fg-3">02</span>
              Add what you love
            </h3>
            <p className="text-[14px] leading-6 text-fg-2">
              Every pick is checked against real session times — overnight and
              multi-day events included.
            </p>
          </div>
        </StaggerItem>
        <StaggerItem as="li" className={card}>
          <div className={stage} aria-hidden>
            <span className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-[14px] font-medium text-on-accent">
              <CalendarPlus className="size-4" />
              Add to calendar
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[12px] text-fg-3">
              <Link2 className="size-3.5" />
              /events?lineup=7f3a91c2.a30d…
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-[17px] font-semibold">
              <span className="mr-2 font-mono text-[13px] text-fg-3">03</span>
              Leave with a plan
            </h3>
            <p className="text-[14px] leading-6 text-fg-2">
              Export to Google, Apple or Outlook calendar, or share a link. No
              account — your lineup stays on this device.
            </p>
          </div>
        </StaggerItem>
      </Stagger>
    </section>
  );
}

export function Featured({ data }: { data: EventsPayload }) {
  const list = featured(data.events, 3);
  if (!list.length) return null;
  return (
    <section
      aria-labelledby="featured-title"
      className="container-page pt-28 sm:pt-40"
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHead
          id="featured-title"
          over="Picked by organisers"
          title="Featured this weekend"
        />
        <ButtonLink
          href="/events"
          variant="secondary"
          iconRight={<ArrowRight aria-hidden className="size-4" />}
        >
          View all events
        </ButtonLink>
      </div>
      <Stagger as="ul" className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((e) => (
          <StaggerItem as="li" key={e.id} className="flex">
            <div className="flex w-full flex-col [&>article]:flex-1">
              <EventCard
                event={e}
                href={`/events?e=${e.id}`}
                action={<LineupToggle id={e.id} name={e.name} />}
              />
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

export function ClosingSoon({
  data,
  now,
}: {
  data: EventsPayload;
  now: number;
}) {
  const items = closingSoon(data.events, now, 4);
  if (!items.length) return null;
  return (
    <section
      id="closing"
      aria-labelledby="closing-title"
      className="container-page scroll-mt-20 pt-28 sm:pt-40"
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <SectionHead
          id="closing-title"
          over="Deadlines"
          tone="warn"
          title="Registration closes first here."
          body={`${distinctDeadlines(data.events)} different deadlines across the fest. Lineup orders the ones in your plan so nothing quietly closes on you.`}
        />
        <Stagger as="ul" className="overflow-hidden rounded-3xl border border-line-subtle bg-surface">
          {items.map(({ e, deadline }) => (
            <StaggerItem
              as="li"
              key={e.id}
              className="border-b border-line-subtle last:border-0"
            >
              <Link
                href={`/events?e=${e.id}`}
                className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-raised sm:gap-5 sm:px-6 sm:py-5"
              >
                <span className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl border border-line bg-raised">
                  <span className="text-[20px] leading-6 font-semibold">
                    {String(dayOfMonth(deadline.date)).padStart(2, "0")}
                  </span>
                  <span className="text-overline text-fg-3">
                    {monthShort(deadline.date)}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-semibold">
                    {e.name}
                  </span>
                  <span className="block truncate text-[13px] text-fg-3">
                    {e.category} · {teamLabel(e)} ·{" "}
                    {e.price
                      ? `${formatINR(e.price)} / ${e.is_per_head ? "person" : "team"}`
                      : "Free"}
                  </span>
                </span>
                <span className="hidden rounded-full bg-warn-subtle px-2.5 py-0.5 text-[12px] font-medium text-warn sm:inline">
                  <RelativeDeadline
                    epochMs={deadline.epochMs}
                    fallback={`Closes ${deadline.time}`}
                    prefix="closes "
                  />
                </span>
                <ArrowUpRight
                  aria-hidden
                  className="size-5 shrink-0 text-fg-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg"
                />
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

export function ByDay({ data }: { data: EventsPayload }) {
  const days = festDays(data.events);
  if (!days.length) return null;
  const peak = peakConcurrency(data.events);
  return (
    <section
      aria-labelledby="days-title"
      className="container-page pt-28 sm:pt-40"
    >
      <SectionHead
        id="days-title"
        over={`${days.length} days`}
        title="Start with a day."
      />
      <Stagger as="ul" className="mt-12 grid gap-5 md:grid-cols-3">
        {days.map((d) => {
          const list = eventsOnDay(data.events, d);
          // A non-featured cover keeps these tiles visually distinct from the Featured row.
          const used = new Set(featured(data.events, 3).map((e) => e.id));
          const cover =
            list.find(
              (e) =>
                !used.has(e.id) &&
                !e.is_featured &&
                e.schedule_summary.start_date === d,
            ) ??
            list.find((e) => !used.has(e.id)) ??
            list[0];
          const first = [...list].sort((a, b) =>
            a.schedule_summary.start_time.localeCompare(
              b.schedule_summary.start_time,
            ),
          )[0];
          const note =
            d === peak.day
              ? `The busiest day — ${peak.count} events at once by ${String(peak.hour).padStart(2, "0")}:00`
              : `${list.filter((e) => e.is_technical).length} technical · ${list.filter((e) => !e.is_technical).length} cultural · from ${first.schedule_summary.start_time}`;
          return (
            <StaggerItem as="li" key={d}>
              <Link
                href={`/events?day=${d}`}
                className="group relative flex h-[340px] flex-col justify-end overflow-hidden rounded-3xl border border-line-subtle p-6 sm:h-[420px] sm:p-7"
              >
                {cover && (
                  <Image
                    src={eventImage(cover.cover_image_url)}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 32vw, 92vw"
                    className="object-cover transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.04]"
                  />
                )}
                <span
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-b from-canvas/10 via-canvas/40 to-canvas/95"
                />
                <span className="relative flex flex-col gap-2">
                  <span className="text-overline text-accent">
                    {weekdayLong(d)} · {formatDayMonth(d)}
                  </span>
                  <span className="text-display-m">{list.length} events</span>
                  <span className="text-[14px] leading-5 text-fg-2">
                    {note}
                  </span>
                </span>
              </Link>
            </StaggerItem>
          );
        })}
      </Stagger>
    </section>
  );
}

export function FinalCta({ count }: { count: number }) {
  return (
    <section
      aria-labelledby="cta-title"
      className="container-page py-28 sm:py-40"
    >
      <Reveal y={28} className="relative overflow-hidden rounded-[32px] border border-line-subtle bg-surface px-6 py-20 text-center sm:px-16 sm:py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[1000px] max-w-none -translate-x-1/2 bg-[radial-gradient(closest-side,rgb(205_255_90/0.11),transparent)]"
        />
        <div className="relative flex flex-col items-center gap-6">
          <h2
            id="cta-title"
            className="text-display-l max-w-[16ch] text-balance"
          >
            Plan the weekend you’ll actually remember.
          </h2>
          <p className="text-[17px] text-fg-2">
            {count ? `${count} events. ` : ""}Your squad. Zero clashes.
          </p>
          <ButtonLink
            href="/events"
            iconRight={<ArrowRight aria-hidden className="size-4" />}
          >
            Build your lineup
          </ButtonLink>
        </div>
      </Reveal>
    </section>
  );
}
