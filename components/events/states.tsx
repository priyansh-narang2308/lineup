import { AlertTriangle, Clock3, RotateCw, SearchX, WifiOff, X } from "lucide-react";
import type { ReactNode } from "react";
import type { FetchErrorKind } from "@/lib/events/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type PanelType = FetchErrorKind | "empty" | "no_matches";

const COPY: Record<PanelType, { icon: typeof AlertTriangle; tone: string; title: string; body: string }> = {
  server: { icon: AlertTriangle, tone: "bg-clash-subtle text-clash", title: "We couldn’t load events", body: "The events service returned an error. Nothing is lost — your lineup is saved on this device." },
  timeout: { icon: Clock3, tone: "bg-warn-subtle text-warn", title: "This is taking longer than usual", body: "The events service didn’t respond in time, even after retrying. Check your connection or try again." },
  offline: { icon: WifiOff, tone: "bg-info-subtle text-info", title: "You’re offline", body: "We’ll try again automatically as soon as you’re back online." },
  rate_limited: { icon: Clock3, tone: "bg-warn-subtle text-warn", title: "Too many requests", body: "The events service asked us to slow down. Try again in a moment." },
  malformed: { icon: AlertTriangle, tone: "bg-clash-subtle text-clash", title: "We received data we couldn’t read", body: "The events service sent an unexpected response. We didn’t show anything we couldn’t verify." },
  not_found: { icon: X, tone: "bg-elevated text-fg-2", title: "That event doesn’t exist", body: "The link may be old or mistyped — the event ID wasn’t found in the events API." },
  empty: { icon: SearchX, tone: "bg-elevated text-fg-2", title: "No events published yet", body: "The events service responded, but there are no events right now. Check back soon." },
  no_matches: { icon: SearchX, tone: "bg-elevated text-fg-2", title: "No events match these filters", body: "Try removing a filter or changing your squad size." },
};

export function StatePanel({
  type,
  message,
  detail,
  onRetry,
  retrying,
  secondary,
  className,
}: {
  type: PanelType;
  message?: string;
  detail?: string;
  onRetry?: () => void;
  retrying?: boolean;
  secondary?: ReactNode;
  className?: string;
}) {
  const c = COPY[type];
  const Icon = c.icon;
  const isError = type !== "empty" && type !== "no_matches";
  return (
    <div
      role={isError ? "alert" : "status"}
      className={cn("mx-auto flex w-full max-w-[460px] flex-col items-center gap-4 rounded-[20px] border border-line-subtle bg-surface px-6 py-9 text-center sm:px-8", className)}
    >
      <span className={cn("flex size-12 items-center justify-center rounded-full", c.tone)}>
        <Icon aria-hidden className="size-[22px]" />
      </span>
      <h2 className="text-[17px] font-semibold tracking-[-0.01em]">{c.title}</h2>
      <p className="text-[14px] leading-6 text-fg-2">{message ?? c.body}</p>
      {detail && <p className="font-mono text-[12px] text-fg-3">{detail}</p>}
      {(onRetry || secondary) && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2.5">
          {onRetry && (
            <Button size="sm" onClick={onRetry} disabled={retrying} icon={<RotateCw aria-hidden className={cn("size-3.5", retrying && "animate-spin")} />}>
              {retrying ? "Retrying…" : "Try again"}
            </Button>
          )}
          {secondary}
        </div>
      )}
    </div>
  );
}

export function StaleBanner({ ageLabel, onRetry, retrying, reason }: { ageLabel: string; onRetry: () => void; retrying?: boolean; reason: string }) {
  return (
    <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-warn/35 bg-warn-subtle/55 py-2 pl-4 pr-2 text-[13px]">
      <AlertTriangle aria-hidden className="size-4 shrink-0 text-warn" />
      <p className="min-w-0 flex-1">
        <span className="font-medium">Live update failed</span>
        <span className="text-fg-2"> — {reason} Showing the schedule loaded {ageLabel}.</span>
      </p>
      <Button size="sm" variant="secondary" onClick={onRetry} disabled={retrying}>
        {retrying ? "Retrying…" : "Retry"}
      </Button>
    </div>
  );
}
