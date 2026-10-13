"use client";

import { useSyncExternalStore } from "react";

/**
 * The query string as an external store. Lets the URL be the single source of
 * truth for filters / drawer / panel without effects, and stays SSR-safe
 * (server snapshot is empty; React reconciles after hydration).
 */

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function subscribe(l: () => void) {
  listeners.add(l);
  window.addEventListener("popstate", l);
  return () => {
    listeners.delete(l);
    window.removeEventListener("popstate", l);
  };
}

export function useSearch(): string {
  return useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => "",
  );
}

/** Update the query string. `push` creates a history entry (used for the drawer so Back closes it). */
export function setSearch(mutate: (p: URLSearchParams) => void, mode: "replace" | "push" = "replace") {
  const url = new URL(window.location.href);
  mutate(url.searchParams);
  const next = url.searchParams.toString();
  const href = next ? `${url.pathname}?${next}` : url.pathname;
  if (href === window.location.pathname + window.location.search) return;
  if (mode === "push") window.history.pushState(window.history.state, "", href);
  else window.history.replaceState(window.history.state, "", href);
  notify();
}
