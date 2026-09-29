"use client";

import { DEMO_CUSTOMER_ID, MOCK_NOW, buildOrder, findCustomerByEmail, setLocalRowsSource, type LocalRows, type PlaceOrderInput } from "@/lib/api";
import { clearCart } from "./cart";
import { signIn } from "./session";
import { createPersistentStore, isRecord, useStore } from "./store";

/**
 * Mock purchases, kept in localStorage ("geste.purchases.v1"): what the Stripe webhook will write
 * (order, numbered print copies, one entitlement per guide). `@/lib/api` merges these rows into
 * getOrders / getOrder / getLibrary / getEntitlement and into the stock of the cart.
 * Also keeps what the confirmation page shows that the order row does not hold (first name,
 * receipt email). Dropped when the webhook writes the database (docs/mock-plan.md §5).
 */

export interface PurchaseReceipt {
  number: string;
  firstName: string;
  /** "A receipt is on its way to {email}" (the email typed at checkout). */
  email: string;
}

interface PurchasesState extends LocalRows {
  receipts: PurchaseReceipt[];
}

const EMPTY: PurchasesState = { orders: [], entitlements: [], copies: [], receipts: [] };

const records = (v: unknown) => (Array.isArray(v) ? v.filter((r) => isRecord(r) && typeof r.id === "string") : null);

export const purchasesStore = createPersistentStore<PurchasesState>("purchases", 1, EMPTY, (raw) => {
  if (!isRecord(raw)) return null;
  const orders = records(raw.orders), entitlements = records(raw.entitlements), copies = records(raw.copies);
  const receipts = Array.isArray(raw.receipts) ? raw.receipts.filter((r) => isRecord(r) && typeof r.number === "string" && typeof r.email === "string") : null;
  if (!orders || !entitlements || !copies || !receipts) return null;
  return { orders, entitlements, copies, receipts } as unknown as PurchasesState;
});

setLocalRowsSource(() => purchasesStore.get());

export interface PlaceOrderRequest extends Omit<PlaceOrderInput, "customerId" | "now"> {
  firstName: string;
}

/**
 * After a successful (mock) payment: records the order, signs the buyer in with the checkout email
 * (a mock customer's email signs in as them, any other as Camille) and empties the cart.
 * Resolves with the order number for /checkout/success?order=.
 */
export async function placeOrder(req: PlaceOrderRequest): Promise<string> {
  const { firstName, ...input } = req;
  // The account the webhook finds or creates from the email (same rule as the fake sign-in).
  const customerId = (await findCustomerByEmail(input.email))?.id ?? DEMO_CUSTOMER_ID;
  const rows = buildOrder({ ...input, customerId, now: orderTime() }); // throws before anything is kept
  await signIn({ method: "email_code", email: input.email });
  purchasesStore.set((s) => ({
    orders: [...rows.orders, ...s.orders],
    entitlements: [...rows.entitlements, ...s.entitlements],
    copies: [...rows.copies, ...s.copies],
    receipts: [{ number: rows.number, firstName, email: input.email }, ...s.receipts],
  }));
  clearCart();
  return rows.number;
}

/**
 * Payment time of a mock order: never before the mock's "now" (its orders are dated up to
 * Oct 2, 2026) and after the previous local order, so a new purchase always tops Orders and Library.
 */
function orderTime(): string {
  const last = purchasesStore.get().orders.reduce((m, o) => Math.max(m, Date.parse(o.createdAt)), 0);
  return new Date(Math.max(Date.now(), Date.parse(MOCK_NOW), last + 60_000)).toISOString();
}

/** Re-renders when a purchase is recorded (e.g. in another tab). */
export function usePurchases(): PurchasesState {
  return useStore(purchasesStore);
}
