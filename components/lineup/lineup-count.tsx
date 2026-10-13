"use client";

import Link from "next/link";
import { useLineupState } from "@/lib/lineup/store";
import { cn } from "@/lib/cn";

export function LineupCount({ compact = false }: { compact?: boolean }) {
  const { ids } = useLineupState();
  const n = ids.length;
  return (
    <Link prefetch={false}
      href="/events?panel=lineup"
      className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full border border-line-strong bg-elevated pl-3.5 pr-1.5 text-[14px] font-medium text-fg transition-colors hover:border-fg-3 hover:bg-hover"
      aria-label={`My lineup, ${n} ${n === 1 ? "event" : "events"}`}
    >
      <span className={compact ? "" : "hidden sm:inline"}>My lineup</span>
      <span className={compact ? "hidden" : "sm:hidden"}>Lineup</span>
      <span
        className={cn(
          "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 font-mono text-[12px] tabular-nums",
          n ? "bg-accent text-on-accent" : "bg-hover text-fg-2",
        )}
      >
        {n}
      </span>
    </Link>
  );
}
