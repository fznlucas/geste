/**
 * Orders and refunds (docs/admin-v2/05 "Badges, tabs and alerts", "Refunds", "Orders and customers"),
 * at the e2e clock and today.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const CLOCKS = ["2026-10-02T12:00:00Z", new Date().toISOString()];

async function at(iso: string) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SIM_NOW", iso);
  return {
    api: await import("@/lib/api"),
    metrics: await import("@/lib/metrics"),
    local: await import("@/lib/api/local"),
    totals: await import("@/lib/api/customer-totals"),
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe.each(CLOCKS)("orders at %s", (iso) => {
  it("Orders badge = To ship tab = phone list = to-do", async () => {
    const { api, metrics } = await at(iso);
    const counts = await metrics.todoCounts();
    const tab = await api.getOrders({ tab: "to_ship" });
    expect(counts.orders).toBe(tab.length);
    expect(tab.every((o) => metrics.orderTab(o) === "to_ship")).toBe(true);
    const items = await metrics.todoItems();
    const ship = items.find((i) => i.key === "ship");
    if (counts.fulfilment) expect(ship?.text).toMatch(new RegExp(`^${counts.fulfilment} prints? to pack and ship$`));
    else expect(ship).toBeUndefined();
  });

  it("alerts: never at 0, ids unique and built from their cause", async () => {
    const { metrics } = await at(iso);
    const list = await metrics.alerts();
    expect(new Set(list.map((a) => a.id)).size).toBe(list.length);
    for (const a of list) {
      expect(a.text, a.id).not.toMatch(/^0 /);
      expect(a.id, a.text).toMatch(/^[a-z-]+:/);
      expect(a.id).not.toMatch(/^alert-/);
    }
  });

  it("refunds: paid orders only, never more than is left, shipping only while nothing shipped", async () => {
    const { api, local } = await at(iso);
    const orders = local.allOrders().slice(-400);
    for (const row of orders) {
      const options = await api.getRefundOptions(row.number);
      if (!api.REFUNDABLE_STATUSES.includes(row.status)) {
        expect(options, row.number).toEqual([]);
        continue;
      }
      const left = row.totalCents - local.refundsOfOrder(row.id).reduce((s, r) => s + r.amountCents, 0);
      for (const o of options) expect(o.amountCents, row.number).toBeLessThanOrEqual(left);
      const print = options.find((o) => o.key === "print");
      const shipped = !!local.shipmentOfOrder(row.id)?.shippedAt;
      if (print && shipped) {
        const prints = row.items.filter((i) => i.kind === "print").reduce((s, i) => s + i.unitPriceCents * i.quantity - (i.discountCents ?? 0), 0);
        expect(print.amountCents, row.number).toBeLessThanOrEqual(prints);
      }
    }
  });

  it("refunds: taking back an opened guide is the owner's decision", async () => {
    const { api, local } = await at(iso);
    const opened = local.allOrders().find((o) =>
      api.REFUNDABLE_STATUSES.includes(o.status) && o.items.some((i) => i.kind === "guide" && local.entitlementOfItem(i.id)?.openedAt && !local.entitlementOfItem(i.id)?.revokedAt),
    )!;
    expect(opened).toBeDefined();
    const options = await api.getRefundOptions(opened.number);
    expect(options.find((o) => o.key === "full")?.ownerOnly).toMatch(/only the owner/);
    expect(options.find((o) => o.key === "print")?.ownerOnly ?? null).toBeNull();
  });

  it("customer totals: the same in the list, the header and the order detail, net of refunds", async () => {
    const { api, local, totals } = await at(iso);
    const customers = await api.getCustomers();
    for (const c of customers.slice(0, 200)) {
      const t = totals.customerTotals(c.id);
      expect(c.ordersCount, c.id).toBe(t.ordersCount);
      expect(c.spentCents, c.id).toBe(t.spentCents);
      const paid = local.ordersOfCustomer(c.id).filter((o) => o.status !== "pending" && o.status !== "cancelled");
      const net = paid.reduce((s, o) => s + o.totalCents - local.refundsOfOrder(o.id).reduce((x, r) => x + r.amountCents, 0), 0);
      expect(c.spentCents, c.id).toBe(net);
    }
    const last = [...local.allOrders()].reverse().find((o) => o.status === "paid")!;
    const detail = (await api.getOrder(last.number))!;
    const all = totals.customerTotals(last.userId);
    expect(detail.customerOrdersCount).toBeLessThanOrEqual(all.ordersCount);
    expect(detail.customerLifetimeCents).toBeLessThanOrEqual(all.spentCents);
  });
});

describe("refund onto a gift card", () => {
  it("the card owes it again, the Stripe balance pays only the rest", async () => {
    vi.resetModules();
    const { ledgerFromRefund, ledgerFromGiftCardRefund, ledgerFromGiftCardUse } = await import("@/lib/ledger/derive");
    const { toEur, fxRate } = await import("@/lib/ledger/fx");
    const card = { id: "gc-t", code: "GESTE-TEST", initialCents: 5000, balanceCents: 5000, createdAt: "2026-09-01T10:00:00Z", purchaseOrderId: null, recipientEmail: null, recipientName: null, message: null, sendAt: null, sentAt: null } as never;
    const order = {
      id: "o-t", number: "GS-9", userId: "u", status: "paid", totalCents: 4400, subtotalCents: 4400, discountCents: 0, shippingCents: 0, shippingMethod: null,
      items: [{ id: "i", kind: "guide", workId: "w", guideId: "g", editionId: null, config: {}, title: "N°03", detail: "", unitPriceCents: 4400, quantity: 1, fulfilment: "not_required" }],
      paidAt: "2026-09-10T10:00:00Z", createdAt: "2026-09-10T10:00:00Z", giftCardRedemptions: [{ giftCardId: "gc-t", cents: 2200 }],
    } as never;
    const refund = { id: "r-t", orderId: "o-t", amountCents: 4400, reason: "Other", restock: false, revokeAccess: true, createdAt: "2026-09-12T10:00:00Z", giftCards: [{ giftCardId: "gc-t", cents: 2200 }] };
    const lines = ledgerFromRefund(refund, order, "FR", "collect", 0.2);
    const cash = lines.filter((l) => l.account === "cash.stripe_balance");
    expect(cash).toHaveLength(1);
    expect(cash[0]!.amountUsdCents).toBe(2200);
    const used = ledgerFromGiftCardUse(card, "o-t", 2200, "2026-09-10T10:00:00Z", 5000)[0]!;
    const back = ledgerFromGiftCardRefund(card, "r-t", 2200, "2026-09-12T10:00:00Z", 2800)[0]!;
    expect(back.amountEurCents).toBe(-used.amountEurCents);
    expect(back.amountEurCents).toBe(toEur(5000, fxRate("2026-09-01")) - toEur(2800, fxRate("2026-09-01")));
  });
});
