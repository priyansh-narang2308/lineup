"use client";

import { useMemo, useState } from "react";
import {
  CalendarPlus,
  Check,
  ChevronUp,
  Link2,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import type { ListedEvent } from "@/lib/events/schema";
import {
  availability,
  priceFor,
  sessionsFor,
  type Squad,
} from "@/lib/events/derive";
import { lineupConflicts } from "@/lib/events/clash";
import {
  formatDay,
  formatDeadline,
  formatDuration,
  isoToIst,
  sessionInterval,
} from "@/lib/events/time";
import { fetchEventDetail, getCachedDetail } from "@/lib/events/client";
import { buildIcs } from "@/lib/lineup/ics";
import { encodeLineup, lineup } from "@/lib/lineup/store";
import { formatINR } from "@/lib/events/derive";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { RelativeDeadline } from "@/components/ui/relative-deadline";
import { cn } from "@/lib/cn";

type Props = {
  events: ListedEvent[]; // lineup events, resolved
  missing: number; // ids saved locally that no longer exist upstream
  squad: Squad | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onOpenEvent: (id: string) => void;
};

export function LineupPanel({
  events,
  missing,
  squad,
  open,
  onOpenChange,
  onOpenEvent,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);


  const conflicts = useMemo(() => lineupConflicts(events), [events]);
  const clashing = new Set(conflicts.flatMap((c) => [c.a.id, c.b.id]));
  const total = events.reduce(
    (t, e) => {
      const p = priceFor(e, squad);
      if (p.perPerson !== null) t.known += p.perPerson;
      else t.unknown = true;
      return t;
    },
    { known: 0, unknown: false },
  );

  // Sessions grouped by day, in time order.
  const byDay = useMemo(() => {
    const rows = events.flatMap((e) =>
      sessionsFor(e).map((s, i, all) => ({
        e,
        s,
        part: all.length > 1 ? `Day ${i + 1} of ${all.length}` : null,
        start: sessionInterval(s)[0],
      })),
    );
    rows.sort((a, b) => a.start - b.start);
    const map = new Map<string, typeof rows>();
    for (const r of rows)
      (
        map.get(r.s.event_date) ??
        map.set(r.s.event_date, []).get(r.s.event_date)!
      ).push(r);
    return [...map.entries()];
  }, [events]);

  const deadlines = events
    .filter((e) => availability(e) === "open")
    .map((e) => ({ e, d: isoToIst(e.registration_deadline) }))
    .filter((x) => x.d)
    .sort((a, b) => a.d!.epochMs - b.d!.epochMs);

  const share = async () => {
    const url = `${window.location.origin}/events?lineup=${encodeLineup(events.map((e) => e.id))}`;
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches)
        await navigator.share({ title: "My Lineup", url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      /* user cancelled share */
    }
  };

  const exportIcs = async () => {
    setExporting(true);
    // Venues live in event detail; fetch any we don't have (deduped + cached), tolerate failures.
    const details = await Promise.allSettled(
      events.map((e) =>
        getCachedDetail(e.id)
          ? Promise.resolve(getCachedDetail(e.id)!)
          : fetchEventDetail(e.id),
      ),
    );
    const venues: Record<string, Record<string, string>> = {};
    details.forEach((r) => {
      if (r.status === "fulfilled")
        venues[r.value.id] = Object.fromEntries(
          r.value.schedules.map((s) => [s.event_date, s.venue]),
        );
    });
    const ics = buildIcs(events, {
      venues,
      url: `${window.location.origin}/events`,
    });
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "my-lineup.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    setExporting(false);
  };

  const n = events.length;

  return (
    <>
      {n > 0 && (
        <div className={cn(
          "pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom)] transition-all duration-400 ease-out",
          open ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
        )}>
          <button
            type="button"
            onClick={() => onOpenChange(true)}
            disabled={open}
            className={cn(
              "pointer-events-auto flex w-full max-w-130 items-center gap-3 rounded-full border border-line-strong bg-elevated/90 py-2 pl-2 pr-4 text-left shadow-(--shadow-overlay) backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-lg animate-rise",
              open && "pointer-events-none opacity-0"
            )}
            aria-label={`Open your lineup: ${n} events${conflicts.length ? `, ${conflicts.length} clashes` : ""}`}
          >
            <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-accent px-2 font-mono text-[14px] font-medium text-on-accent">
              {n}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-medium">Your lineup</span>
              <span
                className={cn(
                  "block truncate text-[12px]",
                  conflicts.length ? "text-clash" : "text-fg-3",
                )}
              >
                {conflicts.length
                  ? `${conflicts.length} ${conflicts.length === 1 ? "clash" : "clashes"} to resolve`
                  : "Clash-free"}
                {total.known > 0 &&
                  ` · ${formatINR(total.known)}${total.unknown ? "+" : ""} each`}
              </span>
            </span>
            <ChevronUp aria-hidden className="size-4 text-fg-3" />
          </button>
        </div>
      )}

      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        title="Your lineup"
        description={
          n
              ? `${n} ${n === 1 ? "event" : "events"} · ${conflicts.length ? `${conflicts.length} ${conflicts.length === 1 ? "clash" : "clashes"}` : "clash-free"}`
              : "Nothing added yet"
        }
        width="md:w-[460px]"
        footer={
          n ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-fg-3">
                  Estimated cost per person
                  {squad ? "" : " (set squad size to split team fees)"}
                </span>
                <span className="font-mono text-[14px] text-fg">
                  {formatINR(total.known)}
                  {total.unknown ? "+" : ""}
                </span>
              </div>
              <div className="flex gap-2.5">
                <Button
                  className="flex-1"
                  onClick={exportIcs}
                  disabled={exporting}
                  icon={<CalendarPlus aria-hidden className="size-4" />}
                >
                  {exporting ? "Preparing…" : "Add to calendar"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={share}
                  icon={
                    copied ? (
                      <Check aria-hidden className="size-4" />
                    ) : (
                      <Link2 aria-hidden className="size-4" />
                    )
                  }
                >
                  {copied ? "Copied" : "Share"}
                </Button>
              </div>
            </div>
          ) : undefined
        }
      >
        <div className="flex flex-col gap-6 px-5 pb-6 sm:px-6">
              {missing > 0 && (
            <p className="rounded-xl border border-line bg-raised p-3 text-[13px] text-fg-2">
              {missing} saved {missing === 1 ? "event is" : "events are"} no
              longer in the events API and {missing === 1 ? "was" : "were"}{" "}
              hidden.
            </p>
          )}
          {!n ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line-strong px-6 py-12 text-center">
              <p className="text-[16px] font-semibold">
                Your weekend starts here
              </p>
              <p className="max-w-[30ch] text-[14px] leading-6 text-fg-2">
                Tap <span className="font-medium text-fg">Add</span> on any
                event. We’ll flag clashes and keep deadlines in view.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Browse events
              </Button>
            </div>
          ) : (
            <>
              {conflicts.length > 0 && (
                <section
                  aria-labelledby="conf-title"
                  className="flex flex-col gap-2 rounded-2xl border border-clash/40 bg-clash-subtle/60 p-4"
                >
                  <h3
                    id="conf-title"
                    className="flex items-center gap-2 text-[14px] font-medium text-clash"
                  >
                    <Zap aria-hidden className="size-4" />
                    {conflicts.length}{" "}
                    {conflicts.length === 1 ? "clash" : "clashes"} to resolve
                  </h3>
                  <ul className="flex flex-col gap-1.5 text-[13px] leading-5 text-fg-2">
                    {conflicts.map((c) => (
                      <li key={c.a.id + c.b.id}>
                        <span className="text-fg">
                          {c.a.name.split(":")[0]}
                        </span>{" "}
                        overlaps{" "}
                        <span className="text-fg">
                          {c.b.name.split(":")[0]}
                        </span>{" "}
                        by {formatDuration(c.minutes)}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {byDay.map(([day, rows]) => (
                <section
                  key={day}
                  aria-label={formatDay(day)}
                  className="flex flex-col gap-2"
                >
                  <h3 className="text-overline text-fg-3">{formatDay(day)}</h3>
                  <ul className="flex flex-col gap-2">
                    {rows.map(({ e, s, part }) => (
                      <li
                        key={e.id + s.event_date}
                        className={cn(
                          "flex items-start gap-3 rounded-xl border p-3",
                          clashing.has(e.id)
                            ? "border-clash/50 bg-clash-subtle/40"
                            : "border-line-subtle bg-raised",
                        )}
                      >
                        <span className="w-11 shrink-0 font-mono text-[12px] leading-5">
                          {s.start_time}
                          <br />
                          <span className="text-fg-3">
                            {s.end_time === "23:59" ? "24:00" : s.end_time}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => onOpenEvent(e.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="block text-[14px] leading-5 font-medium hover:underline">
                            {e.name}
                          </span>
                          <span className="block text-[12px] text-fg-3">
                            {[
                              part,
                              priceFor(e, squad).primary +
                                (priceFor(e, squad).unit
                                  ? ` ${priceFor(e, squad).unit}`
                                  : ""),
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => lineup.remove(e.id)}
                          aria-label={`Remove ${e.name}`}
                          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-fg-3 transition-all duration-200 hover:bg-hover hover:text-fg active:scale-95"
                        >
                          <X aria-hidden className="size-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}

              {deadlines.length > 0 && (
                <section
                  aria-labelledby="dl-title"
                  className="flex flex-col gap-2"
                >
                  <h3 id="dl-title" className="text-overline text-warn">
                    Register before
                  </h3>
                  <ul className="flex flex-col divide-y divide-line-subtle rounded-xl border border-line-subtle bg-raised">
                    {deadlines.map(({ e, d }) => (
                      <li
                        key={e.id}
                        className="flex items-center justify-between gap-3 p-3 text-[13px]"
                      >
                        <span className="min-w-0 truncate">
                          {e.name.split(":")[0]}
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block font-mono text-fg">
                            {formatDeadline(e.registration_deadline)}
                          </span>
                          <span className="block text-[12px] text-warn">
                            <RelativeDeadline
                              epochMs={d!.epochMs}
                              fallback=""
                              prefix="closes "
                            />
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <button
                type="button"
                onClick={() => lineup.clear()}
                className="inline-flex items-center gap-2 self-start rounded-full px-2 py-1 text-[13px] text-fg-3 hover:text-clash"
              >
                <Trash2 aria-hidden className="size-3.5" />
                Clear lineup
              </button>
            </>
          )}
        </div>
      </Sheet>
    </>
  );
}
