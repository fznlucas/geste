/**
 * Finance metrics (AdminFinance, owner only), from the books (src/lib/ledger), in EUR excluding VAT for
 * a French micro-entreprise (docs/admin-v2/02): the P&L of a period, VAT collected by country, the year's
 * thresholds, URSSAF, cash and payouts. Later: `v_pnl_monthly`, Stripe and the bank.
 */
import { BUSINESS, type UrssafCategory } from "@/config/business";
import { addDays, parisDay, simNow, simToday } from "@/lib/clock";
import { clone } from "@/lib/api/clone";
import { books, contributionsOf, turnoverByCategory, type LedgerAccount, type LedgerLine, type Payout, type UrssafDeclaration, type VatReturn, STORE_ACCOUNTS, TURNOVER_ACCOUNTS } from "@/lib/ledger";
import { metric } from "./define";
import { calendarMonth, daysOf, periodLabel, rollingDays, type Period } from "./period";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const COUNTRY: Record<string, string> = { FR: "France", BE: "Belgium", DE: "Germany", NL: "Netherlands", ES: "Spain", IT: "Italy" };

/** Lines of a period (Paris days), up to now. */
export function linesIn(p: Period): LedgerLine[] {
  const now = simNow().getTime();
  return books().lines.filter((l) => {
    const d = parisDay(l.at);
    return d >= p.from && d <= p.to && Date.parse(l.at) <= now;
  });
}

const sum = (lines: LedgerLine[], accounts: ReadonlyArray<LedgerAccount>) => lines.filter((l) => accounts.includes(l.account)).reduce((s, l) => s + l.amountEurCents, 0);

/** "September 2026", "Q3 2026", "2026", or "Sep 6 – Oct 5". */
export function financePeriodLabel(p: Period): string {
  const [y1, m1] = [p.from.slice(0, 4), Number(p.from.slice(5, 7))];
  const whole = (d: string, last: boolean) => (last ? addDays(d, 1).slice(8, 10) === "01" : d.slice(8, 10) === "01");
  if (whole(p.from, false) && whole(p.to, true) && p.from.slice(0, 7) === p.to.slice(0, 7)) return `${MONTHS[m1 - 1]} ${y1}`;
  if (whole(p.from, false) && whole(p.to, true) && p.from.slice(5, 10) === "01-01" && p.to.slice(5, 10) === "12-31") return y1;
  if (whole(p.from, false) && whole(p.to, true) && (m1 - 1) % 3 === 0 && Number(p.to.slice(5, 7)) === m1 + 2) return `Q${(m1 + 2) / 3} ${y1}`;
  return periodLabel(p);
}

/** The period of a `?period=` value: "2026-09", "2026-Q3", "2026", "2026-09-06..2026-10-05"; default the last full month. */
export function financePeriod(value?: string | null): Period {
  const v = value ?? "";
  let m: RegExpMatchArray | null;
  if ((m = v.match(/^(\d{4})-(\d{2})$/))) return calendarMonth(`${m[1]}-${m[2]}-01`);
  if ((m = v.match(/^(\d{4})-Q([1-4])$/))) {
    const start = `${m[1]}-${String((Number(m[2]) - 1) * 3 + 1).padStart(2, "0")}-01`;
    return { from: start, to: calendarMonth(addDays(addDays(start, 62), 0)).to };
  }
  if ((m = v.match(/^(\d{4})$/))) return { from: `${m[1]}-01-01`, to: `${m[1]}-12-31` };
  if ((m = v.match(/^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/)) && m[1]! <= m[2]!) return { from: m[1]!, to: m[2]! };
  return calendarMonth(addDays(calendarMonth(simToday()).from, -1));
}

export interface PnlRow {
  /** Stable key (drill-down: the Ledger tab filtered on `accounts`). */
  key: string;
  label: string;
  /** EUR cents excl. VAT; negative for costs. */
  cents: number;
  /** Share of turnover, whole percent (revenue lines and totals). */
  sharePct: number | null;
  total: boolean;
  /** Costs are written with a minus even at €0 ("−€0"). */
  cost: boolean;
  /** Shown for information, outside the totals (VAT collected). */
  memo?: boolean;
  accounts: LedgerAccount[];
}

export interface Threshold {
  key: string;
  label: string;
  usedCents: number;
  limitCents: number;
  pct: number;
  /** When it is crossed at the pace of the last 90 days (null: not this year). */
  projectedDate: string | null;
  alert: boolean;
}

export interface Cash {
  bankCents: number;
  /** Of the bank: VAT collected not paid back yet, URSSAF contributions not paid yet (accrued on turnover). */
  vatDueCents: number;
  urssafDueCents: number;
  /** Bank − VAT due − URSSAF due: what is really yours. */
  availableCents: number;
  nextVat: VatReturn | null;
  stripePendingCents: number;
  stripeAvailableCents: number;
  nextPayout: Payout | null;
  nextUrssaf: UrssafDeclaration | null;
  giftCardLiabilityCents: number;
  /** Since launch, from the liability lines: sold, used (net of refunds paid back onto cards), expired or cancelled. owed = sold − used − expired. */
  giftCards: { soldCents: number; usedCents: number; expiredCents: number };
}

export interface Finance {
  period: Period;
  /** "September 2026" */
  month: string;
  currency: "EUR";
  /** Turnover excl. VAT (chiffre d'affaires, cash basis). */
  revenueCents: number;
  /** The store's own sales in the turnover (orders, refunds, gift cards used): the dashboard's revenue. */
  storeRevenueCents: number;
  grossMarginCents: number;
  grossMarginPct: number;
  /** Overheads (after the gross margin). */
  costsCents: number;
  /** Operating result. */
  netCents: number;
  netPct: number;
  contributionsCents: number;
  resultAfterContributionsCents: number;
  nextPayout: { date: string; cents: number } | null;
  pnl: PnlRow[];
  vat: Array<{ country: string; rate: string; cents: number | null }>;
  vatCents: number;
  turnover: { cents: number; thresholdCents: number | null; pct: number };
  thresholds: Threshold[];
  turnoverByCategory: Record<UrssafCategory, number>;
  contributions: ReturnType<typeof contributionsOf>;
  payouts: Array<{ id: string; date: string; cents: number; status: "scheduled" | "in_transit" | "paid" }>;
  cash: Cash;
  declarations: UrssafDeclaration[];
  vatReturns: VatReturn[];
}

export const FINANCE_DEFINITIONS = {
  revenue: "Turnover excl. VAT: money received for guides, prints, shipping and gift cards used, affiliate commissions paid, minus refunds (cash basis).",
  grossMargin: "Turnover minus the direct costs: print production, packaging, shipping labels, payment and currency fees.",
  net: "Gross margin minus the overheads: GPU, software, ads, studio materials, bank.",
  contributions: "URSSAF social contributions and CFP on the period's turnover, by category.",
  turnover: "Turnover of the calendar year against the micro-entreprise and VAT thresholds.",
} as const;

const share = (cents: number, of: number) => (of ? Math.round((cents / of) * 100) : 0);

/** Turnover by category on the year, and the thresholds (02 §5). */
export const thresholds = metric("Year-to-date turnover against the VAT franchise, the EU cross-border and the micro-entreprise thresholds; projected crossing at the last 90 days' pace.", function thresholds(): Threshold[] {
  const today = simToday();
  const year = { from: `${today.slice(0, 4)}-01-01`, to: today };
  const ytd = turnoverByCategory(linesIn(year));
  const last90 = turnoverByCategory(linesIn(rollingDays(90)));
  const euSales = (p: Period) => linesIn(p).filter((l) => l.sourceTable === "orders" && STORE_ACCOUNTS.includes(l.account) && euCrossBorder(l)).reduce((s, l) => s + l.amountEurCents, 0);
  const T = BUSINESS.thresholds;
  const services = (t: typeof ytd) => t.services_bic + t.services_bnc;
  const all = (t: typeof ytd) => t.sales_goods + services(t);
  const make = (key: string, label: string, used: number, pace90: number, limit: number): Threshold => {
    const perDay = pace90 / 90;
    const days = perDay > 0 ? Math.ceil((limit - used) / perDay) : Number.POSITIVE_INFINITY;
    const date = used >= limit ? today : Number.isFinite(days) ? addDays(today, days) : null;
    return { key, label, usedCents: used, limitCents: limit, pct: share(used, limit), projectedDate: date && date.slice(0, 4) === today.slice(0, 4) ? date : null, alert: share(used, limit) >= T.alertPct.value };
  };
  return [
    make("franchise_goods", "VAT franchise · goods (prints)", ytd.sales_goods, last90.sales_goods, T.franchiseGoods.value.limitCents),
    make("franchise_services", "VAT franchise · services (guides, affiliate)", services(ytd), services(last90), T.franchiseServices.value.limitCents),
    make("eu_cross_border", "EU cross-border sales to consumers", euSales(year), euSales(rollingDays(90)), T.euCrossBorder.value.limitCents),
    make("micro_goods", "Micro-entreprise ceiling · total", all(ytd), all(last90), T.microGoods.value.limitCents),
    make("micro_services", "Micro-entreprise ceiling · services", services(ytd), services(last90), T.microServices.value.limitCents),
  ];
});

/** Sales lines to consumers in another EU country (VAT lines carry the country; the sale lines share their source). */
let euSourceIds: { lines: LedgerLine[]; ids: Set<string> } | null = null;
function euCrossBorder(l: LedgerLine): boolean {
  const all = books().lines;
  if (euSourceIds?.lines !== all) {
    const EU = new Set(["BE", "DE", "NL", "ES", "IT", "AT", "PT", "IE", "LU"]);
    euSourceIds = { lines: all, ids: new Set(all.filter((x) => x.account === "liability.vat" && x.country && EU.has(x.country)).map((x) => x.sourceId)) };
  }
  return euSourceIds.ids.has(l.sourceId);
}

/** Cash at now: bank, Stripe balance (pending / available), next payout, next URSSAF due, gift cards owed. */
export const cash = metric("Money at now: bank balance, Stripe balance waiting and available, next payout, next URSSAF payment, gift cards still owed.", function cash(): Cash {
  const now = simNow().getTime();
  const b = books();
  const upTo = b.lines.filter((l) => Date.parse(l.at) <= now);
  const stripe = upTo.filter((l) => l.account === "cash.stripe_balance");
  const pending = stripe.filter((l) => l.availableAt && Date.parse(l.availableAt) > now).reduce((s, l) => s + l.amountEurCents, 0);
  const total = stripe.reduce((s, l) => s + l.amountEurCents, 0);
  const bankCents = BUSINESS.bank.value.openingCents + sum(upTo, ["cash.bank"]);
  const vatDueCents = sum(upTo, ["liability.vat"]);
  const urssafDueCents = b.declarations.filter((d) => !d.paidAt).reduce((s, d) => s + d.totalCents, 0);
  return {
    bankCents,
    vatDueCents,
    urssafDueCents,
    availableCents: bankCents - vatDueCents - urssafDueCents,
    nextVat: [...b.vatReturns].reverse().find((v) => v.status === "to_declare" || v.status === "late" || v.status === "declared" || v.status === "in_progress") ?? null,
    stripePendingCents: pending,
    stripeAvailableCents: total - pending,
    nextPayout: b.payouts.find((p) => p.status === "scheduled") ?? null,
    nextUrssaf: [...b.declarations].reverse().find((d) => d.status === "to_declare" || d.status === "late" || d.status === "in_progress") ?? null,
    giftCardLiabilityCents: sum(upTo, ["liability.giftcards"]),
    giftCards: giftCardFlows(upTo),
  };
});

function giftCardFlows(lines: LedgerLine[]): Cash["giftCards"] {
  const g = lines.filter((l) => l.account === "liability.giftcards");
  const of = (t: (l: LedgerLine) => boolean) => g.filter(t).reduce((s, l) => s + l.amountEurCents, 0);
  return {
    soldCents: of((l) => l.sourceTable === "orders"),
    usedCents: -of((l) => l.sourceTable === "gift_card_redemptions" || l.sourceTable === "gift_card_refunds"),
    expiredCents: -of((l) => l.sourceTable === "gift_cards"),
  };
}

/** Store turnover (the dashboard's "Revenue"): orders, refunds, gift cards used, EUR excl. VAT. */
export const storeTurnoverEurCents = metric("Store turnover excl. VAT: guides, prints, shipping and gift cards used, minus refunds (EUR, cash basis).", function storeTurnoverEurCents(p: Period): number {
  return sum(linesIn(p), STORE_ACCOUNTS);
});

/** Store turnover of a period, counting only lines up to an instant (today against last week at the same hour). */
export function storeTurnoverUntil(p: Period, untilMs: number): number {
  return linesIn(p).filter((l) => STORE_ACCOUNTS.includes(l.account) && Date.parse(l.at) <= untilMs).reduce((s, l) => s + l.amountEurCents, 0);
}

/** Store turnover per day, oldest first. */
export function dailyStoreTurnover(p: Period): Map<string, number> {
  const m = new Map(daysOf(p).map((d) => [d, 0]));
  for (const l of linesIn(p)) if (STORE_ACCOUNTS.includes(l.account)) m.set(parisDay(l.at), (m.get(parisDay(l.at)) ?? 0) + l.amountEurCents);
  return m;
}

/** P&L, VAT, thresholds, URSSAF, cash and payouts of a period (default: the last full month). */
export const finance = metric("Finance figures of a period in EUR excl. VAT: P&L, gross margin, operating result, contributions, VAT by country, thresholds, cash, payouts.", async function finance(value?: string | null): Promise<Finance> {
  const period = financePeriod(value);
  const lines = linesIn(period);
  const s = (accounts: LedgerAccount[]) => sum(lines, accounts);
  const turnover = s([...TURNOVER_ACCOUNTS]);
  const byCat = turnoverByCategory(lines);
  const contributions = contributionsOf(byCat);
  const contributionsCents = (Object.values(contributions) as Array<{ urssaf: number; cfp: number; vl: number }>).reduce((t, c) => t + c.urssaf + c.cfp + c.vl, 0);
  const row = (key: string, label: string, accounts: LedgerAccount[], opts: Partial<PnlRow> = {}): PnlRow => {
    const cents = opts.cents ?? s(accounts);
    return { key, label, cents, sharePct: opts.cost || opts.memo ? null : share(cents, turnover), total: false, cost: false, accounts, ...opts };
  };
  const revenueRows = [
    row("guides", "Guides", ["revenue.guides"]),
    row("prints", "Prints", ["revenue.prints"]),
    row("shipping", "Shipping charged", ["revenue.shipping"]),
    row("giftcards", "Gift cards used", ["revenue.giftcards_redeemed"]),
    row("breakage", "Gift cards expired unused", ["revenue.giftcards_breakage"]),
    row("affiliate", "Affiliate commissions (shopping lists)", ["revenue.affiliate"]),
    row("refunds", "Refunds", ["refunds.guides", "refunds.prints", "refunds.shipping"]),
  ];
  const direct = [
    row("print_production", "Print production (paper, ink)", ["cost.print_production"], { cost: true }),
    row("packaging", "Packaging (tube, certificate)", ["cost.packaging"], { cost: true }),
    row("labels", "Shipping labels", ["cost.shipping_labels"], { cost: true }),
    row("payment_fees", "Payment fees (Stripe, PayPal)", ["cost.payment_fees"], { cost: true }),
    row("fx", "Currency conversion (USD → EUR)", ["cost.fx"], { cost: true }),
  ];
  const overheads = [
    row("gpu", "GPU (AI pipeline)", ["cost.gpu"], { cost: true }),
    row("software", "Software (store, Claude, email)", ["cost.software"], { cost: true }),
    row("ads", "Ads", ["cost.ads"], { cost: true }),
    row("studio", "Materials for studio tests", ["cost.studio_materials"], { cost: true }),
    row("bank", "Bank", ["cost.bank"], { cost: true }),
  ];
  const directCents = direct.reduce((t, r) => t + r.cents, 0);
  const overheadCents = overheads.reduce((t, r) => t + r.cents, 0);
  const gross = turnover + directCents;
  const operating = gross + overheadCents;
  const after = operating - contributionsCents;
  const vatCents = s(["liability.vat"]);
  const total = (key: string, label: string, cents: number): PnlRow => ({ key, label, cents, sharePct: share(cents, turnover), total: true, cost: false, accounts: [] });
  const pnl: PnlRow[] = [
    ...revenueRows,
    total("turnover", "Turnover (excl. VAT)", turnover),
    row("vat", "VAT collected (owed to the state, not revenue)", ["liability.vat"], { memo: true, cents: vatCents }),
    ...direct,
    total("gross_margin", "Gross margin", gross),
    ...overheads,
    total("operating", "Operating result", operating),
    { key: "contributions", label: "URSSAF + CFP" + (BUSINESS.urssaf.versementLiberatoire.value ? " + versement libératoire" : ""), cents: -contributionsCents, sharePct: null, total: false, cost: true, accounts: ["tax.urssaf", "tax.cfp", "tax.versement_liberatoire"] },
    total("after_contributions", "Result after contributions (before income tax)", after),
  ];

  // VAT collected by country; sales outside the EU are exports at 0 %.
  // VAT collected by country and rate: other EU countries carry French VAT (20 %) under the €10,000
  // threshold, their own rate (OSS) after it.
  const vatBy = new Map<string, number>();
  for (const l of lines) if (l.account === "liability.vat" && l.country) vatBy.set(`${l.country}|${l.vatRatePct ?? ""}`, (vatBy.get(`${l.country}|${l.vatRatePct ?? ""}`) ?? 0) + l.amountEurCents);
  const withVat = new Set(lines.filter((l) => l.account === "liability.vat").map((l) => l.sourceId));
  const exportSales = lines.filter((l) => l.sourceTable === "orders" && STORE_ACCOUNTS.includes(l.account) && !withVat.has(l.sourceId)).length;
  const vat = [
    ...[...vatBy].sort((a, b) => b[1] - a[1]).map(([key, cents]) => {
      const [c, pct] = key.split("|") as [string, string];
      const label = c === "FR" ? COUNTRY.FR! : `${COUNTRY[c] ?? c}${pct === "20" ? " · French VAT" : " · OSS"}`;
      return { country: label, rate: pct ? `${pct}%` : "", cents };
    }),
    ...(exportSales ? [{ country: "Outside the EU (export)", rate: "0%", cents: 0 }] : []),
  ];

  const b = books();
  const th = thresholds();
  const micro = th.find((t) => t.key === "micro_services")!;
  return clone({
    period,
    month: financePeriodLabel(period),
    currency: "EUR",
    revenueCents: turnover,
    storeRevenueCents: s([...STORE_ACCOUNTS]),
    grossMarginCents: gross,
    grossMarginPct: share(gross, turnover),
    costsCents: -overheadCents,
    netCents: operating,
    netPct: share(operating, turnover),
    contributionsCents,
    resultAfterContributionsCents: after,
    nextPayout: (() => {
      const p = b.payouts.find((x) => x.status === "scheduled");
      return p ? { date: p.at, cents: p.amountEurCents } : null;
    })(),
    pnl,
    vat,
    vatCents,
    turnover: { cents: micro.usedCents, thresholdCents: micro.limitCents, pct: micro.pct },
    thresholds: th,
    turnoverByCategory: byCat,
    contributions,
    payouts: b.payouts.slice(0, 8).map((p) => ({ id: p.id, date: p.at, cents: p.amountEurCents, status: p.status })),
    cash: cash(),
    declarations: b.declarations,
    vatReturns: b.vatReturns,
  });
});

/** Ledger lines of a period, newest first (the Ledger tab and the exports). */
export function ledgerLines(value?: string | null, accounts?: LedgerAccount[]): LedgerLine[] {
  const lines = linesIn(financePeriod(value));
  return (accounts?.length ? lines.filter((l) => accounts.includes(l.account)) : lines).slice().reverse();
}

const money = (c: number | null) => (c === null ? "" : (c / 100).toFixed(2));
const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** "Export for accountant (CSV)": the P&L, VAT, URSSAF and payouts of the period, then its ledger lines. */
export function financeCsv(f: Finance): string {
  const rows: string[][] = [
    ["Profit & loss", f.month, "EUR excl. VAT"],
    ["Line", "Amount", "Share %"],
    ...f.pnl.map((r) => [r.label, money(r.cents), r.sharePct === null ? "" : String(r.sharePct)]),
    [],
    ["VAT collected", f.month, ""],
    ["Country", "Rate", "Amount"],
    ...f.vat.map((v) => [v.country, v.rate, money(v.cents)]),
    [],
    ["URSSAF", f.month, ""],
    ["Category", "Turnover", "Contributions + CFP"],
    ...(Object.keys(f.turnoverByCategory) as UrssafCategory[]).map((c) => [c, money(f.turnoverByCategory[c]), money(f.contributions[c].urssaf + f.contributions[c].cfp + f.contributions[c].vl)]),
    [],
    ["Payouts", "", ""],
    ["Date", "Amount", "Status"],
    ...f.payouts.map((p) => [p.date.slice(0, 10), money(p.cents), p.status]),
    [],
    ["Ledger", f.month, ""],
    ["Date", "Account", "Category", "Amount EUR", "Amount USD", "Rate", "Source", "Memo"],
    ...ledgerLines(`${f.period.from}..${f.period.to}`).reverse().map((l) => [l.at, l.account, l.category, money(l.amountEurCents), l.amountUsdCents === undefined ? "" : money(l.amountUsdCents), l.fxRate ? String(l.fxRate) : "", `${l.sourceTable}:${l.sourceId}`, l.memo]),
  ];
  return rows.map((r) => r.map(esc).join(",")).join("\n") + "\n";
}

/** The FEC-shaped file (Fichier des écritures comptables): 18 tab-separated columns, one row per ledger line. */
export function financeFec(f: Finance): string {
  const ACCOUNT_NUMBERS: Partial<Record<LedgerAccount, [string, string]>> = {
    "revenue.guides": ["706000", "Prestations de services"], "revenue.prints": ["707000", "Ventes de marchandises"], "revenue.shipping": ["708500", "Ports facturés"],
    "revenue.giftcards_redeemed": ["706100", "Cartes cadeaux utilisées"], "revenue.giftcards_breakage": ["758000", "Cartes cadeaux expirées"], "revenue.affiliate": ["706200", "Commissions"],
    "refunds.guides": ["709000", "Rabais remises ristournes"], "refunds.prints": ["709700", "Rabais sur ventes"], "refunds.shipping": ["709850", "Ports remboursés"],
    "liability.giftcards": ["419100", "Clients avances cartes cadeaux"], "liability.vat": ["445710", "TVA collectée"],
    "cost.print_production": ["601000", "Achats papier encre"], "cost.packaging": ["602600", "Emballages"], "cost.shipping_labels": ["624100", "Transports sur ventes"],
    "cost.payment_fees": ["627000", "Services bancaires"], "cost.fx": ["666000", "Pertes de change"], "cost.gpu": ["628100", "Calcul GPU"], "cost.software": ["651000", "Logiciels"],
    "cost.studio_materials": ["606400", "Fournitures atelier"], "cost.ads": ["623000", "Publicité"], "cost.bank": ["627100", "Frais bancaires"],
    "tax.urssaf": ["646000", "Cotisations URSSAF"], "tax.cfp": ["633300", "Formation professionnelle"], "tax.versement_liberatoire": ["108000", "Versement libératoire"],
    "cash.stripe_balance": ["511100", "Stripe"], "cash.bank": ["512000", "Banque"], "asset.supplies": ["322000", "Stock fournitures (tubes, papier, certificats)"],
  };
  const head = ["JournalCode", "JournalLib", "EcritureNum", "EcritureDate", "CompteNum", "CompteLib", "CompAuxNum", "CompAuxLib", "PieceRef", "PieceDate", "EcritureLib", "Debit", "Credit", "EcritureLet", "DateLet", "ValidDate", "Montantdevise", "Idevise"];
  const fecDate = (iso: string) => parisDay(iso).replaceAll("-", "");
  const amount = (c: number) => (c / 100).toFixed(2).replace(".", ",");
  const rows = ledgerLines(`${f.period.from}..${f.period.to}`).reverse().map((l, i) => {
    const [num, lib] = ACCOUNT_NUMBERS[l.account] ?? ["471000", l.account];
    // Revenue, liabilities: a positive amount is a credit; costs, cash: a positive amount is a debit.
    const creditSide = /^(revenue|refunds|liability)\./.test(l.account);
    const debit = creditSide ? (l.amountEurCents < 0 ? -l.amountEurCents : 0) : l.amountEurCents > 0 ? l.amountEurCents : 0;
    const credit = creditSide ? (l.amountEurCents > 0 ? l.amountEurCents : 0) : l.amountEurCents < 0 ? -l.amountEurCents : 0;
    return [
      "VT", "Ventes et opérations", String(i + 1), fecDate(l.at), num, lib, "", "", `${l.sourceTable}:${l.sourceId}`, fecDate(l.at), l.memo,
      amount(debit), amount(credit), "", "", fecDate(l.at), l.amountUsdCents === undefined ? "" : amount(l.amountUsdCents), l.amountUsdCents === undefined ? "" : "USD",
    ];
  });
  return [head, ...rows].map((r) => r.join("\t")).join("\r\n") + "\r\n";
}

/** The period picker's choices, newest first: months, quarters and years since launch (value for `?period=`). */
export function financePeriodOptions(): Array<{ group: "Month" | "Quarter" | "Year"; value: string; label: string }> {
  const today = simToday();
  const out: Array<{ group: "Month" | "Quarter" | "Year"; value: string; label: string }> = [];
  for (let d = "2026-07-01"; d <= today; d = addDays(calendarMonth(d).to, 1)) {
    const key = d.slice(0, 7);
    out.push({ group: "Month", value: key, label: financePeriodLabel(financePeriod(key)) });
    const q = Math.floor((Number(d.slice(5, 7)) - 1) / 3) + 1;
    if ((Number(d.slice(5, 7)) - 1) % 3 === 0 || d === "2026-07-01") out.push({ group: "Quarter", value: `${d.slice(0, 4)}-Q${q}`, label: `Q${q} ${d.slice(0, 4)}` });
    if (d.slice(5, 7) === "01" || d === "2026-07-01") out.push({ group: "Year", value: d.slice(0, 4), label: d.slice(0, 4) });
  }
  return out.reverse();
}

/** "2026-09", "2026-Q3", "2026", "2026-09-06_2026-10-05": the period in a file name. */
export function financePeriodSlug(p: Period): string {
  const label = financePeriodLabel(p);
  if (/^\d{4}$/.test(label)) return label;
  const q = label.match(/^Q(\d) (\d{4})$/);
  if (q) return `${q[2]}-Q${q[1]}`;
  if (p.from.slice(0, 7) === p.to.slice(0, 7) && /^[A-Z][a-z]+ \d{4}$/.test(label)) return p.from.slice(0, 7);
  return `${p.from}_${p.to}`;
}
