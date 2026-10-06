# 02 · Ledger and accounting (micro-entreprise, EUR, excluding VAT)

The store keeps selling in **USD** (nothing changes on the store). The books, Finance, the URSSAF screen and every money KPI in the admin are in **EUR, excluding VAT**, because that is what a French micro-entreprise declares. A currency switch in the admin top bar (EUR HT by default / USD as charged) only changes the display of store-side figures (orders list, order detail, customer); Finance and URSSAF are always EUR.

All rates and thresholds below live in `src/sim/config.ts` → `BUSINESS` (or a new `src/config/business.ts` imported by both the sim and the metrics), each with a source comment. The values are the 2026 ones; **every one is marked "confirm with your accountant"** in Settings › Payments & tax.

## 1. One ledger — `src/lib/ledger/`

Every money event produces ledger lines; Finance, Dashboard, URSSAF, Payouts and Cash only read the ledger (through `src/lib/metrics/*`).

```ts
interface LedgerLine {
  id: string; at: string;            // ISO; business day = Paris day of `at`
  account: LedgerAccount;            // see §2
  amountEurCents: number;            // + income/asset, − cost/outflow
  amountUsdCents?: number;           // original amount when charged in USD
  fxRate?: number;                   // USD→EUR used
  category?: "services_bic" | "sales_goods" | "services_bnc" | "none"; // URSSAF category
  sourceTable: string; sourceId: string;  // order, refund, payout, expense, gift_card, affiliate_statement…
  memo: string;
}
```

Lines are **derived** from rows (generated, fixture, overlay) by pure functions: `ledgerFromOrder`, `ledgerFromRefund`, `ledgerFromGiftCardRedemption`, `ledgerFromShipment`, `ledgerFromPayout`, `ledgerFromExpense`, `ledgerFromAffiliateStatement`, `ledgerFromUrssafPayment`. Never stored separately in the mock, so they can never drift from the rows.

## 2. Accounts

| Account | What goes in |
| --- | --- |
| `revenue.guides` | Guide lines, net of discounts, excl. VAT — category `services_bic` (sale of digital content; confirm) |
| `revenue.prints` | Print lines + their share of shipping charged — category `sales_goods` |
| `revenue.shipping` | Shipping charged on prints (shown apart, same category as prints) |
| `revenue.giftcards_redeemed` | Gift-card value **when used**, split by what it paid for (guides / prints category) |
| `revenue.giftcards_breakage` | Value of expired unused cards (expiry from config, default 2 years — confirm) |
| `revenue.affiliate` | Partner commissions **when paid by the partner** (cash basis) — category `services_bnc` by default (confirm: BIC services if treated as commercial brokerage) |
| `liability.giftcards` | + at sale, − at redemption or breakage |
| `liability.vat` | VAT collected (only if regime = collect, §5) |
| `refunds.*` | Negative revenue in the month the refund is paid, same category as the refunded line |
| `cost.print_production` | Paper, ink, per copy by size (S/M/L) |
| `cost.packaging` | Tube, caps, certificate card, per shipment |
| `cost.shipping_labels` | Boxtal label price by carrier and zone |
| `cost.payment_fees` | Stripe / PayPal fees per payment (§4), dispute fees |
| `cost.fx` | Currency conversion fee (2 % on USD charges settled in EUR) |
| `cost.gpu` | AI jobs, from `aiJobCostCents` of each job, on its run date |
| `cost.software` | Subscriptions on their billing day (list in config: domain, Vercel, Supabase, Resend, Mux, Claude, PostHog… — mock prices, all marked "confirm") |
| `cost.studio_materials` | Canvases and paints for studio tests (per new work + monthly restock) |
| `cost.ads` | Paid campaigns (0 by default) |
| `cost.bank` | Bank account fee |
| `tax.urssaf` | Social contributions (§6), when paid |
| `tax.cfp` | Contribution à la formation professionnelle, with URSSAF |
| `tax.versement_liberatoire` | If the option is on |
| `cash.stripe_balance` / `cash.bank` | Movements: payment → Stripe balance (net of fees); payout → bank; expenses and URSSAF → out of bank |

## 3. Recognition rules (micro-entreprise = cash basis)

- **Turnover (chiffre d'affaires)** = amounts **received** in the period, excluding VAT, by URSSAF category. Paid orders count on their payment date; refunds come off in the month they are paid; gift cards count when redeemed; affiliate when the partner pays.
- Gift cards are **never revenue at sale** (today `src/data/insights.ts:82` counts $332 as revenue: fix). They are a liability. Today's orders also charge VAT on gift cards (`GS-2039`, `GS-2012`): a multi-purpose voucher carries no VAT at sale; VAT, if any, applies on redemption.
- Affiliate commissions are **not store sales**: out of average order value, out of conversion, out of "Revenue" on the dashboard; shown as their own tile and line.
- Shipping charged is income, labels are cost (today there is a cost line but no income line).

## 4. Fees and FX

| Item | Rule (config) |
| --- | --- |
| Stripe EEA standard card | 1.5 % + €0.25 |
| Stripe EEA premium card | 2.8 % + €0.25 (share of premium cards: 15 %) |
| Stripe UK card | 2.5 % + €0.25 |
| Stripe international card | 3.15 % + €0.25 |
| Currency conversion | 2 % on every USD charge settled in EUR |
| Stripe Tax | 0.5 % per transaction, only when VAT regime = collect |
| Dispute | €20 |
| PayPal | 2.9 % + €0.35 (confirm with your PayPal pricing) |
| FX USD→EUR | config base rate + daily drift ±0.3 % (deterministic). The live adapter later reads the rate of the Stripe balance transaction |

Source: Stripe France pricing page (checked Oct 2026). Every fee line links to its payment in the order detail.

## 5. VAT regime switch

Today the store adds French, Belgian, Swiss and German VAT (`src/lib/pricing.ts` `VAT_RATES`, `includedVatCents`), but a new micro-entreprise is by default under the **franchise en base** (no VAT, mention "TVA non applicable, art. 293 B du CGI"). That is a real decision for Lucas, so it becomes one switch in Settings › Payments & tax, read by checkout, invoices and books:

| Regime | Store | Books |
| --- | --- | --- |
| `collect` (**initial value, = today's behaviour, so nothing changes on the store**) | Prices VAT-inclusive, VAT line shown, rates by country as today | Revenue excl. VAT; `liability.vat` per country; OSS lines for EU B2C once over €10,000 cross-border |
| `franchise` | Same displayed prices; no VAT line; invoice mention "TVA non applicable, art. 293 B du CGI" | Revenue = amount received; no VAT |

Fixes regardless of regime: Switzerland and non-EU countries are exports → 0 % (today CH is charged 8.1 %, `src/data/tax.ts`); OSS is shown only when registered (Settings says "To do").

Thresholds tracked in Finance (2026 values, config):

| Threshold | Value |
| --- | --- |
| VAT franchise — goods (prints) | €85,000 (tolerance €93,500) |
| VAT franchise — services (guides, affiliate) | €37,500 (tolerance €41,250) |
| EU cross-border B2C (digital + distance sales) | €10,000 per year, all EU countries together |
| Micro ceiling — sales of goods (total) | €203,100 |
| Micro ceiling — services (within the total) | €83,600 |

Each shows "used / limit", the projected date of crossing at the current 90-day pace, and an alert at 80 %.

## 6. URSSAF — new "Taxes & URSSAF" section inside Finance (a tab, nothing removed)

| Category | Social contributions 2026 | CFP | Versement libératoire (option) |
| --- | --- | --- | --- |
| Sales of goods (prints, shipping) | 12.3 % | 0.1 % | 1 % |
| Services BIC (guides) | 21.2 % | 0.1 % (commerçant) or 0.3 % (artisan) — config | 1.7 % |
| Services BNC (affiliate, if BNC) | 25.6 % (SSI) | 0.2 % | 2.2 % |

- Declaration frequency: monthly or quarterly (config, default quarterly). Each period shows turnover per category, contributions, due date (last day of the month after the period), status (to declare / declared / paid). "Mark as declared" and "Mark as paid" write the overlay and create the `tax.urssaf` ledger line; the simulation pays them itself for periods older than the hands-off window.
- ACRE (first-year reduction) is a switch in config, off by default.
- Note visible on the screen: "Prints sold by the artist may fall under the artist-author scheme instead of micro BIC: ask your accountant." (Lucas to confirm.)

## 7. Payouts and cash

- Payments land in the Stripe balance net of fees on payment day, become available after 7 days (config), and are paid out weekly on Friday (config). The Payouts table lists every payout with the payments it contains (click → list of orders).
- Refunds are taken from the balance; a negative balance delays the payout.
- Bank: opening balance (config €0 at launch) + payouts + PayPal transfers + affiliate payments − expenses − URSSAF. Finance gains a "Cash" block: bank balance today, Stripe balance (pending / available), next payout, next URSSAF due, gift-card liability outstanding.

## 8. Finance P&L (same screen, recomputed)

Rows keep their place on the board; they are now computed and in EUR excl. VAT. Lines:

Revenue: Guides · Prints · Shipping charged · Gift cards redeemed · Affiliate commissions · Refunds (negative) = **Turnover**
Direct costs: Print production · Packaging · Shipping labels · Payment fees · FX fees = **Gross margin** (and % of turnover)
Overheads: GPU · Software · Ads · Studio materials · Bank = **Operating result**
URSSAF + CFP (+ VL) = **Result after contributions** (label: "before income tax")

Check (test): Gross margin = Turnover − direct costs; every share sums to 100 %; P&L turnover = URSSAF turnover for the same period = sum of ledger revenue lines.

Period selector on Finance: month, quarter, year, custom; "Export for accountant" exports the ledger lines of the period (CSV) and an FEC-shaped file (`FEC.txt`, tab-separated, standard columns) — filename uses the period, not `2026-09` (`FinancePage.tsx:42`).
