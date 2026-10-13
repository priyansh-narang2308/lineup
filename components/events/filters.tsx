"use client";

import { useEffect, useRef, useState } from "react";
import {
  LayoutGrid,
  Search,
  SlidersHorizontal,
  GanttChart,
  Users,
  X,
} from "lucide-react";
import type { Squad } from "@/lib/events/derive";
import {
  DEFAULT_FILTERS,
  activeFilterCount,
  type Filters,
  type Sort,
  type View,
} from "@/lib/events/filter";
import { weekdayShort } from "@/lib/events/time";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type Props = {
  filters: Filters;
  onChange: (f: Filters) => void;
  squad: Squad | null;
  onSquad: (s: Squad | null) => void;
  view: View;
  onView: (v: View) => void;
  days: { date: string; count: number }[];
  resultCount: number;
};

const SQUADS: { v: Squad | null; label: string }[] = [
  { v: null, label: "Any" },
  { v: 1, label: "Solo" },
  { v: 2, label: "2" },
  { v: 3, label: "3" },
  { v: 4, label: "4" },
  { v: 5, label: "5+" },
];

const SORTS: { v: Sort; label: string }[] = [
  { v: "start", label: "Start time" },
  { v: "deadline", label: "Deadline soonest" },
  { v: "price", label: "Lowest price" },
  { v: "seats", label: "Fewest seats left" },
];

const seg =
  "flex items-center gap-0.5 rounded-full border border-line bg-raised p-[3px]";
const segBtn = (on: boolean) =>
  cn(
    "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium whitespace-nowrap transition-colors",
    on ? "bg-fg text-on-accent" : "text-fg-2 hover:text-fg",
  );

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "inline-flex h-[34px] items-center rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors",
        on
          ? "bg-fg text-on-accent"
          : "border border-line text-fg-2 hover:border-line-strong hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

export function SquadPicker({
  squad,
  onSquad,
  compact,
}: {
  squad: Squad | null;
  onSquad: (s: Squad | null) => void;
  compact?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Squad size" className={seg}>
      {!compact && (
        <span className="flex items-center gap-1.5 pl-2.5 pr-1.5 text-[12px] font-medium text-fg-3">
          <Users aria-hidden className="size-3.5" />
          Going as
        </span>
      )}
      {SQUADS.map((s) => (
        <button
          key={s.label}
          type="button"
          role="radio"
          aria-checked={squad === s.v}
          onClick={() => onSquad(s.v)}
          className={segBtn(squad === s.v)}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

function DayTabs({
  days,
  value,
  onChange,
}: {
  days: Props["days"];
  value: string | null;
  onChange: (d: string | null) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Day" className={seg}>
      <button
        type="button"
        role="radio"
        aria-checked={value === null}
        onClick={() => onChange(null)}
        className={segBtn(value === null)}
      >
        All days
      </button>
      {days.map((d) => (
        <button
          key={d.date}
          type="button"
          role="radio"
          aria-checked={value === d.date}
          onClick={() => onChange(d.date)}
          className={segBtn(value === d.date)}
        >
          {weekdayShort(d.date)} {Number(d.date.slice(8))}
          <span
            className={cn(
              "font-mono text-[11px]",
              value === d.date ? "text-on-accent/70" : "text-fg-3",
            )}
          >
            {d.count}
          </span>
        </button>
      ))}
    </div>
  );
}

export function ViewSwitch({
  view,
  onView,
}: {
  view: View;
  onView: (v: View) => void;
}) {
  return (
    <div role="radiogroup" aria-label="View" className={seg}>
      {(
        [
          ["cards", "Cards", LayoutGrid],
          ["timeline", "Timeline", GanttChart],
        ] as const
      ).map(([v, label, Icon]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={view === v}
          onClick={() => onView(v)}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium whitespace-nowrap transition-colors",
            view === v ? "bg-hover text-fg" : "text-fg-3 hover:text-fg",
          )}
        >
          <Icon aria-hidden className="size-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

function SearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (
        e.key === "/" &&
        !e.metaKey &&
        !e.ctrlKey &&
        t.tagName !== "INPUT" &&
        t.tagName !== "TEXTAREA" &&
        !t.isContentEditable
      ) {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <label className="group flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-full border border-line bg-raised pl-3.5 pr-2 transition-colors focus-within:border-fg-3">
      <Search aria-hidden className="size-4 shrink-0 text-fg-3" />
      <span className="sr-only">Search events</span>
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search events, categories, tags"
        className="min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-fg-3 [&::-webkit-search-cancel-button]:hidden"
        enterKeyHint="search"
        autoComplete="off"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="inline-flex size-7 items-center justify-center rounded-full text-fg-3 hover:bg-hover hover:text-fg"
        >
          <X aria-hidden className="size-3.5" />
        </button>
      ) : (
        <kbd className="hidden h-6 items-center rounded-md border border-line-strong px-1.5 font-mono text-[12px] text-fg-3 sm:inline-flex">
          /
        </kbd>
      )}
    </label>
  );
}

function FilterChips({
  filters: f,
  set,
}: {
  filters: Filters;
  set: (p: Partial<Filters>) => void;
}) {
  return (
    <>
      <Chip
        on={f.kind === "technical"}
        onClick={() =>
          set({ kind: f.kind === "technical" ? "all" : "technical" })
        }
      >
        Technical
      </Chip>
      <Chip
        on={f.kind === "cultural"}
        onClick={() =>
          set({ kind: f.kind === "cultural" ? "all" : "cultural" })
        }
      >
        Cultural
      </Chip>
      <Chip on={f.openOnly} onClick={() => set({ openOnly: !f.openOnly })}>
        Open for registration
      </Chip>
      <Chip on={f.free} onClick={() => set({ free: !f.free })}>
        Free
      </Chip>
      <Chip on={f.online} onClick={() => set({ online: !f.online })}>
        Online
      </Chip>
    </>
  );
}

function SortSelect({
  value,
  onChange,
}: {
  value: Sort;
  onChange: (s: Sort) => void;
}) {
  return (
    <label className="relative inline-flex h-[34px] items-center gap-2 rounded-full border border-line pl-3.5 pr-3 text-[13px] text-fg-2 focus-within:border-fg-3">
      <span className="text-fg-3">Sort</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Sort)}
        className="cursor-pointer appearance-none bg-transparent pr-1 font-medium text-fg outline-none"
      >
        {SORTS.map((s) => (
          <option key={s.v} value={s.v} className="bg-elevated">
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FilterBar({
  filters,
  onChange,
  squad,
  onSquad,
  view,
  onView,
  days,
  resultCount,
}: Props) {
  const [sheet, setSheet] = useState(false);
  const set = (p: Partial<Filters>) => onChange({ ...filters, ...p });
  const count =
    activeFilterCount({ ...filters, q: "", day: null }) + (squad ? 1 : 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <SearchField value={filters.q} onChange={(q) => set({ q })} />
        <div className="hidden lg:block">
          <SquadPicker squad={squad} onSquad={onSquad} />
        </div>
        <button
          type="button"
          onClick={() => setSheet(true)}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-line bg-raised px-3.5 text-[14px] font-medium text-fg lg:hidden"
          aria-label={`Filters${count ? `, ${count} active` : ""}`}
        >
          <SlidersHorizontal aria-hidden className="size-4" />
          <span className="hidden sm:inline">Filters</span>
          {count > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 font-mono text-[11px] text-on-accent">
              {count}
            </span>
          )}
        </button>
      </div>

      <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-none [mask-image:linear-gradient(to_right,black_92%,transparent)] lg:[mask-image:none]">
        <DayTabs
          days={days}
          value={filters.day}
          onChange={(day) => set({ day })}
        />
        <span aria-hidden className="mx-1 hidden h-5 w-px bg-line lg:block" />
        <div className="hidden items-center gap-2 lg:flex">
          <FilterChips filters={filters} set={set} />
        </div>
        <div className="ml-auto hidden items-center gap-2.5 lg:flex">
          <SortSelect value={filters.sort} onChange={(sort) => set({ sort })} />
        </div>
        <div className="shrink-0 lg:hidden">
          <ViewSwitch view={view} onView={onView} />
        </div>
      </div>

      <Sheet
        open={sheet}
        onOpenChange={setSheet}
        title="Filters"
        description={`${resultCount} ${resultCount === 1 ? "event matches" : "events match"}`}
        width="md:w-[420px]"
        footer={
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                onChange({
                  ...DEFAULT_FILTERS,
                  q: filters.q,
                  day: filters.day,
                });
                onSquad(null);
              }}
            >
              Reset
            </Button>
            <Button className="flex-1" onClick={() => setSheet(false)}>
              Show {resultCount} {resultCount === 1 ? "event" : "events"}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-7 px-5 pb-6 sm:px-6">
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 text-overline text-fg-3">Squad size</legend>
            <div className="overflow-x-auto scrollbar-none">
              <SquadPicker squad={squad} onSquad={onSquad} compact />
            </div>
            <p className="text-[13px] text-fg-3">
              Hides events your squad can’t enter and splits team fees per
              person.
            </p>
          </fieldset>
          <fieldset>
            <legend className="mb-3 text-overline text-fg-3">Show</legend>
            <div className="flex flex-wrap gap-2">
              <FilterChips filters={filters} set={set} />
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-3 text-overline text-fg-3">Sort by</legend>
            <div className="flex flex-wrap gap-2">
              {SORTS.map((s) => (
                <Chip
                  key={s.v}
                  on={filters.sort === s.v}
                  onClick={() => set({ sort: s.v })}
                >
                  {s.label}
                </Chip>
              ))}
            </div>
          </fieldset>
        </div>
      </Sheet>
    </div>
  );
}
