"use client";

import { useSyncExternalStore } from "react";

/**
 * Mock phase: state that the backend will own later (cart, session, reader progress) lives in the
 * browser. One store per localStorage key, shared by every component through useSyncExternalStore
 * and kept in sync across tabs with the `storage` event.
 *
 * Storage can be missing or throw (private window, blocked site data): the store then works in
 * memory for the visit and nothing breaks.
 */

export const STORAGE_PREFIX = "geste.";

export interface PersistentStore<T> {
  get: () => T;
  set: (next: T | ((prev: T) => T)) => void;
  reset: () => void;
  subscribe: (listener: () => void) => () => void;
  /** What the server render and hydration see. */
  initial: T;
}

const stores: PersistentStore<unknown>[] = [];

/**
 * `key` gets the "geste." prefix and a version suffix: bump `version` when the shape changes and
 * old values are ignored. `parse` validates what is read back (anything invalid → `initial`).
 */
export function createPersistentStore<T>(key: string, version: number, initial: T, parse: (raw: unknown) => T | null): PersistentStore<T> {
  const storageKey = `${STORAGE_PREFIX}${key}.v${version}`;
  const listeners = new Set<() => void>();
  let value: T | undefined;

  function read(): T {
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw === null ? initial : (parse(JSON.parse(raw)) ?? initial);
    } catch {
      return initial;
    }
  }

  function write(next: T) {
    try {
      if (next === initial) window.localStorage.removeItem(storageKey);
      else window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Memory only for this visit.
    }
  }

  function emit() {
    for (const l of listeners) l();
  }

  function onStorage(e: StorageEvent) {
    if (e.key !== storageKey && e.key !== null) return; // null = localStorage.clear()
    value = read();
    emit();
  }

  const get = () => {
    if (typeof window === "undefined") return initial;
    if (value === undefined) value = read();
    return value;
  };

  const store: PersistentStore<T> = {
    get,
    set(next) {
      const resolved = typeof next === "function" ? (next as (prev: T) => T)(get()) : next;
      if (Object.is(resolved, value)) return;
      value = resolved;
      write(resolved);
      emit();
    },
    reset() {
      store.set(initial);
    },
    subscribe(listener) {
      if (listeners.size === 0 && typeof window !== "undefined") window.addEventListener("storage", onStorage);
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && typeof window !== "undefined") window.removeEventListener("storage", onStorage);
      };
    },
    initial,
  };
  stores.push(store as PersistentStore<unknown>);
  return store;
}

/** React hook. Returns `store.initial` during the server render and hydration, then the stored value. */
export function useStore<T>(store: PersistentStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, () => store.initial);
}

const noop = () => () => {};

/**
 * False during the server render and hydration, true after. Pages use it to tell "signed out"
 * from "not read yet" and to avoid flashing the empty cart before the stored one is read.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}

/** Empties every mock store (cart, session, progress), loaded or not: the "Reset demo" action. */
export function resetMockState() {
  for (const s of stores) s.reset();
  try {
    for (const k of Object.keys(window.localStorage)) if (k.startsWith(STORAGE_PREFIX)) window.localStorage.removeItem(k);
  } catch {
    // Nothing stored.
  }
}

/** New id for a client-created row. */
export function newId(prefix: string): string {
  const uuid = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${uuid}`;
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
