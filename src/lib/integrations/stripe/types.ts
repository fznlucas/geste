/** What the app needs from Stripe (not Stripe's API): payment ids, refunds. */
export interface StripeAdapter {
  /** The PaymentIntent id of a payment ("pi_…"). */
  paymentIntentId(seed: string): string;
  refund(input: { orderId: string; amountCents: number; reason: string }): Promise<{ id: string }>;
}
