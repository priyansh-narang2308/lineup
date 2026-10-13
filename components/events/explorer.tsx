"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Share2, X } from "lucide-react";
import type { EventsPayload, ListedEvent } from "@/lib/events/schema";
import { EventsFetchError, fetchEvents, prefetchEventDetail, readSimulation } from "@/lib/events/client";
import { availability, eventDays, isPast, type Squad } from "@/lib/events/derive";
import { clashesWith, type Clash } from "@/lib/events/clash";
import {
  DEFAULT_FILTERS,
  activeFilterCount,
  applyFilters,
  filtersToParams,
  groupByDay,
  paramsToFilters,
  sortEvents,
  type Filters,
  type View,
} from "@/lib/events/filter";
import { festDays } from "@/lib/events/insights";
import { formatDayMonth, formatDuration, weekdayLong } from "@/lib/events/time";
import { decodeLineup, lineup, useLineupState } from "@/lib/lineup/store";
import { EventCard, EventCardSkeleton } from "./event-card";
import { EventDrawer } from "./event-drawer";
import { FilterBar, ViewSwitch } from "./filters";
import { StaleBanner, StatePanel } from "./states";
import { TimelineView } from "./timeline";
import { LineupToggle } from "@/components/lineup/lineup-toggle";
import { LineupPanel } from "@/components/lineup/lineup-panel";
import { Button } from "@/components/ui/button";
import { availabilityLabel } from "@/lib/events/format";

type Phase = "loading" | "ready" | "error";

function ageLabel(ms: number, now: number): string {
  const m = Math.round((now - ms) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h ago` : "over a day ago";
}

export function EventsExplorer({ initial }: { initial: EventsPayload | null }) {
  const [data, setData] = useState<EventsPayload | null>(initial);
  const [phase, setPhase] = useState<Phase>(initial ? "ready" : "loading");
  const [error, setError] = useState<EventsFetchError | null>(null);
  const [stale, setStale] = useState<EventsFetchError | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [view, setView] = useState<View>("cards");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [shared, setShared] = useState<string[] | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [sim, setSim] = useState<string | null>(null);
  const urlReady = useRef(false);
  const pushedDrawer = useRef(false);
  const { ids, squad } = useLineupState();

  const load = useCallback(async (mode: "initial" | "refresh" | "retry") => {
    if (mode === "retry") setRetrying(true);
    if (mode === "initial") setPhase("loading");
    try {
      const fresh = await fetchEvents();
      setData(fresh);
      setPhase("ready");
      setError(null);
      setStale(null);
    } catch (err) {
      const e = err instanceof EventsFetchError ? err : new EventsFetchError("server", "Something went wrong.");
      setData((cur) => {
        if (cur && mode !== "initial") setStale(e);
        else {
          setError(e);
          setPhase("error");
        }
        return cur;
      });
    } finally {
      setRetrying(false);
    }
  }, []);

  // Mount: read URL state, then revalidate the server snapshot (or load from scratch).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const { filters: f, view: v } = paramsToFilters(p);
    setFilters(f);
    setView(v);
    setDrawerId(p.get("e"));
    if (p.get("panel") === "lineup") setPanelOpen(true);
    setNow(Date.now());
    urlReady.current = true;

    const simulation = readSimulation();
    setSim(simulation);
    if (simulation) {
      setData(null);
      load("initial");
    } else if (!initial) load("initial");
    else load("refresh");

    const onPop = () => setDrawerId(new URLSearchParams(window.location.search).get("e"));
    const onOnline = () => load("retry");
    window.addEventListener("popstate", onPop);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("online", onOnline);
    };
  }, [initial, load]);

  // Shared lineup link (?lineup=...) — offer, never overwrite silently.
  useEffect(() => {
    if (!data) return;
    const param = new URLSearchParams(window.location.search).get("lineup");
    const decoded = decodeLineup(param, data.events.map((e) => e.id));
    setShared(decoded.length ? decoded : null);
  }, [data]);

  // Keep the URL in sync with filters (replaceState: no history spam, no re-render).
  useEffect(() => {
    if (!urlReady.current) return;
    const cur = new URLSearchParams(window.location.search);
    const next = filtersToParams(filters, view);
    for (const k of ["e", "simulate", "lineup"]) {
      const v = cur.get(k);
      if (v) next.set(k, v);
    }
    const qs = next.toString();
    window.history.replaceState(window.history.state, "", qs ? `?${qs}` : window.location.pathname);
  }, [filters, view]);

  const openEvent = useCallback((id: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("e", id);
    window.history.pushState(window.history.state, "", url);
    pushedDrawer.current = true;
    setPanelOpen(false);
    setDrawerId(id);
  }, []);

  const closeEvent = useCallback(() => {
    setDrawerId(null);
    if (pushedDrawer.current) {
      pushedDrawer.current = false;
      window.history.back();
    } else {
      const url = new URL(window.location.href);
      url.searchParams.delete("e");
      window.history.replaceState(window.history.state, "", url);
    }
  }, []);

  const events = useMemo(() => data?.events ?? [], [data]);
  const byId = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);
  const lineupEvents = useMemo(() => ids.map((id) => byId.get(id)).filter((e): e is ListedEvent => !!e), [ids, byId]);
  const missing = data ? ids.filter((id) => !byId.has(id)).length : 0;
  const lineupIds = useMemo(() => new Set(lineupEvents.map((e) => e.id)), [lineupEvents]);
  const clashMap = useMemo(() => {
    const m = new Map<string, Clash[]>();
    for (const e of events) if (!lineupIds.has(e.id)) m.set(e.id, clashesWith(e, lineupEvents));
    return m;
  }, [events, lineupEvents, lineupIds]);

  const days = useMemo(() => festDays(events), [events]);
  const dayCounts = useMemo(
    () => days.map((d) => ({ date: d, count: events.filter((e) => !isPast(e) && eventDays(e).includes(d)).length })),
    [days, events],
  );
  const results = useMemo(() => sortEvents(applyFilters(events, filters, squad), filters.sort, squad), [events, filters, squad]);
  const grouped = useMemo(() => groupByDay(results), [results]);
  const upcomingCount = events.filter((e) => !isPast(e)).length;
  const filterCount = activeFilterCount(filters) + (squad ? 1 : 0);

  const resetFilters = () => {
    setFilters({ ...DEFAULT_FILTERS, sort: filters.sort });
    lineup.setSquad(null);
  };

  const cardProps = (e: ListedEvent) => {
    const inLineup = lineupIds.has(e.id);
    const clashes = clashMap.get(e.id) ?? [];
    const avail = availability(e);
    return {
      state: inLineup ? ("in" as const) : clashes.length ? ("clash" as const) : avail !== "open" ? ("muted" as const) : ("default" as const),
      clashText: clashes.length
        ? `Overlaps ${clashes[0].with.name.split(":")[0]} for ${formatDuration(clashes[0].minutes)}${clashes.length > 1 ? ` · +${clashes.length - 1} more` : ""}`
        : undefined,
      action: (
        <LineupToggle
          id={e.id}
          name={e.name}
          clashLabel={clashes.length ? `clashes with ${clashes.length}` : undefined}
          unavailableLabel={avail !== "open" ? (avail === "completed" ? "Ended" : availabilityLabel[avail]) : undefined}
        />
      ),
    };
  };

  const drawerSummary = drawerId ? (byId.get(drawerId) ?? null) : null;

  return (
    <div className="container-page pb-32">
      <header className="flex flex-col gap-6 pt-10 pb-6 sm:pt-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-display-m">Events</h1>
            <p className="text-[15px] text-fg-2">
              {data ? (
                <>
                  {upcomingCount} upcoming{days.length ? ` · ${formatDayMonth(days[0]).split(" ")[0]}–${formatDayMonth(days[days.length - 1])}` : ""} · times in IST
                </>
              ) : phase === "loading" ? (
                <span className="skeleton inline-block h-4 w-56 rounded align-middle" />
              ) : (
                "Campus fest events"
              )}
            </p>
          </div>
          <div className="hidden lg:block">
            <ViewSwitch view={view} onView={setView} />
          </div>
        </div>
        {sim && (
          <p className="flex flex-wrap items-center gap-2 rounded-xl border border-info/30 bg-info-subtle/50 px-4 py-2.5 text-[13px] text-fg-2">
            <span className="font-medium text-info">Reliability lab</span> Simulating “{sim}” in the browser data layer — the real API is not touched.
            <a href="/events" className="ml-auto font-medium text-fg underline-offset-4 hover:underline">Exit</a>
          </p>
        )}
        <FilterBar
          filters={filters}
          onChange={setFilters}
          squad={squad}
          onSquad={lineup.setSquad}
          view={view}
          onView={setView}
          days={dayCounts}
          resultCount={results.length}
        />
      </header>

      <p className="sr-only" aria-live="polite">
        {phase === "loading" ? "Loading events" : data ? `${results.length} events shown` : ""}
      </p>

      <div className="flex flex-col gap-6">
        {stale && data && (
          <StaleBanner
            reason={stale.message}
            ageLabel={ageLabel(data.fetchedAt, now ?? data.fetchedAt)}
            onRetry={() => load("retry")}
            retrying={retrying}
          />
        )}
        {shared && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-accent/40 bg-accent-subtle/60 py-2.5 pl-4 pr-2 text-[13px]">
            <Share2 aria-hidden className="size-4 text-accent" />
            <p className="min-w-0 flex-1">Someone shared a lineup with {shared.length} {shared.length === 1 ? "event" : "events"}.</p>
            <Button size="sm" onClick={() => { lineup.replace([...new Set([...ids, ...shared])]); setShared(null); setPanelOpen(true); }}>
              Add to my lineup
            </Button>
            <button type="button" onClick={() => setShared(null)} aria-label="Dismiss" className="inline-flex size-8 items-center justify-center rounded-full text-fg-3 hover:bg-hover hover:text-fg">
              <X aria-hidden className="size-4" />
            </button>
          </div>
        )}
        {data && data.invalid > 0 && (
          <p className="text-[13px] text-fg-3">{data.invalid} {data.invalid === 1 ? "event was" : "events were"} hidden because the API returned incomplete data.</p>
        )}

        {phase === "loading" && !data ? (
          <div aria-busy="true" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => <EventCardSkeleton key={i} />)}
          </div>
        ) : phase === "error" && !data && error ? (
          <div className="py-10">
            <StatePanel
              type={error.kind}
              message={error.message}
              onRetry={() => load("retry")}
              retrying={retrying}
              secondary={sim ? <Button size="sm" variant="ghost" onClick={() => (window.location.href = "/events")}>Exit simulation</Button> : undefined}
            />
          </div>
        ) : data && events.length === 0 ? (
          <div className="py-10"><StatePanel type="empty" onRetry={() => load("retry")} retrying={retrying} /></div>
        ) : results.length === 0 ? (
          <div className="py-10">
            <StatePanel
              type="no_matches"
              message={filters.q ? `Nothing matches “${filters.q}” with the current filters.` : undefined}
              secondary={<Button size="sm" onClick={resetFilters}>Clear {filterCount > 1 ? `${filterCount} filters` : "filters"}</Button>}
            />
          </div>
        ) : view === "timeline" ? (
          <TimelineView
            days={filters.day ? [filters.day] : days}
            events={results.filter((e) => !isPast(e))}
            lineupIds={lineupIds}
            clashMap={clashMap}
            onOpen={openEvent}
            onIntent={prefetchEventDetail}
          />
        ) : (
          <div className="flex flex-col gap-14">
            {grouped.upcoming.map(({ day, events: list }, gi) => (
              <section key={day} aria-labelledby={`day-${day}`} className="flex flex-col gap-5 [content-visibility:auto] [contain-intrinsic-size:auto_900px]">
                <h2 id={`day-${day}`} className="flex items-baseline gap-3">
                  <span className="text-heading-l">{weekdayLong(day)}</span>
                  <span className="font-mono text-[13px] text-fg-3">{formatDayMonth(day)} · {list.length} {list.length === 1 ? "event" : "events"}</span>
                </h2>
                <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((e, i) => (
                    <li key={e.id} className="flex [&>article]:flex-1">
                      <EventCard
                        event={e}
                        squad={squad}
                        onOpen={() => openEvent(e.id)}
                        onIntent={() => prefetchEventDetail(e.id)}
                        imagePriority={gi === 0 && i < 3}
                        {...cardProps(e)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            {grouped.past.length > 0 && (
              <details className="group rounded-2xl border border-line-subtle bg-surface">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-[15px] font-medium">
                  <span>Already happened <span className="font-mono text-[13px] text-fg-3">· {grouped.past.length}</span></span>
                  <ChevronDown aria-hidden className="size-4 text-fg-3 transition-transform group-open:rotate-180" />
                </summary>
                <ul className="grid gap-5 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3">
                  {grouped.past.map((e) => (
                    <li key={e.id} className="flex [&>article]:flex-1">
                      <EventCard event={e} squad={squad} onOpen={() => openEvent(e.id)} {...cardProps(e)} state="muted" />
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>

      {drawerId && (
        <EventDrawer
          key={drawerId}
          id={drawerId}
          summary={drawerSummary}
          squad={squad as Squad | null}
          clashes={clashMap.get(drawerId) ?? []}
          inLineup={lineupIds.has(drawerId)}
          onClose={closeEvent}
        />
      )}
      <LineupPanel events={lineupEvents} missing={missing} squad={squad} open={panelOpen} onOpenChange={setPanelOpen} onOpenEvent={openEvent} />
    </div>
  );
}
