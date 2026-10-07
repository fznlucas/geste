/**
 * The invoice's VAT, per regime (docs/decisions.md "Invoices"): the franchise mention only under the
 * franchise; under the collecting regime, the VAT of each rate and no franchise mention.
 */
import { describe, expect, it } from "vitest";
import { FRANCHISE_MENTION, getOrder, invoiceLines, invoiceVat } from "@/lib/api";
import { includedVatCents } from "@/data/tax";
import { allOrders } from "@/lib/api/local";

/** A fixture order by its id (orders are numbered in payment order, so the number is computed). */
const fixture = async (id: string) => (await getOrder(allOrders().find((o) => o.id === id)!.number))!;

const text = (lines: Array<{ text: string }>) => lines.map((l) => l.text);

describe("invoice · franchise en base (art. 293 B)", () => {
  it("says “TVA non applicable, art. 293 B du CGI” and shows no VAT", async () => {
    const o = await fixture("order-2041");
    const lines = text(invoiceLines(o, "franchise"));
    expect(lines).toContain(FRANCHISE_MENTION);
    expect(lines.some((l) => /\bVAT\b/.test(l))).toBe(false);
    expect(lines).toContain(`Total · $${o.totalCents / 100}`);
    expect(invoiceVat(o, "franchise")).toMatchObject({ rows: [], totalVatCents: 0 });
  });
});

describe("invoice · collecting VAT", () => {
  it("France: the VAT at 20 % on the amount excl. VAT, no franchise mention", async () => {
    const o = await fixture("order-2041");
    const v = invoiceVat(o, "collect");
    expect(v.mention).toBeNull();
    expect(v.rows).toHaveLength(1);
    expect(v.rows[0]).toMatchObject({ ratePct: 20, label: "VAT 20%" });
    expect(v.rows[0]!.baseCents + v.rows[0]!.vatCents).toBe(o.totalCents);
    expect(v.totalVatCents).toBe(includedVatCents(o.totalCents, "FR", 0.2));
    expect(v.totalVatEurCents).toBeGreaterThan(0);
    const lines = text(invoiceLines(o, "collect"));
    expect(lines.some((l) => l.includes("293 B"))).toBe(false);
    expect(lines.some((l) => l.startsWith("VAT 20% · on $"))).toBe(true);
    expect(lines.some((l) => l.startsWith("Total excl. VAT · $"))).toBe(true);
    expect(lines.some((l) => l.startsWith("VAT in euros · €"))).toBe(true);
  });

  it("a gift card in the order carries no VAT: a row of its own at 0 %", async () => {
    // Paul Girard's order of Sep 26: two guides and a $100 gift card, to Belgium under the EU threshold (French VAT).
    const o = await fixture("order-2030");
    const v = invoiceVat(o, "collect");
    expect(v.rows.map((r) => r.ratePct)).toEqual([20, 0]);
    expect(v.rows[1]).toMatchObject({ baseCents: 10000, vatCents: 0 });
    expect(v.totalVatCents).toBe(includedVatCents(o.totalCents - 10000, "BE", 0.2));
    // The order's own VAT figure agrees with the invoice.
    expect(o.taxCents).toBe(v.totalVatCents);
  });

  it("an export outside the EU: 0 %, said as such", () => {
    const v = invoiceVat({ items: [], totalCents: 6700, vatRatePct: 0, country: "US", paidAt: "2026-09-27T10:05:00Z" }, "collect");
    expect(v.rows).toEqual([{ ratePct: 0, label: "VAT 0% · export outside the EU (US)", baseCents: 6700, vatCents: 0 }]);
    expect(v.mention).toBeNull();
  });
});
