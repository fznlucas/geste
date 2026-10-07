"use client";

/**
 * The admin's money display (top bar, docs/admin-v2/02 intro): EUR excluding VAT by default, or USD as
 * charged. Only store-side figures follow it (orders and customers, lists and detail); Finance and
 * URSSAF stay in EUR. A per-viewer choice, kept in this browser.
 */
import { createPersistentStore, useStore } from "./store";

export type AdminCurrency = "eur" | "usd";

export const adminCurrencyStore = createPersistentStore<AdminCurrency>("admin.currency", 1, "eur", (raw) => (raw === "eur" || raw === "usd" ? raw : null));

export function useAdminCurrency(): [AdminCurrency, (c: AdminCurrency) => void] {
  return [useStore(adminCurrencyStore), adminCurrencyStore.set];
}
