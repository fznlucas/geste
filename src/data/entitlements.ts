/**
 * Library access: one entitlement per guide bought (what the Stripe webhook creates).
 * Progress follows the boards: Camille (Account board) is on layer 2 of N°03, has not started
 * N°01 and finished N°07 on 12 Sept.
 */
import { orders, refunds } from "./orders";
import type { EntitlementRow } from "./types";

type Override = Partial<Pick<EntitlementRow, "progress" | "openedAt" | "printsLeft">>;

const PROGRESS: Record<string, Override> = {
  "item-2041-1": { progress: { step: "2a" }, openedAt: "2026-10-01T14:30:00Z", printsLeft: 2 },
  "item-1987-1": { progress: { step: "2e", completedAt: "2026-09-12T18:00:00Z" }, openedAt: "2026-09-10T09:00:00Z" },
  "item-2040-1": { progress: { step: "2e", completedAt: "2026-10-01T18:40:00Z" }, openedAt: "2026-10-01T13:00:00Z", printsLeft: 2 },
  "item-2032-1": { progress: { step: "3e", completedAt: "2026-09-29T17:00:00Z" }, openedAt: "2026-09-27T16:00:00Z" },
  "item-2034-1": { progress: { step: "2c" }, openedAt: "2026-09-29T10:00:00Z" },
  "item-1994-1": { progress: { step: "2e", completedAt: "2026-09-13T20:00:00Z" }, openedAt: "2026-09-12T18:00:00Z", printsLeft: 1 },
  "item-2016-1": { progress: { step: "3b" }, openedAt: "2026-09-21T09:00:00Z" },
  "item-2003-1": { progress: { step: "2e", completedAt: "2026-09-17T16:00:00Z" }, openedAt: "2026-09-16T10:00:00Z" },
};

export const entitlements: EntitlementRow[] = orders.flatMap((order) =>
  order.items
    .filter((item) => item.kind === "guide" && item.guideId)
    .map((item) => {
      const revoked = refunds.find((r) => r.orderId === order.id && r.revokeAccess);
      return {
        id: `ent-${item.id.slice("item-".length)}`,
        userId: order.userId,
        guideId: item.guideId!,
        orderItemId: item.id,
        paletteKey: item.config.palette ?? "original",
        printsLeft: 3,
        progress: { step: "1a" },
        openedAt: null,
        revokedAt: revoked?.createdAt ?? null,
        createdAt: order.paidAt,
        ...PROGRESS[item.id],
      };
    }),
);
