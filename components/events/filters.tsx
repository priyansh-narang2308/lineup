"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpDown,
  CalendarDays,
  Clock3,
  Cpu,
  GanttChart,
  Globe,
  Hourglass,
  LayoutGrid,
  ListFilter,
  Palette,
  Search,
  Shapes,
  SlidersHorizontal,
  Ticket,
  Users,
  Armchair,
  Wallet,
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
import {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
} from "@/components/ui/menu";
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
  compact,
}: {
  view: View;
  onView: (v: View) => void;
  compact?: boolean;
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
          aria-label={compact ? `${label} view` : undefined}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors",
            compact ? "size-8 justify-center" : "h-8 px-3",
            view === v ? "bg-hover text-fg" : "text-fg-3 hover:text-fg",
          )}
        >
          <Icon aria-hidden className={compact ? "size-4" : "size-3.5"} />
          {!compact && label}
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
    <label className="group flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-full border border-line bg-raised pl-3.5 pr-2 transition-colors focus-within:border-fg-3 lg:max-w-[520px]">
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

const SORT_ICONS: Record<Sort, typeof Clock3> = {
  start: Clock3,
  deadline: Hourglass,
  price: Wallet,
  seats: Armchair,
};

const squadLabel = (s: Squad | null) =>
  s === null ? "Any size" : s === 1 ? "Solo" : s === 5 ? "5+ people" : `${s} people`;

const dayLabel = (d: string) => `${weekdayShort(d)} ${Number(d.slice(8))}`;

/** Desktop: three quiet dropdowns instead of a wall of chips. */
function DesktopControls({
  filters,
  set,
  squad,
  onSquad,
  days,
}: {
  filters: Filters;
  set: (p: Partial<Filters>) => void;
  squad: Squad | null;
  onSquad: (s: Squad | null) => void;
  days: Props["days"];
}) {
  const SortIcon = SORT_ICONS[filters.sort];
  const filterCount = activeFilterCount({ ...filters, q: "", day: null, sort: "start" }) + (squad ? 1 : 0);
  return (
    <div className="flex items-center gap-2.5">
      <Menu>
        <MenuTrigger icon={<CalendarDays aria-hidden className="size-4" />} active={filters.day !== null} aria-label="Day">
          {filters.day ? dayLabel(filters.day) : "All days"}
        </MenuTrigger>
        <MenuContent>
          <MenuLabel>Day</MenuLabel>
          <MenuRadioGroup value={filters.day ?? "all"} onValueChange={(v) => set({ day: v === "all" ? null : v })}>
            <MenuRadioItem value="all">All days</MenuRadioItem>
            {days.map((d) => (
              <MenuRadioItem key={d.date} value={d.date} hint={`${d.count}`}>
                {dayLabel(d.date)}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuContent>
      </Menu>

      <Menu>
        <MenuTrigger icon={<SortIcon aria-hidden className="size-4" />} aria-label={`Sort by ${SORTS.find((x) => x.v === filters.sort)?.label}`}>
          {SORTS.find((x) => x.v === filters.sort)?.label}
        </MenuTrigger>
        <MenuContent>
          <MenuLabel>Sort by</MenuLabel>
          <MenuRadioGroup value={filters.sort} onValueChange={(v) => set({ sort: v as Sort })}>
            {SORTS.map((o) => {
              const Icon = SORT_ICONS[o.v];
              return (
                <MenuRadioItem key={o.v} value={o.v} icon={<Icon aria-hidden className="size-4" />}>
                  {o.label}
                </MenuRadioItem>
              );
            })}
          </MenuRadioGroup>
        </MenuContent>
      </Menu>

      <Menu>
        <MenuTrigger icon={<ListFilter aria-hidden className="size-4" />} active={filterCount > 0} badge={filterCount} aria-label={`Filter${filterCount ? `, ${filterCount} active` : ""}`}>
          Filter
        </MenuTrigger>
        <MenuContent className="min-w-[264px]">
          <MenuSub>
            <MenuSubTrigger icon={<Users aria-hidden className="size-4" />} value={squadLabel(squad)}>
              Squad size
            </MenuSubTrigger>
            <MenuSubContent>
              <MenuLabel>Going as</MenuLabel>
              <MenuRadioGroup value={String(squad ?? "any")} onValueChange={(v) => onSquad(v === "any" ? null : (Number(v) as Squad))}>
                {SQUADS.map((o) => (
                  <MenuRadioItem key={o.label} value={String(o.v ?? "any")}>
                    {o.v === null ? "Any size" : o.label === "Solo" ? "Solo" : `${o.label} people`}
                  </MenuRadioItem>
                ))}
              </MenuRadioGroup>
              <p className="max-w-[210px] px-2.5 pt-1 pb-2 text-[12px] leading-4 text-fg-3">Hides events your squad can’t enter and splits team fees per person.</p>
            </MenuSubContent>
          </MenuSub>
          <MenuSub>
            <MenuSubTrigger icon={<Shapes aria-hidden className="size-4" />} value={filters.kind === "all" ? "All" : filters.kind === "technical" ? "Technical" : "Cultural"}>
              Event type
            </MenuSubTrigger>
            <MenuSubContent>
              <MenuRadioGroup value={filters.kind} onValueChange={(v) => set({ kind: v as Filters["kind"] })}>
                <MenuRadioItem value="all" icon={<LayoutGrid aria-hidden className="size-4" />}>All types</MenuRadioItem>
                <MenuRadioItem value="technical" icon={<Cpu aria-hidden className="size-4" />}>Technical</MenuRadioItem>
                <MenuRadioItem value="cultural" icon={<Palette aria-hidden className="size-4" />}>Cultural</MenuRadioItem>
              </MenuRadioGroup>
            </MenuSubContent>
          </MenuSub>
          <MenuSeparator />
          <MenuCheckboxItem checked={filters.openOnly} onCheckedChange={(c) => set({ openOnly: c === true })} icon={<Ticket aria-hidden className="size-4" />}>
            Open for registration
          </MenuCheckboxItem>
          <MenuCheckboxItem checked={filters.free} onCheckedChange={(c) => set({ free: c === true })} icon={<Wallet aria-hidden className="size-4" />}>
            Free events
          </MenuCheckboxItem>
          <MenuCheckboxItem checked={filters.online} onCheckedChange={(c) => set({ online: c === true })} icon={<Globe aria-hidden className="size-4" />}>
            Online only
          </MenuCheckboxItem>
        </MenuContent>
      </Menu>
    </div>
  );
}

/** Desktop: one removable chip per active filter, plus Clear. */
function ActiveChips({
  filters: f,
  set,
  squad,
  onSquad,
}: {
  filters: Filters;
  set: (p: Partial<Filters>) => void;
  squad: Squad | null;
  onSquad: (s: Squad | null) => void;
}) {
  const chips: { key: string; icon: typeof Users; label: string; clear: () => void }[] = [];
  if (f.day) chips.push({ key: "day", icon: CalendarDays, label: dayLabel(f.day), clear: () => set({ day: null }) });
  if (squad) chips.push({ key: "squad", icon: Users, label: `Going as ${squadLabel(squad).toLowerCase()}`, clear: () => onSquad(null) });
  if (f.kind !== "all") chips.push({ key: "kind", icon: f.kind === "technical" ? Cpu : Palette, label: f.kind === "technical" ? "Technical" : "Cultural", clear: () => set({ kind: "all" }) });
  if (f.openOnly) chips.push({ key: "open", icon: Ticket, label: "Open for registration", clear: () => set({ openOnly: false }) });
  if (f.free) chips.push({ key: "free", icon: Wallet, label: "Free", clear: () => set({ free: false }) });
  if (f.online) chips.push({ key: "online", icon: Globe, label: "Online", clear: () => set({ online: false }) });
  if (!chips.length) return null;
  return (
    <ul className="flex flex-wrap items-center gap-2 animate-rise" aria-label="Active filters">
      {chips.map(({ key, icon: Icon, label, clear }) => (
        <li key={key}>
          <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-raised pl-2.5 pr-1 text-[13px] font-medium text-fg">
            <Icon aria-hidden className="size-3.5 text-fg-3" />
            {label}
            <button type="button" onClick={clear} aria-label={`Remove filter: ${label}`} className="inline-flex size-6 items-center justify-center rounded-full text-fg-3 transition-colors hover:bg-hover hover:text-fg">
              <X aria-hidden className="size-3.5" />
            </button>
          </span>
        </li>
      ))}
      {chips.length > 1 && (
        <li>
          <button
            type="button"
            onClick={() => {
              set({ day: null, kind: "all", openOnly: false, free: false, online: false });
              onSquad(null);
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-fg-2 transition-colors hover:bg-raised hover:text-fg"
          >
            <X aria-hidden className="size-3.5" />
            Clear all
          </button>
        </li>
      )}
    </ul>
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
        <div className="hidden lg:ml-auto lg:block">
          <DesktopControls filters={filters} set={set} squad={squad} onSquad={onSquad} days={days} />
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
        <div className="shrink-0 lg:hidden">
          <ViewSwitch view={view} onView={onView} compact />
        </div>
      </div>

      <div className="hidden lg:block">
        <ActiveChips filters={filters} set={set} squad={squad} onSquad={onSquad} />
      </div>

      <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-none [mask-image:linear-gradient(to_right,black_92%,transparent)] lg:hidden">
        <DayTabs days={days} value={filters.day} onChange={(day) => set({ day })} />
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
