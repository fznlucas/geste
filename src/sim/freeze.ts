/**
 * Lucas took over some simulated orders in the admin (overlay): their human steps stop at his first
 * action, so the simulation never ships, packs or refunds them again (docs/admin-v2/01 §5).
 */
import { copyAt, refundAt, shipmentAt, type MaterializedRows, type SimClock } from "./materialize";
import { plannedSimRows } from "./index";

export function frozenSimOrder(rows: MaterializedRows, touched: Map<string, number>): MaterializedRows {
  const planned = plannedSimRows();
  if (!planned) return rows;
  const clock = (orderId: string): SimClock => ({ now: rows.now, handsOffMs: rows.handsOffMs, humanUntil: touched.get(orderId) });
  const orderOfItem = new Map<string, string>();
  for (const o of rows.orders) for (const i of o.items) if (touched.has(o.id)) orderOfItem.set(i.id, o.id);

  const shipments = rows.shipments.filter((s) => !touched.has(s.orderId));
  const plannedShipment = new Map(planned.shipments.filter((s) => touched.has(s.orderId)).map((s) => [s.orderId, s]));
  for (const [orderId, s] of plannedShipment) {
    const row = shipmentAt(s, clock(orderId));
    if (row) shipments.push(row);
  }

  const copies = rows.copies.map((c) => {
    const orderId = c.orderItemId ? orderOfItem.get(c.orderItemId) : undefined;
    if (!orderId) return c;
    const p = planned.copies.find((x) => x.id === c.id);
    return p ? copyAt(p, plannedShipment.get(orderId), clock(orderId)) : c;
  });

  const refunds = rows.refunds.filter((r) => !touched.has(r.orderId));
  const orderStatus = new Map([...rows.orderStatus].filter(([id]) => !touched.has(id)));
  for (const r of planned.refunds) {
    if (!touched.has(r.orderId)) continue;
    const row = refundAt(r, clock(r.orderId));
    if (!row) continue;
    refunds.push(row);
    orderStatus.set(r.orderId, r.plan.orderStatus);
  }
  return { ...rows, shipments, copies, refunds, orderStatus };
}
