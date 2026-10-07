/** Codes at checkout (Lucas, Oct 7): promo rules from Marketing, gift cards as a means of payment. */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StoredCartLine } from "@/lib/api/types";

const N03 = "00000000-0000-0000-0000-000000000003";
const guide: StoredCartLine = { kind: "guide", id: "g", addedAt: "", workId: N03, format: "50x60", level: "match", palette: "original" };
const print: StoredCartLine = { kind: "print", id: "p", addedAt: "", editionId: "ed-07-s", quantity: 1 };
const gift: StoredCartLine = { kind: "gift_card", id: "c", addedAt: "", amountCents: 5000 };

async function at(iso: string) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SIM_NOW", iso);
  return { cart: await import("@/lib/api/cart"), marketing: await import("@/lib/api/marketing"), local: await import("@/lib/api/local") };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("promo codes", () => {
  it("FIRSTCANVAS: −15 % on the guides of a first order, never on a gift card", async () => {
    const { cart } = await at("2026-10-02T12:00:00Z");
    const base = cart.priceCart([guide, gift], { email: "new.buyer@mail.com" });
    const c = cart.priceCart([guide, gift], { promoCode: "firstcanvas", email: "new.buyer@mail.com" });
    const g = c.lines.find((l) => l.kind === "guide")!;
    expect(c.totals.promo?.cents).toBe(Math.round((g.unitPriceCents * 15) / 100));
    expect(c.lines.find((l) => l.kind === "gift_card")!.promoCents ?? 0).toBe(0);
    expect(c.totals.totalCents).toBe(base.totals.totalCents - c.totals.promo!.cents);
  });

  it("refusals say why", async () => {
    const { cart, local } = await at("2026-10-02T12:00:00Z");
    const buyer = local.allOrders().find((o) => o.status === "paid")!;
    const reason = (lines: StoredCartLine[], code: string, email = "x@mail.com") => cart.priceCart(lines, { promoCode: code, email }).codeErrors?.promo;
    expect(reason([guide], "NOPE")).toBe("This code does not exist.");
    expect(reason([guide], "NOEL2026")).toBe("This code starts on Dec 1.");
    expect(reason([gift], "TIKTOK10")).toBe("Codes do not apply to gift cards.");
    expect(reason([print], "FIRSTCANVAS")).toBe("This code applies to guides: there is none in your cart.");
    expect(reason([guide], "FIRSTCANVAS", buyer.email)).toBe("This code is for a first order only.");
  });

  it("NOEL2026: −20 % on guides and prints from Dec 1 to Dec 24 (Paris), then expired", async () => {
    let m = await at("2026-12-10T12:00:00Z");
    const c = m.cart.priceCart([guide, print, gift], { promoCode: "NOEL2026" });
    const due = c.lines.filter((l) => l.kind !== "gift_card").reduce((s, l) => s + Math.round(((l.unitPriceCents * l.quantity - (l.discountCents ?? 0)) * 20) / 100), 0);
    expect(c.totals.promo?.cents).toBe(due);
    m = await at("2026-12-26T12:00:00Z");
    expect(m.cart.priceCart([guide], { promoCode: "NOEL2026" }).codeErrors?.promo).toBe("This code expired on Dec 24.");
  });

  it("uses are counted from the orders that carry the code", async () => {
    const { marketing } = await at("2026-10-02T12:00:00Z");
    const codes = await marketing.getPromoCodes();
    expect(codes.find((c) => c.code === "FIRSTCANVAS")!.uses).toBe(marketing.promoUses("FIRSTCANVAS"));
    expect(marketing.promoUses("FIRSTCANVAS")).toBeGreaterThan(0);
    expect(marketing.promoUses("TIKTOK10")).toBeGreaterThan(0);
    expect(marketing.promoUses("NOEL2026")).toBe(0);
  });
});

describe("gift cards at checkout", () => {
  it("pays part of the total; what is left stays on the card", async () => {
    const { cart, local } = await at("2026-10-02T12:00:00Z");
    const card = local.giftCardByCode("GESTE-8JQ1-02BC")!;
    const c = cart.priceCart([guide], { giftCardCode: "geste-8jq1-02bc" });
    expect(c.totals.giftCard?.cents).toBe(Math.min(card.balanceCents, c.totals.totalCents));
    expect(c.totals.dueCents).toBe(c.totals.totalCents - c.totals.giftCard!.cents);
    expect(c.totals.giftCard!.balanceAfterCents).toBe(card.balanceCents - c.totals.giftCard!.cents);
    expect(c.giftCardId).toBe(card.id);
  });

  it("never pays for another gift card, and says why", async () => {
    const { cart } = await at("2026-10-02T12:00:00Z");
    expect(cart.priceCart([gift], { giftCardCode: "GESTE-4F2K-91AA" }).codeErrors?.giftCard).toBe("A gift card cannot pay for another gift card.");
    expect(cart.priceCart([guide], { giftCardCode: "GESTE-0000-0000" }).codeErrors?.giftCard).toBe("This gift card code does not exist.");
  });
});
