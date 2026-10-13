"use client";

import { useSyncExternalStore } from "react";
import type { Squad } from "@/lib/events/derive";

type State = { ids: string[]; squad: Squad | null };
const KEY = "lineup:v1";
const EMPTY: State = { ids: [], squad: null };

let state: State = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function read(): State {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const v = JSON.parse(raw) as Partial<State>;
    const ids = Array.isArray(v.ids)
      ? v.ids.filter((x): x is string => typeof x === "string").slice(0, 60)
      : [];
    const squad =
      v.squad && [1, 2, 3, 4, 5].includes(v.squad) ? (v.squad as Squad) : null;
    return { ids: [...new Set(ids)], squad };
  } catch {
    return EMPTY;
  }
}

function write(next: State) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  listeners.forEach((l) => l());
}

function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  state = read();
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      state = read();
      listeners.forEach((l) => l());
    }
  });
}

function subscribe(l: () => void) {
  ensureHydrated();
  listeners.add(l);
  return () => listeners.delete(l);
}

const getSnapshot = () => {
  ensureHydrated();
  return state;
};
const getServerSnapshot = () => EMPTY;

export function useLineupState(): State {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export const lineup = {
  toggle(id: string) {
    ensureHydrated();
    const has = state.ids.includes(id);
    write({
      ...state,
      ids: has ? state.ids.filter((x) => x !== id) : [...state.ids, id],
    });
    return !has;
  },
  remove(id: string) {
    ensureHydrated();
    write({ ...state, ids: state.ids.filter((x) => x !== id) });
  },
  clear() {
    ensureHydrated();
    write({ ...state, ids: [] });
  },
  replace(ids: string[]) {
    ensureHydrated();
    write({ ...state, ids: [...new Set(ids)] });
  },
  setSquad(squad: Squad | null) {
    ensureHydrated();
    write({ ...state, squad });
  },
};

export function encodeLineup(ids: string[]): string {
  return ids.map((id) => id.slice(0, 8)).join(".");
}

export function decodeLineup(param: string | null, allIds: string[]): string[] {
  if (!param) return [];
  const prefixes = param.split(".").filter((p) => /^[0-9a-f]{8}$/i.test(p));
  const out: string[] = [];
  for (const p of prefixes) {
    const matches = allIds.filter((id) =>
      id.toLowerCase().startsWith(p.toLowerCase()),
    );
    if (matches.length === 1) out.push(matches[0]);
  }
  return [...new Set(out)];
}
