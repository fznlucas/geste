/**
 * The books at now (docs/admin-v2/02): every ledger line derived from the rows, the Stripe payouts
 * those lines make, and the URSSAF declarations of each period. Memoised until the rows or the minute
 * change. Finance, the dashboard's revenue, URSSAF, payouts and cash read only this (through metrics).
 */
import { BUSINESS, type UrssafCategory, type VatRegime } from "@/config/business";
import { addDays, parisDay, simNow, simToday } from "@/lib/clock";
import { allAffiliateCommissions, allCustomers, allGiftCards, allOrders, allPayments, allPrintCopies, allPrintEditions, allRefunds, allShipments, patched } from "@/lib/api/local";
import { allSupplyOrders } from "@/lib/api/supplies";
import { allAiJobs } from "@/lib/api/ai";
import { vatRateAt, vatRegime } from "@/lib/api/vat";
import { LAUNCH_DATE } from "@/sim/config";
import { parisInstant } from "@/sim/calendar";
import {
  ledgerFromAffiliate, ledgerFromAiJob, ledgerFromBreakage, ledgerFromCopy, ledgerFromGiftCardRefund, ledgerFromGiftCardUse, ledgerFromOrder, ledgerFromRefund, ledgerFromShipment,
  ledgerFromSubscriptions,
} from "./derive";
import { TURNOVER_ACCOUNTS, type LedgerLine } from "./types";

export * from "./types";
export { fxRate, toEur } from "./fx";
export { paymentFees, vatRateOf } from "./derive";

export { vatRegime } from "@/lib/api/vat";

export interface Payout {
  id: string;
  /** When Stripe sends it (Friday) and when it lands in the bank. */
  at: string;
  arrivalAt: string;
  amountEurCents: number;
  status: "scheduled" | "in_transit" | "paid";
  /** Source ids (orders, refunds) of the balance lines it carries. */
  sources: string[];
  /** First and last payment (or refund) it carries, by their own date. */
  fromAt: string | null;
  toAt: string | null;
}

export interface UrssafDeclaration {
  /** "2026-Q3" or "2026-09". */
  key: string;
  label: string;
  from: string;
  to: string;
  /** Last day of the month after the period. */
  dueDate: string;
  turnoverByCategory: Record<UrssafCategory, number>;
  contributionsByCategory: Record<UrssafCategory, { urssaf: number; cfp: number; vl: number }>;
  totalCents: number;
  status: "in_progress" | "to_declare" | "declared" | "paid" | "late";
  declaredAt: string | null;
  paidAt: string | null;
  /** Who marked it: Lucas in the admin, or the simulation for periods older than the hands-off window. */
  by: "you" | "simulated" | null;
}

const CATEGORIES: UrssafCategory[] = ["sales_goods", "services_bic", "services_bnc"];
const EMPTY = () => ({ sales_goods: 0, services_bic: 0, services_bnc: 0 }) as Record<UrssafCategory, number>;

/** Contributions due on a turnover by category (rates of the config; ACRE halves the social part). */
export function contributionsOf(turnover: Record<UrssafCategory, number>) {
  const u = BUSINESS.urssaf;
  const acre = u.acre.value ? 0.5 : 1;
  const out = {} as Record<UrssafCategory, { urssaf: number; cfp: number; vl: number }>;
  for (const c of CATEGORIES) {
    const base = Math.max(0, turnover[c]);
    out[c] = {
      urssaf: Math.round((base * u.ratesPct.value[c] * acre) / 100),
      cfp: Math.round((base * u.cfpPct.value[c]) / 100),
      vl: u.versementLiberatoire.value ? Math.round((base * u.vlPct.value[c]) / 100) : 0,
    };
  }
  return out;
}

/** Turnover by URSSAF category of ledger lines (revenue and refunds, cash basis). */
export function turnoverByCategory(lines: LedgerLine[]): Record<UrssafCategory, number> {
  const t = EMPTY();
  for (const l of lines) if (TURNOVER_ACCOUNTS.includes(l.account) && l.category !== "none") t[l.category] += l.amountEurCents;
  return t;
}

const lastDayOfMonthAfter = (to: string) => {
  const [y, m] = to.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m + 1, 0));
  return d.toISOString().slice(0, 10);
};

function periods(from: string, until: string, frequency: "monthly" | "quarterly" = BUSINESS.urssaf.frequency.value): Array<{ key: string; label: string; from: string; to: string }> {
  const out = [];
  const quarterly = frequency === "quarterly";
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let y = Number(from.slice(0, 4)), m = Number(from.slice(5, 7));
  if (quarterly) m = Math.floor((m - 1) / 3) * 3 + 1;
  for (;;) {
    const start = `${y}-${String(m).padStart(2, "0")}-01`;
    if (start > until) break;
    const span = quarterly ? 3 : 1;
    const endD = new Date(Date.UTC(y, m - 1 + span, 0));
    const end = endD.toISOString().slice(0, 10);
    out.push(quarterly ? { key: `${y}-Q${(m + 2) / 3}`, label: `Q${(m + 2) / 3} ${y}`, from: start, to: end } : { key: start.slice(0, 7), label: `${MONTHS[m - 1]} ${y}`, from: start, to: end });
    m += span;
    if (m > 12) {
      m -= 12;
      y += 1;
    }
  }
  return out;
}

/** A VAT return (CA3): the VAT collected in the period, net of refunds, due on the config's day of the month after. */
export interface VatReturn {
  key: string;
  label: string;
  from: string;
  to: string;
  dueDate: string;
  /** VAT collected minus VAT refunded in the period (EUR cents). */
  amountCents: number;
  status: UrssafDeclaration["status"];
  declaredAt: string | null;
  paidAt: string | null;
  by: "you" | "simulated" | null;
}

interface Books {
  lines: LedgerLine[];
  payouts: Payout[];
  declarations: UrssafDeclaration[];
  vatReturns: VatReturn[];
}

let memo: { orders: unknown; minute: number; regime: VatRegime; books: Books } | null = null;

/** Every line, payout and declaration at now. */
export function books(): Books {
  const now = simNow().getTime();
  const minute = Math.floor(now / 60_000);
  const orders = allOrders();
  const regime = vatRegime();
  if (memo && memo.orders === orders && memo.minute === minute && memo.regime === regime) return memo.books;

  const lines: LedgerLine[] = [];
  const countryOf = new Map(allCustomers().map((c) => [c.id, c.defaultAddress.country]));
  const country = (o: (typeof orders)[number]) => o.country ?? o.shippingAddress?.country ?? countryOf.get(o.userId) ?? "FR";
  const payments = new Map(allPayments().filter((p) => p.orderId && p.status === "succeeded").map((p) => [p.orderId!, p]));
  const byId = new Map(orders.map((o) => [o.id, o]));
  const cards = new Map(allGiftCards().map((g) => [g.id, g]));

  for (const o of orders) {
    if (o.status === "pending" || o.status === "cancelled") continue;
    if (Date.parse(o.paidAt) > now && o.origin !== "browser") continue;
    lines.push(...ledgerFromOrder(o, payments.get(o.id), country(o), regime, vatRateAt(country(o), o.paidAt, regime)));
  }
  // Gift card uses (−) and refunds paid back onto cards (+) in time order, each against the card's balance before it.
  const uses = orders
    .filter((o) => o.status !== "pending" && o.status !== "cancelled" && (Date.parse(o.paidAt) <= now || o.origin === "browser"))
    .flatMap((o) => (o.giftCardRedemptions ?? []).map((r) => ({ giftCardId: r.giftCardId, cents: -r.cents, ref: o.id, at: o.paidAt })));
  const backs = allRefunds()
    .filter((r) => Date.parse(r.createdAt) <= now)
    .flatMap((r) => (r.giftCards ?? []).map((g) => ({ giftCardId: g.giftCardId, cents: g.cents, ref: r.id, at: r.createdAt })));
  const events = [...uses, ...backs].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  const left = new Map<string, number>();
  for (const e of events) {
    const card = cards.get(e.giftCardId);
    if (!card) continue;
    const before = left.get(card.id) ?? card.initialCents;
    lines.push(...(e.cents < 0 ? ledgerFromGiftCardUse(card, e.ref, -e.cents, e.at, before) : ledgerFromGiftCardRefund(card, e.ref, e.cents, e.at, before)));
    left.set(card.id, before + e.cents);
  }
  for (const r of allRefunds()) {
    const o = byId.get(r.orderId);
    if (o && Date.parse(r.createdAt) <= now) lines.push(...ledgerFromRefund(r, o, country(o), regime, vatRateAt(country(o), o.paidAt, regime)));
  }
  for (const s of allShipments()) {
    const o = byId.get(s.orderId);
    if (o) lines.push(...ledgerFromShipment(s, country(o)));
  }
  // Supplies reordered: paid from the bank when ordered, a stock until used (the cost lines count their use).
  for (const o of allSupplyOrders()) {
    if (Date.parse(o.at) > now) continue;
    const base = { at: o.at, sourceTable: "supply_orders", sourceId: o.id, category: "none" as const };
    lines.push({ ...base, id: `supply:${o.id}:0`, account: "cash.bank", amountEurCents: -o.cents, memo: `Supplies · ${o.quantity} ${o.item.replace("_", " ")}` });
    lines.push({ ...base, id: `supply:${o.id}:1`, account: "asset.supplies", amountEurCents: o.cents, memo: `Supplies in stock · ${o.quantity} ${o.item.replace("_", " ")}` });
  }
  const sizeOf = new Map(allPrintEditions().map((e) => [e.id, e.size as "S" | "M" | "L"]));
  for (const c of allPrintCopies()) lines.push(...ledgerFromCopy(c, sizeOf.get(c.editionId) ?? "S"));
  for (const g of allGiftCards()) lines.push(...ledgerFromBreakage(g, now));
  for (const a of allAffiliateCommissions()) lines.push(...ledgerFromAffiliate(a, now));
  for (const j of allAiJobs()) if (Date.parse(j.createdAt) <= now) lines.push(...ledgerFromAiJob(j));
  lines.push(...ledgerFromSubscriptions(LAUNCH_DATE, now));

  const payouts = payoutsOf(lines, now);
  for (const p of payouts) {
    if (p.status === "scheduled") continue;
    const base = { sourceTable: "payouts", sourceId: p.id, category: "none" as const };
    lines.push({ ...base, id: `payouts:${p.id}:0`, at: p.at, account: "cash.stripe_balance", amountEurCents: -p.amountEurCents, availableAt: p.at, memo: "Payout to the bank" });
    if (p.status === "paid") lines.push({ ...base, id: `payouts:${p.id}:1`, at: p.arrivalAt, account: "cash.bank", amountEurCents: p.amountEurCents, memo: "Stripe payout" });
  }

  const declarations = declarationsOf(lines, now);
  for (const d of declarations) {
    if (!d.paidAt) continue;
    const base = { at: d.paidAt, sourceTable: "urssaf_declarations", sourceId: d.key, category: "none" as const };
    const sum = (k: "urssaf" | "cfp" | "vl") => CATEGORIES.reduce((s, c) => s + d.contributionsByCategory[c][k], 0);
    const parts: Array<[LedgerLine["account"], number, string]> = [["tax.urssaf", sum("urssaf"), "Social contributions"], ["tax.cfp", sum("cfp"), "CFP"], ["tax.versement_liberatoire", sum("vl"), "Versement libératoire"]];
    parts.forEach(([account, cents, memo], i) => cents && lines.push({ ...base, id: `urssaf:${d.key}:${i}`, account, amountEurCents: -cents, memo: `${memo} · ${d.label}` }));
    lines.push({ ...base, id: `urssaf:${d.key}:bank`, account: "cash.bank", amountEurCents: -d.totalCents, memo: `URSSAF · ${d.label}` });
  }

  const vatReturns = regime === "collect" ? vatReturnsOf(lines, now) : [];
  for (const v of vatReturns) {
    if (!v.paidAt || !v.amountCents) continue;
    const base = { at: v.paidAt, sourceTable: "vat_returns", sourceId: v.key, category: "none" as const };
    lines.push({ ...base, id: `vat:${v.key}:0`, account: "liability.vat", amountEurCents: -v.amountCents, memo: `VAT paid · ${v.label}` });
    lines.push({ ...base, id: `vat:${v.key}:bank`, account: "cash.bank", amountEurCents: -v.amountCents, memo: `VAT return · ${v.label}` });
  }

  lines.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : a.id < b.id ? -1 : 1));
  const result = { lines, payouts, declarations, vatReturns };
  memo = { orders, minute, regime, books: result };
  return result;
}

/** Weekly payouts (Friday): what became available since the last one, net of refunds; a negative balance waits. */
function payoutsOf(lines: LedgerLine[], now: number): Payout[] {
  const { weekday, arrivalDays } = BUSINESS.payouts.value;
  const balance = lines.filter((l) => l.account === "cash.stripe_balance").sort((a, b) => (a.availableAt! < b.availableAt! ? -1 : 1));
  const out: Payout[] = [];
  let friday = LAUNCH_DATE;
  while (((new Date(`${friday}T12:00:00Z`).getUTCDay() + 6) % 7) !== weekday) friday = addDays(friday, 1);
  let i = 0, carried = 0;
  let carriedFrom: string | null = null;
  const today = parisDay(now);
  for (; ; friday = addDays(friday, 7)) {
    const at = parisInstant(friday, 10);
    let amount = carried;
    const sources: string[] = [];
    let fromAt: string | null = carriedFrom, toAt: string | null = null;
    while (i < balance.length && balance[i]!.availableAt! <= at) {
      const l = balance[i]!;
      amount += l.amountEurCents;
      sources.push(l.sourceId);
      if (!fromAt || l.at < fromAt) fromAt = l.at;
      if (!toAt || l.at > toAt) toAt = l.at;
      i++;
    }
    const arrivalAt = parisInstant(addDays(friday, arrivalDays + 1), 9); // Friday → Monday
    const status: Payout["status"] = Date.parse(at) > now ? "scheduled" : Date.parse(arrivalAt) > now ? "in_transit" : "paid";
    if (amount > 0) {
      out.push({ id: `po_${friday.replaceAll("-", "")}`, at, arrivalAt, amountEurCents: amount, status, sources, fromAt, toAt });
      carried = 0;
      carriedFrom = null;
    } else {
      carried = amount;
      carriedFrom = fromAt;
    }
    if (friday > today) break;
  }
  return out.reverse();
}

/** VAT returns: the same life as URSSAF declarations ("Lucas · simulated" files and pays five days before the due date). */
function vatReturnsOf(lines: LedgerLine[], now: number): VatReturn[] {
  const today = simToday();
  const handsOff = 48 * 3_600_000;
  const { frequency, dueDay } = BUSINESS.vatReturns.value;
  const vat = lines.filter((l) => l.account === "liability.vat" && l.sourceTable !== "vat_returns");
  return periods(LAUNCH_DATE, today, frequency).map((p): VatReturn => {
    const amountCents = vat.filter((l) => {
      const d = parisDay(l.at);
      return d >= p.from && d <= p.to;
    }).reduce((s, l) => s + l.amountEurCents, 0);
    const monthAfter = addDays(p.to, 1).slice(0, 7);
    const dueDate = `${monthAfter}-${String(dueDay).padStart(2, "0")}`;
    const mine = patched("vat_returns", { id: p.key, declaredAt: null as string | null, paidAt: null as string | null });
    const planned = parisInstant(addDays(dueDate, -5), 10);
    const simulated = Date.parse(planned) <= now && Date.parse(`${p.to}T22:00:00Z`) <= now - handsOff && !mine.declaredAt && !mine.paidAt;
    const declaredAt = mine.declaredAt ?? (simulated ? planned : null);
    const paidAt = mine.paidAt ?? (simulated ? planned : null);
    const status: VatReturn["status"] = paidAt ? "paid" : declaredAt ? "declared" : p.to >= today ? "in_progress" : dueDate < today ? "late" : "to_declare";
    return { ...p, dueDate, amountCents, status, declaredAt, paidAt, by: mine.declaredAt || mine.paidAt ? "you" : simulated ? "simulated" : null };
  }).reverse();
}

/** URSSAF periods: in progress, to declare, declared, paid; "Lucas · simulated" pays the older ones. */
function declarationsOf(lines: LedgerLine[], now: number): UrssafDeclaration[] {
  const today = simToday();
  const handsOff = 48 * 3_600_000;
  return periods(LAUNCH_DATE, today).map((p): UrssafDeclaration => {
    const inPeriod = lines.filter((l) => {
      const d = parisDay(l.at);
      return d >= p.from && d <= p.to;
    });
    const turnover = turnoverByCategory(inPeriod);
    const contributions = contributionsOf(turnover);
    const totalCents = CATEGORIES.reduce((s, c) => s + contributions[c].urssaf + contributions[c].cfp + contributions[c].vl, 0);
    const dueDate = lastDayOfMonthAfter(p.to);
    const mine = patched("urssaf_declarations", { id: p.key, declaredAt: null as string | null, paidAt: null as string | null });
    // The simulation declares and pays five days before the due date, once the period is out of the window.
    const planned = parisInstant(addDays(dueDate, -5), 10);
    const simulated = Date.parse(planned) <= now && Date.parse(`${p.to}T22:00:00Z`) <= now - handsOff && !mine.declaredAt && !mine.paidAt;
    const declaredAt = mine.declaredAt ?? (simulated ? planned : null);
    const paidAt = mine.paidAt ?? (simulated ? planned : null);
    const status: UrssafDeclaration["status"] = paidAt ? "paid" : declaredAt ? "declared" : p.to >= today ? "in_progress" : dueDate < today ? "late" : "to_declare";
    return { ...p, dueDate, turnoverByCategory: turnover, contributionsByCategory: contributions, totalCents, status, declaredAt, paidAt, by: mine.declaredAt || mine.paidAt ? "you" : simulated ? "simulated" : null };
  }).reverse();
}
