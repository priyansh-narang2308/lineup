"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  Check,
  Clock3,
  Link2,
  Mail,
  MapPin,
  Ticket,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import type {
  EventDetail,
  EventSummary,
  ListedEvent,
} from "@/lib/events/schema";
import {
  EventsFetchError,
  fetchEventDetail,
  getCachedDetail,
} from "@/lib/events/client";
import {
  availability,
  formatINR,
  modeLabel,
  priceFor,
  seatsLeft,
  sessionsFor,
  teamLabel,
  type Squad,
} from "@/lib/events/derive";
import { availabilityLabel, timeRange } from "@/lib/events/format";
import type { Clash } from "@/lib/events/clash";
import {
  formatDay,
  formatDeadline,
  formatDuration,
  isoToIst,
} from "@/lib/events/time";
import { eventImage } from "@/lib/event-image";
import { Sheet } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LineupToggle } from "@/components/lineup/lineup-toggle";
import { RelativeDeadline } from "@/components/ui/relative-deadline";
import { StatePanel } from "./states";
import { cn } from "@/lib/cn";

type Props = {
  id: string | null;
  summary: ListedEvent | null;
  squad: Squad | null;
  clashes: Clash[];
  inLineup: boolean;
  onClose: () => void;
};

type Load =
  | { status: "loading" }
  | { status: "ready"; detail: EventDetail }
  | { status: "error"; error: EventsFetchError };

const EMAIL_RE = /^[^\s@<>()]+@[^\s@<>()]+\.[a-z]{2,}$/i;

export function EventDrawer({
  id,
  summary,
  squad,
  clashes,
  inLineup,
  onClose,
}: Props) {
  const [load, setLoad] = useState<Load>(() => {
    const cached = id ? getCachedDetail(id) : undefined;
    return cached ? { status: "ready", detail: cached } : { status: "loading" };
  });
  const [copied, setCopied] = useState(false);

  /** Fetches detail; state is only set once the request settles. */
  const fetchDetail = useCallback(
    (signal?: AbortSignal) => {
      if (!id) return;
      fetchEventDetail(id, { signal })
        .then((detail) => setLoad({ status: "ready", detail }))
        .catch((err) => {
          if (signal?.aborted) return;
          setLoad({
            status: "error",
            error:
              err instanceof EventsFetchError
                ? err
                : new EventsFetchError("server", "Something went wrong."),
          });
        });
    },
    [id],
  );

  const retry = () => {
    setLoad({ status: "loading" });
    fetchDetail();
  };

  useEffect(() => {
    if (load.status === "ready") return; // served from the detail cache
    const ctrl = new AbortController();
    fetchDetail(ctrl.signal);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per drawer (component is keyed by id)
  }, [fetchDetail]);

  const detail = load.status === "ready" ? load.detail : null;
  const e = detail ?? summary;
  const title = e?.name ?? "Event";

  const copyLink = async () => {
    if (!id) return;
    const url = `${window.location.origin}/events?e=${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this link", url);
    }
  };

  const avail = e ? availability(e) : "open";
  const unavailable = avail !== "open" ? availabilityLabel[avail] : undefined;

  return (
    <Sheet
      open={!!id}
      onOpenChange={(o) => !o && onClose()}
      title={title}
      hideTitle
      footer={
        e ? (
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium">
                {priceFor(e, squad).primary}{" "}
                <span className="text-[13px] font-normal text-fg-3">
                  {priceFor(e, squad).unit}
                </span>
              </p>
              <p
                className={cn(
                  "truncate text-[12px]",
                  clashes.length && !inLineup ? "text-clash" : "text-fg-3",
                )}
              >
                {inLineup
                  ? "In your lineup"
                  : clashes.length
                    ? `Clashes with ${clashes[0].with.name.split(":")[0]}${clashes.length > 1 ? ` +${clashes.length - 1}` : ""}`
                    : (unavailable ?? "Fits your lineup")}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={copyLink}
              icon={
                copied ? (
                  <Check aria-hidden className="size-3.5" />
                ) : (
                  <Link2 aria-hidden className="size-3.5" />
                )
              }
            >
              {copied ? "Copied" : "Share"}
            </Button>
            <LineupToggle
              id={e.id}
              name={e.name}
              size="md"
              clashLabel={
                clashes.length ? `clashes with ${clashes.length}` : undefined
              }
              unavailableLabel={unavailable}
            />
          </div>
        ) : undefined
      }
    >
      {!e && load.status === "error" ? (
        <div className="px-5 pt-16 pb-10">
          <StatePanel
            type={load.error.kind}
            message={
              load.error.kind === "not_found" ? undefined : load.error.message
            }
            onRetry={load.error.kind === "not_found" ? undefined : retry}
          />
        </div>
      ) : !e ? (
        <DrawerSkeleton />
      ) : (
        <article>
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-raised md:rounded-tl-3xl">
            {(detail?.banner_image_url || e.cover_image_url) && (
              <Image
                src={eventImage(
                  detail?.banner_image_url || e.cover_image_url,
                  "16:9",
                )}
                alt={detail?.banner_image_alt || e.cover_image_alt || ""}
                fill
                sizes="(min-width: 768px) 560px, 100vw"
                preload
                className={cn(
                  "object-cover",
                  avail === "completed" && "grayscale",
                )}
              />
            )}
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-surface via-surface/10 to-canvas/40"
            />
          </div>

          <div className="relative -mt-14 flex flex-col gap-6 px-5 pb-8 sm:px-6">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-1.5">
                <Badge tone="overlay">{e.category}</Badge>
                <Badge tone={e.event_mode === "ONLINE" ? "info" : "overlay"}>
                  {modeLabel(e)}
                </Badge>
                {e.event_type === "WORKSHOP" && (
                  <Badge tone="overlay">Workshop</Badge>
                )}
                {e.is_featured && <Badge tone="solid">Featured</Badge>}
                {avail !== "open" && (
                  <Badge tone="neutral">{availabilityLabel[avail]}</Badge>
                )}
              </div>
              <h2 className="text-heading-l text-balance">{e.name}</h2>
              <p className="text-[15px] leading-6 text-fg-2">{e.blurb}</p>
            </div>

            {clashes.length > 0 && (
              <div
                role="note"
                className="flex gap-3 rounded-xl border border-clash/40 bg-clash-subtle/70 p-3.5"
              >
                <Zap
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0 text-clash"
                />
                <div className="text-[13px] leading-5">
                  <p className="font-medium text-clash">
                    Clashes with {clashes.length}{" "}
                    {clashes.length === 1 ? "event" : "events"} in your lineup
                  </p>
                  <ul className="mt-1 text-fg-2">
                    {clashes.map((c) => (
                      <li key={c.with.id}>
                        {c.with.name} — {formatDuration(c.minutes)} overlap
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line-subtle bg-line-subtle">
              <Fact
                icon={CalendarDays}
                label="When"
                value={formatDay(e.schedule_summary.start_date)}
                sub={timeRange(e) + " IST"}
              />
              <Fact
                icon={MapPin}
                label="Where"
                value={
                  detail
                    ? (detail.schedules[0]?.venue ?? modeLabel(e))
                    : modeLabel(e)
                }
                sub={
                  detail && detail.schedules.length > 1
                    ? `${detail.schedules.length} sessions`
                    : undefined
                }
                loading={!detail && load.status === "loading"}
              />
              <Fact
                icon={Users}
                label="Team"
                value={teamLabel(e)}
                sub={`${e.min_teamsize}–${e.max_teamsize} people`}
              />
              <Fact
                icon={Ticket}
                label="Fee"
                value={priceFor(e, squad).primary}
                sub={priceFor(e, squad).unit || undefined}
              />
              <Fact
                icon={Users}
                label="Seats"
                value={
                  avail === "sold_out"
                    ? "Sold out"
                    : `${seatsLeft(e)} of ${e.total_seats} left`
                }
                sub={<SeatBar e={e} />}
              />
              <Fact
                icon={Clock3}
                label="Registration"
                value={
                  avail === "open"
                    ? `Closes ${formatDeadline(e.registration_deadline)}`
                    : availabilityLabel[avail]
                }
                sub={
                  avail === "open" && isoToIst(e.registration_deadline) ? (
                    <RelativeDeadline
                      epochMs={isoToIst(e.registration_deadline)!.epochMs}
                      fallback=""
                      prefix="closes "
                    />
                  ) : undefined
                }
              />
            </dl>

            {load.status === "error" && (
              <StatePanel
                type={load.error.kind}
                message={`Showing the summary only. ${load.error.message}`}
                onRetry={retry}
                className="max-w-none py-6"
              />
            )}
            {load.status === "loading" && <DetailSkeleton />}
            {detail && <DetailBody d={detail} squad={squad} />}
          </div>
        </article>
      )}
    </Sheet>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
  sub,
  loading,
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
  sub?: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 bg-surface p-3.5">
      <dt className="flex items-center gap-1.5 text-overline text-fg-3">
        <Icon aria-hidden className="size-3.5" />
        {label}
      </dt>
      <dd className="text-[14px] leading-5 font-medium">
        {loading ? (
          <span className="skeleton inline-block h-4 w-28 rounded" />
        ) : (
          value
        )}
      </dd>
      {sub && <dd className="text-[12px] text-fg-3">{sub}</dd>}
    </div>
  );
}

function SeatBar({ e }: { e: EventSummary }) {
  const pct = Math.min(
    100,
    Math.round((e.seats_filled / Math.max(1, e.total_seats)) * 100),
  );
  return (
    <span
      className="mt-1 flex h-1 w-full overflow-hidden rounded-full bg-elevated"
      aria-label={`${pct}% of seats taken`}
    >
      <span
        className={cn("h-full rounded-full", pct >= 90 ? "bg-warn" : "bg-fg-2")}
        style={{ width: `${pct}%` }}
      />
    </span>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-overline text-fg-3">{title}</h3>
      {children}
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((x) => (
        <li key={x} className="flex gap-2.5 text-[14px] leading-6 text-fg-2">
          <span
            aria-hidden
            className="mt-[9px] size-1.5 shrink-0 rounded-full bg-accent"
          />
          {x}
        </li>
      ))}
    </ul>
  );
}

function DetailBody({ d }: { d: EventDetail; squad: Squad | null }) {
  const sessions = sessionsFor({ ...d, sessions: d.schedules });
  return (
    <div className="flex flex-col gap-8 animate-rise">
      <Section title="About">
        {d.description.split(/\n\n+/).map((p, i) => (
          <p key={i} className="text-[15px] leading-7 text-fg-2">
            {p}
          </p>
        ))}
      </Section>

      {d.gallery_images.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {d.gallery_images.slice(0, 2).map((src, i) => (
            <div
              key={src}
              className="relative aspect-[3/2] overflow-hidden rounded-xl bg-raised"
            >
              <Image
                src={eventImage(src, "3:2")}
                alt={`${d.name} — photo ${i + 1}`}
                fill
                sizes="280px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {d.highlights.length > 0 && (
        <Section title="Highlights">
          <Bullets items={d.highlights} />
        </Section>
      )}

      <Section
        title={
          sessions.length > 1
            ? `Schedule · ${sessions.length} sessions`
            : "Schedule"
        }
      >
        <ol className="flex flex-col gap-2">
          {d.schedules.map((s, i) => (
            <li
              key={i}
              className="flex gap-3 rounded-xl border border-line-subtle bg-raised p-3"
            >
              <span className="w-24 shrink-0 text-[13px] font-medium">
                {formatDay(s.event_date)}
              </span>
              <span className="min-w-0 text-[13px] text-fg-2">
                <span className="font-mono text-fg">
                  {s.start_time}–{s.end_time === "23:59" ? "24:00" : s.end_time}
                </span>
                <span className="block">{s.venue}</span>
              </span>
            </li>
          ))}
        </ol>
      </Section>

      {d.what_to_expect.length > 0 && (
        <Section title="What to expect">
          <Bullets items={d.what_to_expect} />
        </Section>
      )}

      {d.prizes.length > 0 && (
        <Section title="Prizes">
          <ul className="flex flex-col gap-2">
            {[...d.prizes]
              .sort((a, b) => a.rank - b.rank)
              .map((p) => (
                <li
                  key={p.rank + p.title}
                  className="flex gap-3 rounded-xl border border-line-subtle bg-raised p-3.5"
                >
                  <Trophy
                    aria-hidden
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      p.rank === 1 ? "text-accent" : "text-fg-3",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-baseline justify-between gap-2 text-[14px] font-medium">
                      {p.title}
                      <span className="font-mono text-[13px] text-accent">
                        {formatINR(p.amount)}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[13px] leading-5 text-fg-3">
                      {p.description}
                    </p>
                  </div>
                </li>
              ))}
          </ul>
        </Section>
      )}

      {(d.eligibility.length > 0 || d.prerequisites.length > 0) && (
        <div className="grid gap-8 sm:grid-cols-2">
          {d.eligibility.length > 0 && (
            <Section title="Who can take part">
              <Bullets items={d.eligibility} />
            </Section>
          )}
          {d.prerequisites.length > 0 && (
            <Section title="What to bring">
              <Bullets items={d.prerequisites} />
            </Section>
          )}
        </div>
      )}

      {d.rules.length > 0 && (
        <details className="group rounded-xl border border-line-subtle bg-raised">
          <summary className="flex cursor-pointer list-none items-center justify-between p-3.5 text-[14px] font-medium">
            Rules ({d.rules.length})
            <span
              aria-hidden
              className="text-fg-3 transition-transform group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <ol className="flex list-decimal flex-col gap-2 px-5 pb-4 pl-9 text-[14px] leading-6 text-fg-2">
            {d.rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ol>
        </details>
      )}

      {d.faqs.length > 0 && (
        <Section title="FAQ">
          <div className="flex flex-col divide-y divide-line-subtle rounded-xl border border-line-subtle bg-raised">
            {d.faqs.map((f) => (
              <details key={f.question} className="group">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-3.5 text-[14px] font-medium">
                  {f.question}
                  <span
                    aria-hidden
                    className="text-fg-3 transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="px-3.5 pb-4 text-[14px] leading-6 text-fg-2">
                  {f.answer}
                </p>
              </details>
            ))}
          </div>
        </Section>
      )}

      {(d.organizers.length > 0 || d.coordinators.length > 0) && (
        <Section title="Organised by">
          <div className="flex flex-col gap-2">
            {d.organizers.map((o) => (
              <p key={o.id} className="text-[15px] font-medium">
                {o.name}
              </p>
            ))}
            <ul className="mt-1 flex flex-col gap-2">
              {d.coordinators.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line-subtle bg-raised p-3"
                >
                  <span className="min-w-0">
                    <span className="block text-[14px] font-medium">
                      {c.name}
                    </span>
                    <span className="block text-[12px] text-fg-3">
                      {c.role}
                    </span>
                  </span>
                  {EMAIL_RE.test(c.contact) && (
                    <a
                      href={`mailto:${c.contact}`}
                      className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-line-strong text-fg-2 hover:bg-hover hover:text-fg"
                      aria-label={`Email ${c.name}`}
                    >
                      <Mail aria-hidden className="size-4" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}

      <p className="text-[12px] text-fg-3">
        Registration happens with the organisers — Lineup only helps you plan.
        Details from the Render72 events API.
      </p>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      <div className="skeleton h-3 w-20 rounded" />
      <div className="skeleton h-4 w-full rounded" />
      <div className="skeleton h-4 w-11/12 rounded" />
      <div className="skeleton h-4 w-4/5 rounded" />
      <div className="mt-4 skeleton h-24 w-full rounded-xl" />
    </div>
  );
}

function DrawerSkeleton() {
  return (
    <div aria-hidden>
      <div className="skeleton aspect-[16/9] w-full" />
      <div className="flex flex-col gap-3 p-6">
        <div className="skeleton h-6 w-3/4 rounded" />
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-32 w-full rounded-2xl" />
      </div>
    </div>
  );
}
