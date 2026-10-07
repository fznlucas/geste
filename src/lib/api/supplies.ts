/**
 * Supplies counted at the studio (Fulfilment › Supplies, docs/admin-v2/04): tubes, paper S/M/L,
 * certificate cards. Stock = stock at launch + reorders received − what was used: paper and a
 * certificate for each copy printed (paper only when printed in-house: the lab uses its own), a tube for
 * each parcel labelled. A reorder (Fulfilment, `reorderSupply`) arrives after the supplier's delay.
 * Levels, prices and delays: `BUSINESS.supplies` (to confirm with the supplier).
 */
import { BUSINESS } from "@/config/business";
import { simNow } from "@/lib/clock";
import { clone } from "./clone";
import { allPrintCopies, allPrintEditions, allShipments, inserted } from "./local";

export type SupplyKey = keyof typeof BUSINESS.supplies.value.items;
export const SUPPLY_KEYS = Object.keys(BUSINESS.supplies.value.items) as SupplyKey[];

/** A reorder sent to the supplier (admin row). */
export interface SupplyOrderRow {
  id: string;
  item: SupplyKey;
  quantity: number;
  /** EUR cents, VAT excluded (what the supplier invoices). */
  cents: number;
  at: string;
  arrivesAt: string;
}

export interface SupplyItem {
  key: SupplyKey;
  label: string;
  /** Units at the studio now (never below 0). */
  inStock: number;
  /** More was used than counted (stock at launch to confirm): shown as "out". */
  out: boolean;
  /** Reordered, not arrived yet. */
  onOrder: number;
  arrivesAt: string | null;
  reorderAt: number;
  reorderQty: number;
  unitCents: number;
  leadDays: number;
  /** At or under the reorder level with nothing on its way. */
  low: boolean;
}

export const allSupplyOrders = (): SupplyOrderRow[] => inserted<SupplyOrderRow>("supply_orders");

/** Units used up to `now`, per item. */
function usedUpTo(now: number): Record<SupplyKey, number> {
  const used = Object.fromEntries(SUPPLY_KEYS.map((k) => [k, 0])) as Record<SupplyKey, number>;
  const sizeOf = new Map(allPrintEditions().map((e) => [e.id, e.size]));
  for (const c of allPrintCopies()) {
    // Copies sold before launch were printed before the stock was counted.
    if (!c.printedAt || c.soldBeforeLaunch || Date.parse(c.printedAt) > now) continue;
    used.certificates++;
    if (!c.sentToLabAt) used[`paper_${(sizeOf.get(c.editionId) ?? "S").toLowerCase()}` as SupplyKey]++;
  }
  for (const s of allShipments()) {
    const at = s.labelCreatedAt ?? s.shippedAt;
    if (at && Date.parse(at) <= now) used.tubes++;
  }
  return used;
}

/** The supplies line, at now. */
export async function getSupplies(): Promise<SupplyItem[]> {
  const now = simNow().getTime();
  const used = usedUpTo(now);
  const orders = allSupplyOrders();
  return clone(
    SUPPLY_KEYS.map((key) => {
      const c = BUSINESS.supplies.value.items[key];
      const mine = orders.filter((o) => o.item === key);
      const received = mine.filter((o) => Date.parse(o.arrivesAt) <= now).reduce((s, o) => s + o.quantity, 0);
      const coming = mine.filter((o) => Date.parse(o.arrivesAt) > now).sort((a, b) => a.arrivesAt.localeCompare(b.arrivesAt));
      const stock = c.opening + received - used[key];
      const onOrder = coming.reduce((s, o) => s + o.quantity, 0);
      return {
        key,
        label: c.label,
        inStock: Math.max(0, stock),
        out: stock <= 0,
        onOrder,
        arrivesAt: coming[0]?.arrivesAt ?? null,
        reorderAt: c.reorderAt,
        reorderQty: c.reorderQty,
        unitCents: c.unitCents,
        leadDays: c.leadDays,
        low: stock <= c.reorderAt && onOrder === 0,
      };
    }),
  );
}

/** The supplier of every item (one in the mock). */
export const supplier = () => BUSINESS.supplies.value.supplier;
