"use client";

import { CalendarDays, Cpu, Globe, LayoutGrid, ListFilter, Palette, Shapes, Ticket, Users, Wallet } from "lucide-react";
import type { Squad } from "@/lib/events/derive";
import { activeFilterCount, type Filters, type Sort } from "@/lib/events/filter";
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
import { SORT_ICONS, SORTS, SQUADS, dayLabel, squadLabel } from "./filters";

/** Desktop: three quiet dropdowns instead of a wall of chips. Loaded on desktop widths only. */
export /** Desktop: three quiet dropdowns instead of a wall of chips. */
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
  days: { date: string; count: number }[];
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

