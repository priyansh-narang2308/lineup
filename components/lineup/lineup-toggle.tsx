"use client";

import { Check, Plus, X, Zap } from "lucide-react";
import { lineup, useLineupState } from "@/lib/lineup/store";
import { cn } from "@/lib/cn";

type Props = {
  id: string;
  name: string;
  clashLabel?: string;
  unavailableLabel?: string;
  size?: "sm" | "md";
  className?: string;
};

export function LineupToggle({
  id,
  name,
  clashLabel,
  unavailableLabel,
  size = "sm",
  className,
}: Props) {
  const { ids } = useLineupState();
  const added = ids.includes(id);
  const disabled = !added && !!unavailableLabel;

  const state = added
    ? "added"
    : disabled
      ? "disabled"
      : clashLabel
        ? "clash"
        : "add";
  const label = added
    ? "In lineup"
    : disabled
      ? unavailableLabel
      : clashLabel
        ? "Clashes"
        : "Add";
  const Icon = added ? Check : disabled ? X : clashLabel ? Zap : Plus;

  return (
    <button
      type="button"
      aria-pressed={added}
      disabled={disabled}
      onClick={(ev) => {
        ev.stopPropagation();
        lineup.toggle(id);
      }}
      aria-label={
        added
          ? `Remove ${name} from your lineup`
          : disabled
            ? `${name}: ${unavailableLabel}`
            : clashLabel
              ? `Add ${name} to your lineup (${clashLabel})`
              : `Add ${name} to your lineup`
      }
      title={state === "clash" ? clashLabel : undefined}
      className={cn(
        "relative inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap backdrop-blur-md",
        "transition-[background-color,color,border-color,transform] duration-200 ease-out active:scale-95",
        size === "sm"
          ? "h-8 pl-2.5 pr-3 text-[12px]"
          : "h-10 pl-3.5 pr-4 text-[14px]",
        state === "add" &&
          "border border-line-strong bg-elevated/85 text-fg hover:border-fg-3 hover:bg-hover",
        state === "added" && "bg-accent text-on-accent hover:bg-accent-hover",
        state === "clash" &&
          "border border-clash/70 bg-clash-subtle/90 text-clash hover:bg-clash-subtle",
        state === "disabled" && "border border-line bg-raised/85 text-fg-3",
        className,
      )}
    >
      <Icon
        aria-hidden
        className={size === "sm" ? "size-3.5" : "size-4"}
        strokeWidth={2.25}
      />
      {label}
    </button>
  );
}
