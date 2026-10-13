"use client";

import { LazyMotion, MotionConfig, m, type Variants } from "motion/react";
import type { ReactNode } from "react";

/**
 * Motion system.
 * - Features load lazily (see features.ts), so the initial bundle only carries the tiny `m` renderer.
 * - Server components pass through as children; only these wrappers hydrate.
 * - LCP-critical content must use `slide` (transform only, never hidden) or no motion at all.
 */

const loadFeatures = () => import("./features").then((r) => r.default);
export const EASE = [0.22, 1, 0.36, 1] as const;

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user" transition={{ duration: 0.6, ease: EASE }}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  /** Transform-only entrance: content is painted immediately (safe for LCP elements). */
  slide?: boolean;
  /** Animate on mount instead of when scrolled into view (above-the-fold content). */
  onMount?: boolean;
  as?: "div" | "section" | "li" | "header" | "p";
};

/** Fade-up on scroll into view (once). */
export function Reveal({ children, className, delay = 0, y = 18, slide, onMount, as = "div" }: RevealProps) {
  const Tag = m[as];
  const hidden = slide ? { y } : { opacity: 0, y };
  const shown = { opacity: 1, y: 0 };
  return (
    <Tag
      className={className}
      initial={hidden}
      {...(onMount ? { animate: shown } : { whileInView: shown, viewport: { once: true, margin: "0px 0px -12% 0px" } })}
      transition={{ duration: slide ? 0.7 : 0.6, ease: EASE, delay }}
    >
      {children}
    </Tag>
  );
}

const group: Variants = { hidden: {}, shown: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };
const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

/** Staggered children; wrap each child in <StaggerItem>. */
export function Stagger({ children, className, as = "div" }: { children: ReactNode; className?: string; as?: "div" | "ul" | "ol" | "dl" }) {
  const Tag = m[as];
  return (
    <Tag className={className} variants={group} initial="hidden" whileInView="shown" viewport={{ once: true, margin: "0px 0px -10% 0px" }}>
      {children}
    </Tag>
  );
}

export function StaggerItem({ children, className, as = "div" }: { children: ReactNode; className?: string; as?: "div" | "li" }) {
  const Tag = m[as];
  return (
    <Tag className={className} variants={item}>
      {children}
    </Tag>
  );
}
