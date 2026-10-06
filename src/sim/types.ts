/**
 * What the generator produces: rows of `src/data/types.ts` that carry their whole planned future
 * (docs/admin-v2/PLAN.md D5). `materialize(rows, now)` cuts them at "now", hides what is still
 * waiting for Lucas (hands-off window) and drops the plans, so pages only ever see plain rows.
 */
import type { CampaignRow, GiftCardRow } from "@/data/marketing";
import type {
  AffiliateClickDayRow, AffiliateCommissionRow, AiCandidateRow, AiJobRow, EntitlementRow, GiftCardRedemptionRow, OrderRow, PaymentRow,
  PrintCopyRow, ProfileRow, RefundRow, ReviewRow, ShipmentRow, SocialPostRow, SubscriberRow, SupportMessageRow, SupportThreadRow, TrafficDayRow,
} from "@/data/types";

/** A print copy and the human steps of its fulfilment (printed & signed, packed). */
export interface PlannedCopy extends PrintCopyRow {
  plan: { orderId: string; printedAt: string; packedAt: string } | null;
}

/** A shipment: the label and the pickup are human steps, the carrier scans follow on their own. */
export interface PlannedShipment extends ShipmentRow {
  plan: { paidAt: string; labelCreatedAt: string; shippedAt: string; inTransitAt: string; outForDeliveryAt: string; deliveredAt: string };
}

/** A guide in a library and how its buyer paints it (customer events, no hands-off). */
export interface PlannedEntitlement extends EntitlementRow {
  plan: { openedAt: string | null; steps: Array<[at: string, step: string]>; completedAt: string | null; printsAt: string[] };
}

/** An order whose refund Lucas makes after the customer asked (support thread). */
export interface PlannedRefund extends RefundRow {
  plan: { requestedAt: string; orderStatus: "refunded" | "partially_refunded"; restockCopyIds: string[] };
}

/** A thread: customer messages appear at their time, staff replies and "done" are Lucas's. */
export interface PlannedThread extends SupportThreadRow {
  plan: { doneAt: string | null; readAt: string | null };
}

export interface PlannedMessage extends SupportMessageRow {
  /** Staff messages wait for Lucas; customer messages after a staff reply wait for that reply. */
  plan: { human: boolean; after: string | null };
}

/** A review is written by the customer; the moderation is Lucas's. */
export interface PlannedReview extends ReviewRow {
  plan: { status: ReviewRow["status"]; decidedAt: string };
}

/** A job runs on its own; its candidates' verdicts are Lucas's. */
export interface PlannedJob extends AiJobRow {
  plan: { finishesAt: string };
}

export interface PlannedCandidate extends AiCandidateRow {
  plan: { status: AiCandidateRow["status"]; decidedAt: string };
}

/** Everything generated, planned, oldest first. */
export interface SimRows {
  customers: ProfileRow[];
  orders: OrderRow[];
  payments: PaymentRow[];
  copies: PlannedCopy[];
  shipments: PlannedShipment[];
  entitlements: PlannedEntitlement[];
  refunds: PlannedRefund[];
  giftCards: GiftCardRow[];
  redemptions: GiftCardRedemptionRow[];
  threads: PlannedThread[];
  messages: PlannedMessage[];
  reviews: PlannedReview[];
  traffic: TrafficDayRow[];
  subscribers: SubscriberRow[];
  affiliateClicks: AffiliateClickDayRow[];
  affiliateCommissions: AffiliateCommissionRow[];
  socialPosts: SocialPostRow[];
  campaigns: CampaignRow[];
  aiJobs: PlannedJob[];
  aiCandidates: PlannedCandidate[];
}

export const emptyRows = (): SimRows => ({
  customers: [], orders: [], payments: [], copies: [], shipments: [], entitlements: [], refunds: [], giftCards: [], redemptions: [],
  threads: [], messages: [], reviews: [], traffic: [], subscribers: [], affiliateClicks: [], affiliateCommissions: [], socialPosts: [],
  campaigns: [], aiJobs: [], aiCandidates: [],
});
