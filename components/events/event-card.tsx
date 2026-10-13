import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Clock3, Users, Zap } from "lucide-react";
import type { ListedEvent } from "@/lib/events/schema";
import {
  modeLabel,
  priceFor,
  teamLabel,
  type Squad,
} from "@/lib/events/derive";
import { dateLabel, statusBadge, timeRange } from "@/lib/events/format";
import { eventImage } from "@/lib/event-image";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

export type CardState = "default" | "in" | "clash" | "muted";

type Props = {
  event: ListedEvent;
  squad?: Squad | null;
  state?: CardState;
  clashText?: string;
  /** Either a link target (landing) or an open handler wrapper (events page). */
  href?: string;
  onOpen?: () => void;
  onIntent?: () => void;
  action?: ReactNode;
  imagePriority?: boolean;
  sizes?: string;
};

export function EventCard({
  event: e,
  squad = null,
  state = "default",
  clashText,
  href,
  onOpen,
  onIntent,
  action,
  imagePriority,
  sizes = "(min-width: 1280px) 380px, (min-width: 768px) 45vw, 92vw",
}: Props) {
  const price = priceFor(e, squad);
  const status = statusBadge(e);
  const muted = state === "muted";
  const titleClass =
    "after:absolute after:inset-0 after:z-[1] after:rounded-[inherit] focus-visible:outline-none text-left";
  const src = eventImage(e.cover_image_url);

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-surface transition-[border-color,transform,box-shadow] duration-300 ease-[var(--ease-out)]",
        "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent",
        state === "in" &&
          "border-accent/80 shadow-[0_0_0_1px_var(--color-accent)]",
        state === "clash" &&
          "border-clash/80 shadow-[0_0_0_1px_var(--color-clash)]",
        state !== "in" &&
          state !== "clash" &&
          "border-line-subtle hover:border-line-strong hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]",
      )}
    >
      <div className="relative aspect-[3/2] overflow-hidden bg-raised">
        {src && (
          <Image
            src={src}
            alt={e.cover_image_alt || ""}
            fill
            sizes={sizes}
            quality={60}
            preload={imagePriority}
            loading={imagePriority ? undefined : "lazy"}
            className={cn(
              "object-cover transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.03]",
              muted && "opacity-60 grayscale",
            )}
          />
        )}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-canvas/60 via-transparent to-transparent"
        />
        <div className="absolute left-3 top-3 z-[2]">
          <Badge tone="overlay">{dateLabel(e)}</Badge>
        </div>
        {action && <div className="absolute right-3 top-3 z-[2]">{action}</div>}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 px-4 pt-3.5 pb-4">
        <p className="text-overline truncate text-fg-3">
          {e.category} · {modeLabel(e)}
        </p>
        <h3
          className={cn(
            "text-[17px] leading-6 font-semibold tracking-[-0.01em] line-clamp-2",
            muted ? "text-fg-2" : "text-fg",
          )}
        >
          {href ? (
            <Link
              href={href}
              className={titleClass}
              onMouseEnter={onIntent}
              onFocus={onIntent}
            >
              {e.name}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onOpen}
              onMouseEnter={onIntent}
              onFocus={onIntent}
              className={titleClass}
            >
              {e.name}
            </button>
          )}
        </h3>
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[13px] text-fg-2">
          <span className="inline-flex items-center gap-1.5">
            <Clock3 aria-hidden className="size-3.5 text-fg-3" />
            <span className="font-mono text-[12.5px]">{timeRange(e)}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users aria-hidden className="size-3.5 text-fg-3" />
            {teamLabel(e)}
          </span>
        </div>
        {(state === "clash" || state === "in") && clashText && (
          <p className="relative z-[2] flex items-center gap-2 rounded-[10px] bg-clash-subtle px-2.5 py-2 text-[12px] font-medium text-clash">
            <Zap aria-hidden className="size-3.5 shrink-0" />
            {clashText}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line-subtle pt-3">
          <p className="min-w-0 truncate text-[13px]">
            <span
              className={cn(
                "text-[14px] font-medium",
                muted ? "text-fg-2" : "text-fg",
              )}
            >
              {price.primary}
            </span>
            {price.unit && <span className="text-fg-3"> {price.unit}</span>}
          </p>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
      </div>
    </article>
  );
}

export function EventCardSkeleton() {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-2xl border border-line-subtle bg-surface"
    >
      <div className="skeleton aspect-[3/2]" />
      <div className="flex flex-col gap-3 p-4">
        <div className="skeleton h-2.5 w-24 rounded" />
        <div className="skeleton h-4 w-4/5 rounded" />
        <div className="skeleton h-4 w-3/5 rounded" />
        <div className="skeleton h-3 w-2/3 rounded" />
        <div className="mt-2 h-px bg-line-subtle" />
        <div className="skeleton h-3.5 w-1/3 rounded" />
      </div>
    </div>
  );
}
