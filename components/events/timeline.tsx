"use client";

import { Check, Zap } from "lucide-react";
import type { ListedEvent } from "@/lib/events/schema";
import { availability, sessionsFor } from "@/lib/events/derive";
import { packLanes, type Clash } from "@/lib/events/clash";
import { formatDayMonth, formatDuration, istToEpochMin, weekdayLong, weekdayShort } from "@/lib/events/time";
import { cn } from "@/lib/cn";

type Props = {
  days: string[];
  events: ListedEvent[];
  lineupIds: Set<string>;
  clashMap: Map<string, Clash[]>;
  onOpen: (id: string) => void;
  onIntent: (id: string) => void;
};

type Block = {
  e: ListedEvent;
  start: number;
  end: number;
  label: string;
  clock: [string, string];
  part?: string;
  state: "in" | "clash" | "muted" | "default";
  meta: string;
};

function blocksForDay(day: string, events: ListedEvent[], lineupIds: Set<string>, clashMap: Map<string, Clash[]>): Block[] {
  const out: Block[] = [];
  for (const e of events) {
    const sessions = sessionsFor(e);
    const idx = sessions.findIndex((s) => s.event_date === day);
    if (idx < 0) continue;
    const s = sessions[idx];
    const start = istToEpochMin(day, s.start_time);
    const end = istToEpochMin(day, s.end_time === "23:59" ? "24:00" : s.end_time);
    const inLineup = lineupIds.has(e.id);
    const clashes = clashMap.get(e.id) ?? [];
    const unavailable = availability(e) !== "open";
    const overnight = idx > 0 && s.start_time === "00:00" && sessions[idx - 1].end_time === "23:59";
    out.push({
      e,
      start,
      end,
      label: e.name,
      clock: [s.start_time, s.end_time === "23:59" ? "24:00" : s.end_time],
      part: e.sessions_approximate
        ? "times approx."
        : overnight
          ? `overnight from ${weekdayShort(sessions[idx - 1].event_date)}`
          : sessions.length > 1
            ? `day ${idx + 1} of ${sessions.length}`
            : undefined,
      state: inLineup ? "in" : clashes.length ? "clash" : unavailable ? "muted" : "default",
      meta: inLineup
        ? `${s.start_time}–${s.end_time} · in lineup`
        : clashes.length
          ? `${s.start_time}–${s.end_time} · clashes ${formatDuration(clashes.reduce((t, c) => t + c.minutes, 0))}`
          : unavailable
            ? availability(e) === "sold_out" ? "Sold out" : "Registration closed"
            : `${s.start_time}–${s.end_time}`,
    });
  }
  return out.sort((a, b) => a.start - b.start);
}

const blockTone = {
  in: "border-accent bg-accent-subtle hover:bg-[#2e3b12]",
  clash: "border-dashed border-clash/80 bg-clash-subtle/60 hover:bg-clash-subtle",
  muted: "border-line bg-raised opacity-50 hover:opacity-80",
  default: "border-line bg-raised hover:border-line-strong hover:bg-elevated",
};
const barTone = { in: "bg-accent", clash: "bg-clash", muted: "bg-line-strong", default: "bg-line-strong" };
const metaTone = { in: "text-accent", clash: "text-clash", muted: "text-fg-3", default: "text-fg-3" };

function BlockLabel({ b }: { b: Block }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="flex items-center gap-1.5 text-[12.5px] leading-4 font-medium text-fg">
        {b.state === "in" && <Check aria-hidden className="size-3 shrink-0 text-accent" strokeWidth={3} />}
        {b.state === "clash" && <Zap aria-hidden className="size-3 shrink-0 text-clash" />}
        <span className="truncate">{b.part ? `${b.label.split(":")[0]} · ${b.part}` : b.label}</span>
      </span>
      <span className={cn("mt-1 block truncate font-mono text-[11px] leading-4", metaTone[b.state])}>{b.meta}</span>
    </span>
  );
}

function DayTimeline({ day, blocks, onOpen, onIntent }: { day: string; blocks: Block[]; onOpen: Props["onOpen"]; onIntent: Props["onIntent"] }) {
  const minH = Math.min(...blocks.map((b) => Math.floor((b.start - istToEpochMin(day, "00:00")) / 60)));
  const maxH = Math.max(...blocks.map((b) => Math.ceil((b.end - istToEpochMin(day, "00:00")) / 60)));
  const h0 = Math.max(0, Math.min(minH, 9));
  const h1 = Math.min(24, Math.max(maxH, h0 + 8));
  const axStart = istToEpochMin(day, `${String(h0).padStart(2, "0")}:00`);
  const span = (h1 - h0) * 60;
  const PX_PER_HOUR = 104;
  const width = (h1 - h0) * PX_PER_HOUR;
  const lanes = packLanes(blocks.map((b) => ({ id: b.e.id, start: b.start, end: b.end })));
  const laneCount = Math.max(1, ...[...lanes.values()].map((l) => l + 1));
  const LANE = 66;

  return (
    <div className="relative overflow-x-auto rounded-2xl border border-line-subtle bg-surface" tabIndex={0} aria-label={`${weekdayLong(day)} timeline, scroll horizontally`}>
      <div className="relative" style={{ width: width + 32, height: 44 + laneCount * LANE + 12 }}>
        {Array.from({ length: h1 - h0 + 1 }, (_, i) => (
          <div key={i} aria-hidden className="absolute top-0 bottom-0" style={{ left: 16 + i * PX_PER_HOUR }}>
            <div className={cn("h-full w-px", (h0 + i) % 3 === 0 ? "bg-line" : "bg-line-subtle")} />
            <span className="absolute left-1.5 top-3 font-mono text-[11px] text-fg-3">{String((h0 + i) % 24).padStart(2, "0")}:00</span>
          </div>
        ))}
        <ul>
          {blocks.map((b) => {
            const left = 16 + ((b.start - axStart) / span) * width;
            const w = Math.max(56, ((b.end - b.start) / span) * width);
            return (
              <li key={b.e.id} className="absolute" style={{ top: 40 + (lanes.get(b.e.id) ?? 0) * LANE, left: left + 2, width: w - 4 }}>
                <button
                  type="button"
                  onClick={() => onOpen(b.e.id)}
                  onMouseEnter={() => onIntent(b.e.id)}
                  onFocus={() => onIntent(b.e.id)}
                  className={cn(
                    "flex h-[56px] w-full items-stretch gap-2.5 overflow-hidden rounded-[10px] border py-1 pl-1 pr-2.5 text-left transition-colors",
                    blockTone[b.state],
                  )}
                  aria-label={`${b.e.name}. ${b.meta}`}
                >
                  <span aria-hidden className={cn("w-[3px] shrink-0 rounded-full", barTone[b.state])} />
                  <span className="flex min-w-0 flex-1 items-center"><BlockLabel b={b} /></span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function DayAgenda({ blocks, onOpen }: { blocks: Block[]; onOpen: Props["onOpen"] }) {
  return (
    <ol className="flex flex-col gap-2">
      {blocks.map((b) => {
        return (
          <li key={b.e.id}>
            <button
              type="button"
              onClick={() => onOpen(b.e.id)}
              className={cn("flex w-full items-stretch gap-3 rounded-xl border p-3 text-left transition-colors", blockTone[b.state])}
            >
              <span className="w-11 shrink-0 font-mono text-[12px] leading-5">
                {b.clock[0]}
                <br />
                <span className="text-fg-3">{b.clock[1]}</span>
              </span>
              <span aria-hidden className={cn("w-[3px] shrink-0 rounded-full", barTone[b.state])} />
              <BlockLabel b={b} />
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function TimelineView({ days, events, lineupIds, clashMap, onOpen, onIntent }: Props) {
  const sections = days
    .map((day) => ({ day, blocks: blocksForDay(day, events, lineupIds, clashMap) }))
    .filter((s) => s.blocks.length);

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] font-medium text-fg-2" aria-label="Legend">
        <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-[3px] bg-accent" />In your lineup</span>
        <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-[3px] bg-clash" />Clashes with your lineup</span>
        <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-[3px] bg-fg-3/50" />Sold out or closed</span>
        <span className="text-fg-3">All times IST</span>
      </div>
      {sections.map(({ day, blocks }) => (
        <section key={day} aria-labelledby={`tl-${day}`} className="flex flex-col gap-4">
          <h2 id={`tl-${day}`} className="flex items-baseline gap-3">
            <span className="text-heading-l">{weekdayLong(day)}</span>
            <span className="font-mono text-[13px] text-fg-3">{formatDayMonth(day)} · {blocks.length} events</span>
          </h2>
          <div className="hidden md:block"><DayTimeline day={day} blocks={blocks} onOpen={onOpen} onIntent={onIntent} /></div>
          <div className="md:hidden"><DayAgenda blocks={blocks} onOpen={onOpen} /></div>
        </section>
      ))}
    </div>
  );
}
