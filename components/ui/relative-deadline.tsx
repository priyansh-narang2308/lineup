"use client";

import { useEffect, useState } from "react";
import { relativeDays } from "@/lib/events/time";

/** Renders an absolute label on the server, then a live countdown after mount (no hydration mismatch). */
export function RelativeDeadline({ epochMs, fallback, prefix = "" }: { epochMs: number; fallback: string; prefix?: string }) {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setLabel(relativeDays(epochMs, Date.now()));
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, [epochMs]);
  return (
    <time dateTime={new Date(epochMs).toISOString()} suppressHydrationWarning>
      {label ? (label === "closed" ? "Closed" : `${prefix}${label}`) : fallback}
    </time>
  );
}
