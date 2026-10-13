import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Tone = "neutral" | "accent" | "clash" | "warn" | "info" | "solid" | "overlay";

const tones: Record<Tone, string> = {
  neutral: "bg-elevated text-fg-2",
  accent: "bg-accent-subtle text-accent",
  clash: "bg-clash-subtle text-clash",
  warn: "bg-warn-subtle text-warn",
  info: "bg-info-subtle text-info",
  solid: "bg-accent text-on-accent",
  overlay: "bg-canvas/75 text-fg backdrop-blur-md",
};

export function Badge({ tone = "neutral", icon, className, children }: { tone?: Tone; icon?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] shrink-0 items-center gap-1 rounded-full px-2 text-[12px] leading-4 font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
