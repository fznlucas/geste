"use client";

import { useMemo } from "react";
import type { LibraryItem } from "@/lib/api/types";
import { createPersistentStore, isRecord, useStore } from "./store";

/**
 * Reader progress for the mock, kept in localStorage ("geste.progress.v1"), one entry per
 * entitlement. It overrides `entitlements.progress` / `opened_at` from the mock data, so Library and
 * reader agree ("progress matches the reader"). Later: IndexedDB first, synced with the server
 * actions `saveProgress(entitlementId, step)` and `markOpened(entitlementId)` (src/actions/reader.ts).
 */

export interface ProgressEntry {
  /** Last step shown, "2c". Reopening resumes here. */
  step: string;
  openedAt: string;
  completedAt: string | null;
  /**
   * Drying timer of a layer (reader timer view). Running: `until` is when it is dry. Paused:
   * `until` is null and `pausedLeft` holds the seconds left. Survives a reload or closing the app.
   */
  drying: Drying | null;
  updatedAt: string;
}

export interface Drying {
  layer: number;
  /** Full drying time of the layer (the bar's 100 %). */
  seconds: number;
  until: string | null;
  pausedLeft: number | null;
}

type ProgressState = Record<string, ProgressEntry>;

const STEP_ID = /^\d[a-j]$/;
const EMPTY: ProgressState = {};

function parseEntry(raw: unknown): ProgressEntry | null {
  if (!isRecord(raw) || typeof raw.step !== "string" || !STEP_ID.test(raw.step)) return null;
  if (typeof raw.openedAt !== "string" || typeof raw.updatedAt !== "string") return null;
  const d = raw.drying;
  const drying =
    isRecord(d) && typeof d.layer === "number" && typeof d.seconds === "number" && (typeof d.until === "string" || typeof d.pausedLeft === "number")
      ? { layer: d.layer, seconds: d.seconds, until: typeof d.until === "string" ? d.until : null, pausedLeft: typeof d.pausedLeft === "number" ? d.pausedLeft : null }
      : null;
  return { step: raw.step, openedAt: raw.openedAt, completedAt: typeof raw.completedAt === "string" ? raw.completedAt : null, drying, updatedAt: raw.updatedAt };
}

export const progressStore = createPersistentStore<ProgressState>("progress", 1, EMPTY, (raw) => {
  if (!isRecord(raw)) return null;
  const out: ProgressState = {};
  for (const [id, entry] of Object.entries(raw)) {
    const parsed = parseEntry(entry);
    if (parsed) out[id] = parsed;
  }
  return out;
});

function update(entitlementId: string, base: Pick<LibraryItem, "step" | "openedAt" | "completedAt"> | undefined, patch: (e: ProgressEntry) => Partial<ProgressEntry>) {
  const now = new Date().toISOString();
  progressStore.set((all) => {
    const current: ProgressEntry = all[entitlementId] ?? {
      step: base?.step ?? "1a",
      openedAt: base?.openedAt ?? now,
      completedAt: base?.completedAt ?? null,
      drying: null,
      updatedAt: now,
    };
    return { ...all, [entitlementId]: { ...current, ...patch(current), updatedAt: now } };
  });
}

/**
 * First open of a guide (`guide_opened`). Pass the library item so an entitlement already opened in
 * the mock data keeps its step and date. No-op when already opened.
 */
export function markOpened(entitlementId: string, item?: Pick<LibraryItem, "step" | "openedAt" | "completedAt">) {
  if (progressStore.get()[entitlementId]) return;
  update(entitlementId, item, () => ({}));
}

/** Every step change in the reader (`guide_step_viewed`). */
export function saveProgress(entitlementId: string, step: string) {
  if (!STEP_ID.test(step)) return;
  update(entitlementId, undefined, () => ({ step }));
}

/** "Finish" on the last step (`guide_completed`). The date is kept if already finished. */
export function completeGuide(entitlementId: string, lastStep: string) {
  update(entitlementId, undefined, (e) => ({ step: lastStep, completedAt: e.completedAt ?? new Date().toISOString(), drying: null }));
}

/** Drying timer of a layer: "Start drying timer" runs it at once; opening the timer page directly sets it paused. */
export function startDrying(entitlementId: string, layer: number, seconds: number, opts: { paused?: boolean } = {}) {
  const drying: Drying = opts.paused
    ? { layer, seconds, until: null, pausedLeft: seconds }
    : { layer, seconds, until: new Date(Date.now() + seconds * 1000).toISOString(), pausedLeft: null };
  update(entitlementId, undefined, () => ({ drying }));
}

/** Seconds left on a drying timer, at `now`. */
export function dryingLeft(d: Drying, now = Date.now()): number {
  if (d.until === null) return d.pausedLeft ?? 0;
  return Math.max(0, Math.ceil((Date.parse(d.until) - now) / 1000));
}

/** "Pause" / "Start timer" on the drying view. */
export function toggleDrying(entitlementId: string) {
  update(entitlementId, undefined, (e) => {
    if (!e.drying) return {};
    const d = e.drying;
    return d.until === null
      ? { drying: { ...d, until: new Date(Date.now() + (d.pausedLeft ?? 0) * 1000).toISOString(), pausedLeft: null } }
      : { drying: { ...d, until: null, pausedLeft: dryingLeft(d) } };
  });
}

/** At zero, or "Skip, it's dry". */
export function stopDrying(entitlementId: string) {
  update(entitlementId, undefined, () => ({ drying: null }));
}

/** Start again from 1a (keeps the finished date: the Library still shows "Finished"). */
export function restartGuide(entitlementId: string) {
  update(entitlementId, undefined, () => ({ step: "1a", drying: null }));
}

/** A library item with the local progress applied (state, step, layer, dates). */
export function applyProgress(item: LibraryItem, entry: ProgressEntry | undefined): LibraryItem {
  if (!entry) return item;
  const completedAt = entry.completedAt ?? item.completedAt;
  return {
    ...item,
    step: entry.step,
    currentLayer: Math.min(item.layerCount, Number.parseInt(entry.step, 10) || 1),
    openedAt: item.openedAt ?? entry.openedAt,
    completedAt,
    state: completedAt ? "finished" : "in_progress",
  };
}

export function useProgressEntry(entitlementId: string): ProgressEntry | undefined {
  return useStore(progressStore)[entitlementId];
}

/** Account › Library: the items from `getLibrary` with the reader's progress. */
export function useLibraryProgress(items: LibraryItem[]): LibraryItem[] {
  const all = useStore(progressStore);
  return useMemo(() => items.map((i) => applyProgress(i, all[i.entitlementId])), [items, all]);
}
