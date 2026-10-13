/* eslint-disable @next/next/no-location-assign-relative-destination */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Share2, X } from "lucide-react";
import type { EventsPayload, ListedEvent } from "@/lib/events/schema";
import {
  EventsFetchError,
  fetchEvents,
  prefetchEventDetail,
  toSimulation,
} from "@/lib/events/client";
import { setSearch, useSearch } from "@/lib/use-url-state";
import { availability, eventDays, type Squad } from "@/lib/events/derive";
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
import dynamic from "next/dynamic";
import { EventCard, EventCardSkeleton } from "./event-card";
import { FilterBar, ViewSwitch } from "./filters";
import { StaleBanner, StatePanel } from "./states";
import { LineupToggle } from "@/components/lineup/lineup-toggle";
import { Button } from "@/components/ui/button";
import { availabilityLabel } from "@/lib/events/format";

const EventDrawer = dynamic(
  () => import("./event-drawer").then((m) => m.EventDrawer),
  { ssr: false },
);
const TimelineView = dynamic(
  () => import("./timeline").then((m) => m.TimelineView),
  { ssr: true },
);
const LineupPanel = dynamic(
  () => import("@/components/lineup/lineup-panel").then((m) => m.LineupPanel),
  { ssr: false },
);

type Phase = "loading" | "ready" | "error";
type Source = {
  data: EventsPayload | null;
  phase: Phase;
  error: EventsFetchError | null;
  stale: { error: EventsFetchError; at: number } | null;
};

function ageLabel(ms: number, now: number): string {
  const m = Math.round((now - ms) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h ago` : "over a day ago";
}

const FILTER_KEYS = [
  "q",
  "day",
  "kind",
  "free",
  "open",
  "online",
  "sort",
  "view",
];

export function EventsExplorer({ initial }: { initial: EventsPayload | null }) {
  // URL is the source of truth for filters, view, drawer, panel and simulation.
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const { filters, view } = useMemo(() => paramsToFilters(params), [params]);
  const drawerId = params.get("e");
  const panelOpen = params.get("panel") === "lineup";
  const sim = toSimulation(params.get("simulate"));

  // Live data (seeded by the prerendered snapshot) and an isolated simulated source.
  const [live, setLive] = useState<Source>({
    data: initial,
    phase: initial ? "ready" : "loading",
    error: null,
    stale: null,
  });
  const [simSrc, setSimSrc] = useState<Source>({
    data: null,
    phase: "loading",
    error: null,
    stale: null,
  });
  const [retrying, setRetrying] = useState(false);
  const pushedDrawer = useRef(false);
  const { ids, squad } = useLineupState();

  const src = sim ? simSrc : live;
  const { data, phase, error, stale } = src;

  /** Only sets state after the request settles, so it is safe to start from an effect. */
  const load = useCallback(async (simulated: boolean) => {
    const set = simulated ? setSimSrc : setLive;
    try {
      const fresh = await fetchEvents();
      set({ data: fresh, phase: "ready", error: null, stale: null });
    } catch (err) {
      const e =
        err instanceof EventsFetchError
          ? err
          : new EventsFetchError("server", "Something went wrong.");
      set((cur) =>
        cur.data
          ? { ...cur, stale: { error: e, at: Date.now() } }
          : { ...cur, phase: "error", error: e },
      );
    } finally {
      setRetrying(false);
    }
  }, []);

  const retry = useCallback(() => {
    setRetrying(true);
    load(!!sim);
  }, [load, sim]);

  // Revalidate the snapshot once on load (or load from scratch); retry when connectivity returns.
  useEffect(() => {
    if (sim) {
      load(true);
      return;
    }
    const timer =
      typeof window !== "undefined" && "requestIdleCallback" in window
        ? window.requestIdleCallback(() => load(false), { timeout: 2500 })
        : setTimeout(() => load(false), 500);

    const onOnline = () => {
      setRetrying(true);
      load(false);
    };
    window.addEventListener("online", onOnline);
    return () => {
      if (typeof window !== "undefined" && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(timer as number);
      } else {
        clearTimeout(timer as number);
      }
      window.removeEventListener("online", onOnline);
    };
  }, [load, sim]);

  const setFilters = useCallback(
    (f: Filters) =>
      setSearch((p) => {
        FILTER_KEYS.forEach((k) => p.delete(k));
        filtersToParams(f, view).forEach((v, k) => p.set(k, v));
      }),
    [view],
  );
  const setView = useCallback(
    (v: View) =>
      setSearch((p) => {
        if (v === "cards") p.delete("view");
        else p.set("view", v);
      }),
    [],
  );
  const setPanelOpen = useCallback(
    (o: boolean) =>
      setSearch((p) => (o ? p.set("panel", "lineup") : p.delete("panel"))),
    [],
  );

  const openEvent = useCallback((id: string) => {
    pushedDrawer.current = true;
    setSearch((p) => {
      p.set("e", id);
      p.delete("panel");
    }, "push");
  }, []);

  const closeEvent = useCallback(() => {
    if (pushedDrawer.current) {
      pushedDrawer.current = false;
      window.history.back();
    } else setSearch((p) => p.delete("e"));
  }, []);

  const events = useMemo(() => data?.events ?? [], [data]);
  const byId = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);
  const lineupEvents = useMemo(
    () => ids.map((id) => byId.get(id)).filter((e): e is ListedEvent => !!e),
    [ids, byId],
  );
  const missing = data ? ids.filter((id) => !byId.has(id)).length : 0;
  const lineupIds = useMemo(
    () => new Set(lineupEvents.map((e) => e.id)),
    [lineupEvents],
  );
  const clashMap = useMemo(() => {
    const m = new Map<string, Clash[]>();
    // For lineup events this lists conflicts with the rest of the lineup.
    for (const e of events) m.set(e.id, clashesWith(e, lineupEvents));
    return m;
  }, [events, lineupEvents]);

  const shared = useMemo(() => {
    const decoded = decodeLineup(
      params.get("lineup"),
      events.map((e) => e.id),
    );
    return decoded.length ? decoded : null;
  }, [params, events]);
  const dismissShared = () => setSearch((p) => p.delete("lineup"));

  const days = useMemo(() => festDays(events), [events]);
  const dayCounts = useMemo(
    () =>
      days.map((d) => ({
        date: d,
        count: events.filter(
          (e) => e.event_status === "ACTIVE" && eventDays(e).includes(d),
        ).length,
      })),
    [days, events],
  );
  const results = useMemo(
    () => sortEvents(applyFilters(events, filters, squad), filters.sort, squad),
    [events, filters, squad],
  );
  const grouped = useMemo(
    () => groupByDay(results, filters.day),
    [results, filters.day],
  );
  const upcomingCount = events.filter(
    (e) => e.event_status === "ACTIVE",
  ).length;
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
      state: inLineup
        ? ("in" as const)
        : clashes.length
          ? ("clash" as const)
          : avail !== "open"
            ? ("muted" as const)
            : ("default" as const),
      clashText: clashes.length
        ? `${inLineup ? "In lineup · overlaps" : "Overlaps"} ${clashes[0].with.name.split(":")[0]} for ${formatDuration(clashes[0].minutes)}${clashes.length > 1 ? ` · +${clashes.length - 1} more` : ""}`
        : undefined,
      action: (
        <LineupToggle
          id={e.id}
          name={e.name}
          clashLabel={
            clashes.length && !inLineup
              ? `clashes with ${clashes.length}`
              : undefined
          }
          unavailableLabel={
            avail !== "open"
              ? avail === "completed"
                ? "Ended"
                : availabilityLabel[avail]
              : undefined
          }
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
                  {upcomingCount} upcoming
                  {days.length
                    ? ` · ${formatDayMonth(days[0]).split(" ")[0]}–${formatDayMonth(days[days.length - 1])}`
                    : ""}{" "}
                  · times in IST
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
            <span className="font-medium text-info">Reliability lab</span>{" "}
            Simulating “{sim}” in the browser data layer — the real API is not
            touched.
            <a
              href="/events"
              className="ml-auto font-medium text-fg underline-offset-4 hover:underline"
            >
              Exit
            </a>
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
        {phase === "loading"
          ? "Loading events"
          : data
            ? `${results.length} events shown`
            : ""}
      </p>

      <div className="flex flex-col gap-6">
        {stale && data && (
          <StaleBanner
            reason={stale.error.message}
            ageLabel={ageLabel(data.fetchedAt, stale.at)}
            onRetry={retry}
            retrying={retrying}
          />
        )}
        {shared && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-accent/40 bg-accent-subtle/60 py-2.5 pl-4 pr-2 text-[13px]">
            <Share2 aria-hidden className="size-4 text-accent" />
            <p className="min-w-0 flex-1">
              Someone shared a lineup with {shared.length}{" "}
              {shared.length === 1 ? "event" : "events"}.
            </p>
            <Button
              size="sm"
              onClick={() => {
                lineup.replace([...new Set([...ids, ...shared])]);
                setSearch((p) => {
                  p.delete("lineup");
                  p.set("panel", "lineup");
                });
              }}
            >
              Add to my lineup
            </Button>
            <button
              type="button"
              onClick={dismissShared}
              aria-label="Dismiss"
              className="inline-flex size-8 items-center justify-center rounded-full text-fg-3 hover:bg-hover hover:text-fg"
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>
        )}
        {data && data.invalid > 0 && (
          <p className="text-[13px] text-fg-3">
            {data.invalid} {data.invalid === 1 ? "event was" : "events were"}{" "}
            hidden because the API returned incomplete data.
          </p>
        )}

        {phase === "loading" && !data ? (
          <div
            aria-busy="true"
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {Array.from({ length: 6 }, (_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        ) : phase === "error" && !data && error ? (
          <div className="py-10">
            <StatePanel
              type={error.kind}
              message={error.message}
              onRetry={retry}
              retrying={retrying}
              secondary={
                sim ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => (window.location.href = "/events")}
                  >
                    Exit simulation
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : data && events.length === 0 ? (
          <div className="py-10">
            <StatePanel type="empty" onRetry={retry} retrying={retrying} />
          </div>
        ) : results.length === 0 ? (
          <div className="py-10">
            <StatePanel
              type="no_matches"
              message={
                filters.q
                  ? `Nothing matches “${filters.q}” with the current filters.`
                  : undefined
              }
              secondary={
                <Button size="sm" onClick={resetFilters}>
                  Clear {filterCount > 1 ? `${filterCount} filters` : "filters"}
                </Button>
              }
            />
          </div>
        ) : view === "timeline" ? (
          <TimelineView
            days={filters.day ? [filters.day] : days}
            events={results.filter((e) => e.event_status === "ACTIVE")}
            lineupIds={lineupIds}
            clashMap={clashMap}
            onOpen={openEvent}
            onIntent={prefetchEventDetail}
          />
        ) : (
          <div className="flex flex-col gap-14">
            {grouped.upcoming.map(({ day, events: list }, gi) => (
              <section
                key={day}
                aria-labelledby={`day-${day}`}
                className={
                  gi > 0
                    ? "flex flex-col gap-5 [content-visibility:auto] [contain-intrinsic-size:auto_900px]"
                    : "flex flex-col gap-5"
                }
              >
                <h2 id={`day-${day}`} className="flex items-baseline gap-3">
                  <span className="text-heading-l">{weekdayLong(day)}</span>
                  <span className="font-mono text-[13px] text-fg-3">
                    {formatDayMonth(day)} · {list.length}{" "}
                    {list.length === 1 ? "event" : "events"}
                  </span>
                </h2>
                <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((e, i) => (
                    <li key={e.id} className="flex [&>article]:flex-1">
                      <EventCard
                        day={filters.day}
                        event={e}
                        squad={squad}
                        onOpen={() => openEvent(e.id)}
                        onIntent={() => prefetchEventDetail(e.id)}
                        imagePriority={gi === 0 && i === 0}
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
                  <span>
                    Past &amp; closed{" "}
                    <span className="font-mono text-[13px] text-fg-3">
                      · {grouped.past.length}
                    </span>
                  </span>
                  <ChevronDown
                    aria-hidden
                    className="size-4 text-fg-3 transition-transform group-open:rotate-180"
                  />
                </summary>
                <ul className="grid gap-5 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3">
                  {grouped.past.map((e) => (
                    <li key={e.id} className="flex [&>article]:flex-1">
                      <EventCard
                        event={e}
                        squad={squad}
                        onOpen={() => openEvent(e.id)}
                        {...cardProps(e)}
                        state="muted"
                      />
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
          id={drawerId}
          summary={drawerSummary}
          squad={squad as Squad | null}
          clashes={clashMap.get(drawerId) ?? []}
          inLineup={lineupIds.has(drawerId)}
          onClose={closeEvent}
        />
      )}
      <LineupPanel
        events={lineupEvents}
        missing={missing}
        squad={squad}
        open={panelOpen}
        onOpenChange={setPanelOpen}
        onOpenEvent={openEvent}
      />
    </div>
  );
}
