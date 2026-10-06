import { hashString } from "@/sim/random";
import type { StripeAdapter } from "./types";

/** Mock: ids in Stripe's shape; the books (src/lib/ledger) take the refund off the balance. */
export const stripeMock: StripeAdapter = {
  paymentIntentId: (seed) => `pi_3Px${hashString(seed).toString(36)}L9aQ`,
  refund: async ({ orderId }) => ({ id: `re_${hashString(`${orderId}|${Date.now()}`).toString(36)}` }),
};
