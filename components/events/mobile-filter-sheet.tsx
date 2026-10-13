"use client";

import type { Squad } from "@/lib/events/derive";
import { DEFAULT_FILTERS, type Filters } from "@/lib/events/filter";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Chip, FilterChips, SORTS, SquadPicker } from "./filters";

/** Mobile/tablet filters. Loaded on first open, keeping Radix Dialog out of the initial bundle. */
export function MobileFilterSheet({
  open,
  onOpenChange,
  filters,
  onChange,
  squad,
  onSquad,
  resultCount,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  filters: Filters;
  onChange: (f: Filters) => void;
  squad: Squad | null;
  onSquad: (s: Squad | null) => void;
  resultCount: number;
}) {
  const set = (p: Partial<Filters>) => onChange({ ...filters, ...p });
  return (
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
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
            <Button className="flex-1" onClick={() => onOpenChange(false)}>
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
  );
}
