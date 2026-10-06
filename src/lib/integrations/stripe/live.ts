import { IntegrationNotConfigured } from "../errors";
import { API_BASE } from "../mode";
import type { StripeAdapter } from "./types";

/** Live: the backend creates PaymentIntents and refunds with STRIPE_SECRET_KEY (never in the browser). */
export const stripeLive: StripeAdapter = {
  paymentIntentId: () => {
    throw new IntegrationNotConfigured("stripe-payments", "PaymentIntents are created by the server");
  },
  refund: async (input) => {
    if (!API_BASE) throw new IntegrationNotConfigured("stripe-payments", "Needs a server · set NEXT_PUBLIC_API_BASE");
    const res = await fetch(`${API_BASE}/stripe/refunds`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
    if (!res.ok) throw new IntegrationNotConfigured("stripe-payments", `Stripe refused the refund (${res.status})`);
    return (await res.json()) as { id: string };
  },
};
