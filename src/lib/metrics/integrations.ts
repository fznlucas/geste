/**
 * What Settings › Integrations, Payments & tax and Simulation show (pages read figures here, never
 * `@/lib/integrations` or `@/sim` directly): integration statuses, logs, Outbox, the simulation's state and
 * assumptions, the business rules to confirm.
 */
import { BUSINESS } from "@/config/business";
import { allOrders } from "@/lib/api/local";
import { vatRegime } from "@/lib/api/vat";
import { parisDay, parisHour, simNow } from "@/lib/clock";
import * as SIM from "@/sim/config";
import { simSettings } from "@/sim";

// The read-only modules, not the index: the index carries the adapters, which write through the client.
export { INTEGRATIONS, INTEGRATION_ROWS, PAYMENT_ROWS, type Integration } from "@/lib/integrations/registry";
export { modeCounts, statusOf } from "@/lib/integrations/mode";
export { integrationLogs, outbox, type IntegrationLog, type OutboxEmail } from "@/lib/integrations/log";

export const vatRegimeNow = () => vatRegime();

/** "generated up to Oct 6, 21:16", the seed, the window. */
export function simulationStatus() {
  const now = simNow();
  const s = simSettings();
  const d = parisDay(now);
  const minutes = String(now.getUTCMinutes()).padStart(2, "0");
  return {
    seed: s.seed,
    handsOffHours: s.handsOffHours,
    generatedUpTo: `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8, 10))}, ${String(parisHour(now)).padStart(2, "0")}:${minutes}`,
    time: `${String(parisHour(now)).padStart(2, "0")}:${minutes}`,
    orders: allOrders().filter((o) => o.origin === "sim").length,
  };
}

const pct = (n: number) => `${Math.round(n * 1000) / 10} %`;

/** The main assumptions of src/sim/config.ts, read-only, with where they come from. */
export function simulationAssumptions(): Array<{ label: string; value: string; source: string }> {
  return [
    { label: "Launch", value: SIM.LAUNCH_DATE, source: "spec" },
    { label: "Anchors (orders · visits)", value: Object.entries(SIM.ANCHORS).map(([m, a]) => `${m}: ${a.orders} · ${a.visits}`).join("; "), source: "board" },
    { label: "Growth after the anchors", value: `+${SIM.GROWTH.firstPct} % in Oct 2026, −${-SIM.GROWTH.stepPct} pt a month, floor +${SIM.GROWTH.floorPct} %`, source: "spec" },
    { label: "Conversion outside the anchors", value: pct(SIM.CONVERSION), source: "board" },
    { label: "Sources", value: Object.entries(SIM.SOURCE_WEIGHTS).filter(([, w]) => w).map(([k, w]) => `${k} ${w}`).join(", "), source: "board" },
    { label: "Countries", value: Object.entries(SIM.COUNTRY_WEIGHTS).map(([k, w]) => `${k} ${w}`).join(", "), source: "spec" },
    { label: "Repeat buyers", value: `${pct(SIM.REPEAT.rate)} within ${SIM.REPEAT.maxDays} days`, source: "board" },
    { label: "Baskets", value: Object.entries(SIM.BASKET_WEIGHTS).map(([k, w]) => `${k} ${pct(w)}`).join(", "), source: "tuned on September" },
    { label: "Gift cards used", value: `${pct(SIM.GIFT_CARD_USE.firstRate)} within ${SIM.GIFT_CARD_USE.firstMaxDays} days, then ${pct(SIM.GIFT_CARD_USE.againRate)} come back`, source: "Lucas" },
    { label: "Payments", value: Object.entries(SIM.PAYMENT_METHOD_WEIGHTS).map(([k, w]) => `${k} ${w} %`).join(", "), source: "spec" },
    { label: "Declined attempts", value: pct(SIM.DECLINE_RATE), source: "spec" },
    { label: "Support threads", value: `${pct(SIM.SUPPORT.perOrder)} of orders + ${pct(SIM.SUPPORT.preSalePerOrder)} questions`, source: "spec" },
    { label: "Reviews", value: `${pct(SIM.REVIEWS.rate)} of finishers`, source: "spec" },
    { label: "Refunds", value: `${pct(SIM.REFUNDS.rate)} of orders`, source: "spec" },
    { label: "AI jobs", value: `${SIM.AI.jobsPerWeek} a week`, source: "spec" },
    { label: "Hands-off window", value: `${simSettings().handsOffHours} h`, source: "spec · editable" },
  ];
}

/** The rules of src/config/business.ts shown in Settings › Payments & tax, each "to confirm". */
export function businessAssumptions(): Array<{ label: string; value: string; source: string }> {
  const B = BUSINESS;
  const eur = (c: number) => `€${(c / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  const fee = (f: { pct: number; fixedCents: number }) => `${f.pct} % + ${eur(f.fixedCents)}`;
  return [
    { label: "VAT regime", value: vatRegime() === "collect" ? "VAT collected" : "Franchise en base", source: B.vatRegime.source },
    { label: "VAT returns (CA3)", value: `${B.vatReturns.value.frequency}, due the ${B.vatReturns.value.dueDay}th`, source: B.vatReturns.source },
    { label: "Stripe EEA card", value: fee(B.fees.stripeEea.value), source: B.fees.stripeEea.source },
    { label: "Stripe premium / UK / international", value: `${fee(B.fees.stripeEeaPremium.value)} · ${fee(B.fees.stripeUk.value)} · ${fee(B.fees.stripeIntl.value)}`, source: "Stripe pricing FR" },
    { label: "PayPal", value: fee(B.fees.paypal.value), source: B.fees.paypal.source },
    { label: "Currency conversion · Stripe Tax", value: `${B.fees.currencyConversionPct.value} % · ${B.fees.stripeTaxPct.value} %`, source: "Stripe pricing FR" },
    { label: "USD → EUR", value: `${B.fx.value.eurPerUsd} ± ${B.fx.value.dailyDriftPct} % a day`, source: B.fx.source },
    { label: "URSSAF (goods · BIC · BNC)", value: `${B.urssaf.ratesPct.value.sales_goods} % · ${B.urssaf.ratesPct.value.services_bic} % · ${B.urssaf.ratesPct.value.services_bnc} %`, source: B.urssaf.ratesPct.source },
    { label: "CFP (goods · BIC · BNC)", value: `${B.urssaf.cfpPct.value.sales_goods} % · ${B.urssaf.cfpPct.value.services_bic} % · ${B.urssaf.cfpPct.value.services_bnc} %`, source: B.urssaf.cfpPct.source },
    { label: "Declarations · ACRE · versement libératoire", value: `${B.urssaf.frequency.value} · ${B.urssaf.acre.value ? "on" : "off"} · ${B.urssaf.versementLiberatoire.value ? "on" : "off"}`, source: "spec 02 §6" },
    { label: "VAT franchise (goods · services)", value: `${eur(B.thresholds.franchiseGoods.value.limitCents)} · ${eur(B.thresholds.franchiseServices.value.limitCents)}`, source: "2026 thresholds" },
    { label: "EU sales to consumers", value: eur(B.thresholds.euCrossBorder.value.limitCents), source: B.thresholds.euCrossBorder.source },
    { label: "Micro ceilings (total · services)", value: `${eur(B.thresholds.microGoods.value.limitCents)} · ${eur(B.thresholds.microServices.value.limitCents)}`, source: "2026 ceilings" },
    { label: "Gift card validity", value: `${B.giftCardExpiryYears.value} years`, source: B.giftCardExpiryYears.source },
    { label: "Print production (S · M · L)", value: `${eur(B.costs.printProduction.value.S)} · ${eur(B.costs.printProduction.value.M)} · ${eur(B.costs.printProduction.value.L)}`, source: B.costs.printProduction.source },
  ];
}
