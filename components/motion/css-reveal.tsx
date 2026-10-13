import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Zero-JavaScript reveals for the landing page (server components).
 * Fade-up is driven by CSS scroll-driven animations (`animation-timeline: view()`,
 * see globals.css). Browsers without support simply show the content — nothing
 * is ever hidden behind JavaScript, so LCP and Speed Index are unaffected.
 * Same API as the framer-motion version used on /events.
 */

type Tag = "div" | "section" | "li" | "header" | "p" | "ul" | "ol" | "dl";

export function Reveal({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: Tag;
  delay?: number;
  y?: number;
}) {
  const T = as;
  return <T className={cn("reveal", className)}>{children}</T>;
}

export function Stagger({ children, className, as = "div" }: { children: ReactNode; className?: string; as?: Tag }) {
  const T = as;
  return <T className={className}>{children}</T>;
}

/** Items in a row get slightly offset ranges so they cascade as they enter. */
export function StaggerItem({
  children,
  className,
  as = "div",
  index = 0,
}: {
  children: ReactNode;
  className?: string;
  as?: Tag;
  index?: number;
}) {
  const T = as;
  return (
    <T className={cn("reveal", className)} style={{ "--reveal-i": index % 3 } as CSSProperties}>
      {children}
    </T>
  );
}
