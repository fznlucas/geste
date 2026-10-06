# Admin v2 — implementation plan (Phase 0)

Written 2026-10-06 against `f48247a`. Spec: `docs/admin-v2/01…07`, prompt `PROMPT.md`. Line numbers below were re-checked on this commit. Decisions Lucas already gave (2026-10-06) are marked **[Lucas]**; choices I made alone are marked **[me]** and go to `docs/decisions.md` when the phase that needs them lands.

---

## 0. What the code is today (facts the plan relies on)

- **Stores are already v2**: `geste.admin.v2`, `geste.purchases.v2`, `geste.cart.v2` (`createPersistentStore`, `src/lib/client/store.ts:31`). Stale comment in `src/lib/client/admin/orders.ts:5` (says v1).
- **Merge** (`src/lib/api/local.ts`): fixtures + browser purchases + overlay; on the server render (build) only fixtures. `merged()` = inserts first, then base, each patched; no dedupe. Every admin read goes through `useAdminQuery` (re-runs on overlay or purchases change).
- **Clock**: `MOCK_NOW = "2026-10-02T12:00:00Z"` (`src/data/customers.ts:8`, re-exported by `src/lib/api/index.ts:28`). `adminNow()` / `orderTime()` / `catalog.ts:137` use `max(Date.now(), MOCK_NOW)` (so real time now), while dashboard, support inbox and promo status still measure from Oct 2: the admin is already split between two clocks.
- **Numbers typed by hand**: `src/data/dashboard.ts` (Jul–Sep daily series built from month totals; `today` = 11 orders that have no matching rows), `src/data/insights.ts` (funnel, sources, completion, devices, mix, P&L, VAT, turnover, payouts; other ranges are `× 0.27 / 2.1 / 3.4`), `src/data/marketing.ts` (uses, balances, audiences 1240/410/830, affiliate), `src/data/ai.ts:7-9`, `HISTORICAL_SALES` (`src/data/works.ts:53`), `ORDERS_THIS_MONTH = 187` (`src/lib/api/orders.ts:205`). The "30 d" tiles are the September total, not a rolling window.
- **VAT**: rates live in `src/data/tax.ts` (not `pricing.ts`). Prices are VAT-inclusive; totals never depend on the rate. Fixture `taxCents` is recomputed at module load (`src/data/orders.ts:72`); browser orders store theirs (`checkout.ts:120`). 9 Swiss fixture orders, 4 Belgian, 0 German.
- **Editions**: `SOLD` constants (`src/data/editions.ts:30-42`) sum to **431 copies** (N°12 S and all of N°13 sold out; Home next numbers 12/4/21). Cart and checkout read the static `printEditions` (no overlay); restock does not free a number; certificate `C-07-012` has no size.
- **Orders by number**: every admin action, URL (`/admin/orders/detail?number=`, `/track?order=`, `/checkout/success?order=`), audit target and inserted shipment id uses the number; fixture ids embed it (`order-2041`, `item-2041-2`). Refunds, shipments, threads, gift cards, copies, entitlements link by id.
- **Role checks** are already inside every action (`requireStaff`), and the support ≤ $50 refund cap is enforced in `refundOrder`. Missing: paid-only guard, the CSV export's audit outside an action, `advanceJobs` unguarded (it becomes the sim/clock tick).
- **Fake controls**: inline `toast.show("Done · demo action")` at `SettingsPage.tsx:126` (9 buttons), `WorkEditor.tsx:247,414`, `GuideEditor.tsx:159,160`; fake "sent" wording at `OrderDetailPage.tsx:272,277,358`, `CustomerDetailPage.tsx:121,155`, `MarketingPage.tsx:229`. No Outbox, no integration log, no generated files, no IndexedDB.
- **Components present**: `Switch`, `StatusChip`, `Tooltip`, `Drawer`, `Modal`, `Popover`, `Menu`, `Toast`, `Tabs`, `AdminTabs`, `AdminBox`, `AdminRow`, `DataTable` (kit only), `Timeline` (kit only), `KpiTile`, `BarChart`, `HBar`, `KanbanBoard`. **Missing** (to add to `src/components/admin/` + `/kit` in every state): `MistBlock` (loading), `EmptyState`, `InfoTip` (Icon + Tooltip + "See the rows"), `FilterSummary`, `PeriodPicker`. Icon set has no `info`: add one glyph.
- **Tests**: Playwright only (2 projects, 1440×900 and 390×844), serving `out/` with `scripts/serve-out.mjs`; it does not build. No unit runner. No CI e2e (only `deploy.yml`, plain `npm run build`).
- **About 70 e2e assertions** read values the simulation will compute (inventory kept in the Phase 2 notes): order numbers (GS-2041/2042/2038/2036/2028…), KPI tiles ($5,278, 187, +38 % vs Aug), "Today · Oct 2", chart labels, to-do counts, badges, copy numbers (12/100, 13/100, "89 of 100 left", N°13 sold out), certificate `#C-07-010`, "GPU this month: $38.90", finance $3,385 and `geste-finance-2026-09.csv`, Belgium OSS 120.00…

---

## 1. Decisions already taken

| # | Topic | Decision |
| --- | --- | --- |
| D1 **[Lucas]** | Swiss / non-EU VAT | Export = 0 % for CH and every non-EU country. Displayed price and amount paid unchanged; only the "including VAT" part goes to 0 and the excl.-VAT amount rises. Fixture totals unchanged (asserted by a test); `taxCents` recomputed at display for stored browser orders; any test that freezes a Swiss tax figure is updated and listed in decisions.md. |
| D2 **[Lucas]** | Performance | Warm reopen (cache hit, only missing days generated) < 150 ms. Cold (first load or new seed) < 400 ms. Over 400 ms → generation moves to a Web Worker with a Mist-block loading state (no shimmer). Both measured in tests, plus a projection at ~730 days. |
| D3 **[Lucas]** | Calibration | Anchored months: orders and visits exact by construction. Revenue free; ±5 % on September receipts ($4,960) is a tuning goal, reported with the weights if missed. |
| D4 **[me]** | Sim cache storage | `geste.sim.v1` lives in **IndexedDB**, not localStorage: two years of rows exceed the ~5 MB localStorage quota. Same key name; a tiny sync snapshot (edition stock, last order number, generated-up-to) stays in localStorage `geste.simmeta.v1` for the synchronous cart. |
| D5 **[me]** | Generation vs. "now" | The generator produces **planned rows**: each row carries its whole future timeline (paid → printed → shipped → delivered, thread → replies → done…). A pure `materialize(rows, now, handsOffHours)` cuts at `now` and applies the hands-off rule. The cache is therefore independent of the clock and of the overlay. |
| D6 **[me]** | Hands-off and "the past never changes" | Rows older than `now − HANDS_OFF_HOURS` never change. Inside the 48 h window the sim's planned resolutions are hidden (that is Lucas's to-do); they appear once the item leaves the window, unless Lucas acted first (overlay wins). The determinism test checks rows older than the window fully and newer rows on their creation fields. |
| D7 **[me]** | Numbers at read time | Order numbers (from GS-1001), copy numbers and certificate numbers are assigned at read time in payment order over fixtures + generated + browser rows. A browser purchase therefore shifts later generated orders by one *in that browser only*. If browser sales would oversell an edition, the later generated sale becomes a "sold-out race" failed payment at merge time. |
| D8 **[me]** | Traffic events | Visits and funnel steps are stored as daily aggregates by source × device (`traffic_days`), not one row per pageview (about 650k rows over two years would break the budget). Order-, reader- and support-level events are individual rows. The PostHog adapter exposes both shapes. |
| D9 **[me]** | Live switch | `NEXT_PUBLIC_API_BASE` unset → every `needsServer` integration's Live switch is disabled with "Needs a server · set NEXT_PUBLIC_API_BASE". |

---

## 2. Decisions asked of Lucas (answered 2026-10-06)

**Q1. Edition stock story vs. calibration.** The `SOLD` constants (431 copies, N°12 S and N°13 sold out) cannot come from three months of calibrated sales: September prints ≈ 30 % of $4,960 ≈ 25 copies a month, so about 70 copies since launch. Options:
- **(a) — chosen [Lucas]** Keep them as **copies sold before the store opened** (pre-sale / first exhibition, dated 2026-06-30). They are real `print_copies` rows (numbers 1…n) with no store order, so they count for stock and numbering but not for store revenue, the ledger or the KPIs. N°12 S and N°13 stay sold out and the Home/prints boards keep their story; the sim sells on top, so "next number 12/100" becomes whatever the sim reaches by `now`.
- (b) Drop them: stock comes only from the sim; nothing is sold out; the prints e2e tests change meaning (sold-out cases need a seeded edition).
- (c) Force the sim to reach them by Oct 2. This breaks the revenue mix and the ±5 % goal.

**Q2. Time zone of displayed times.** Spec: business days are Europe/Paris. Today `src/lib/dates.ts` shows everything in UTC (fixtures were written as the boards show them).
- **(a) — chosen [Lucas]** The admin shows Europe/Paris. Store and reader stay UTC, so the boards and store e2e tests do not move.
- (b) Everything in Paris time, everywhere. Fixture times shift by +2 h (for example "Oct 1, 06:12" becomes "08:12") and the tests are updated through helpers.

---

## 3. Architecture (new files)

```
src/lib/clock.ts                 simNow(), simToday(), startOfDayParis(), parisDay(iso), clockOverride(), setClockOverride()
src/config/business.ts           BUSINESS: fees, FX base, VAT regime default, thresholds, URSSAF rates, CFP, VL, ACRE, payout rules,
                                 gift-card expiry, costs (02 §6) — each with source comment + `confirm: true`
src/sim/config.ts                SIM_SEED, LAUNCH_DATE, ANCHORS, growth & seasonality, calendar, traffic & funnel, customers & countries,
                                 basket/payment mix, fulfilment lags, reader curve, affiliate, support, reviews, refunds, AI, HANDS_OFF_HOURS
src/sim/random.ts                mulberry32, hash (cyrb53), poisson, lognormal (inverse-CDF, no trig), weightedPick, largestRemainder
src/sim/calendar.ts              weekday factors, FR holidays, social posts, newsletter sends, campaigns (BF, Dec, Jan…)
src/sim/names.ts                 name pools FR/BE/CH/DE/US/UK, cities + postcodes
src/sim/state.ts                 SimState (customers, stock per edition, gift-card balances, open threads, reader progress, counters)
src/sim/day.ts                   generateDay(date, state) → DayRows (15 steps of 01 §4)
src/sim/calibrate.ts             monthly anchors: daily weights → largest-remainder allocation (orders, visits); fixture rows count
src/sim/history.ts               buildHistory(until) memoised per day; cache read/write (IndexedDB) + resume from last full day
src/sim/materialize.ts           cut at now + hands-off + "Lucas · simulated" audit lines
src/sim/merge.ts                 fixtures ∪ generated ∪ browser → numbering (orders, copies, certificates), oversell → failed payment
src/sim/worker.ts                (only if cold > 400 ms) Worker entry; same API
src/sim/index.ts                 getSimRows() (sync after boot), loadSim() (async), simStatus(), regenerate(seed)
src/lib/ledger/{types,derive,fx,fees,index}.ts   LedgerLine + ledgerFrom* pure functions, memoised by period
src/lib/metrics/                 one file per concept, each exporting `fn` + `definition`:
  period.ts (ranges, previous equal period, labels "vs Sep 6 – Oct 5"), orders.ts (orderTab, paidOrders, ordersThisMonth),
  revenue.ts, basket.ts, funnel.ts, sources.ts, devices.ts, levelMix.ts, completion.ts, repeat.ts, customers.ts,
  editions.ts (stock from copies), fulfilment.ts, support.ts (first-reply median, overdue), reviews.ts, ai.ts (month spend),
  marketing.ts (promo uses, gift balances, audiences, affiliate), finance.ts (P&L), urssaf.ts, thresholds.ts, cash.ts (payouts,
  balances), todo.ts (todoCounts, alerts with stable ids), integrations.ts (mock/live counts), index.ts
src/lib/integrations/            registry.ts, mode.ts, index.ts (adapter(id)), log.ts, outbox.ts, errors.ts
  <id>/{types,mock,live}.ts      ≈ 40 integrations of 03 §3 (several share one folder: stripe/*, social/*, accounting/*)
src/lib/files/                   IndexedDB `geste.files.v1` (uploads), pdf/{label,invoice,certificate}.tsx (@react-pdf/renderer), fec.ts, csv.ts
src/lib/client/admin/*.ts        extended actions (one per control of 04), all: role → guard → overlay → audit → integration log → Outbox
```

Read path stays: pages → `@/lib/api` (unchanged signatures) / `@/lib/metrics` / `@/lib/client`. ESLint `no-restricted-imports` in `src/app` and `src/components` gains `@/sim`, `@/sim/*`, `@/config/*` (pages read config through metrics or api), keeping `@/data`.

`MOCK_NOW` stays exported (spec 01 §1). A `const` cannot be "read at call time", so all 7 importers switch to `simNow()` in Phase 1, and `MOCK_NOW` remains as a `@deprecated` export with `simNow().toISOString()` evaluated at module load. Nothing reads it any more, and no import breaks.

---

## 4. Data shapes added to `src/data/types.ts`

All additive and optional on existing rows, so fixtures and stored browser rows stay valid. Each new table gets a comment block in `supabase/migrations/0006_admin_v2.sql` (comment only, no schema change in the mock).

- `OrderRow` += `source?: Source`, `device?: Device`, `country?: string`, `currency?: "usd"`, `promoCodeId?: string | null`, `giftCardRedemptions?: Array<{ giftCardId: string; cents: number }>`, `paymentId?: string`, `origin?: "fixture" | "sim" | "browser"`. `number` stays on the type but is filled by `merge.ts`.
- `PaymentRow` (new, `payments`): `id, orderId, at, method: "card" | "wallet" | "paypal", cardRegion: "eea" | "uk" | "intl", premium, threeDS: "passed" | "not_required" | "failed", risk, amountUsdCents, status: "succeeded" | "failed", declineCode?`.
- `PrintCopyRow.fulfilment` widened to `to_print | sent_to_lab | printed | packed | label_created | shipped | in_transit | delivered | returned | cancelled`; += `paidAt?`, `soldBeforeLaunch?` (Q1a). `CopyStatus` gains `returned`.
- `ShipmentRow.status` widened (`label_created | shipped | in_transit | delivered | returned`); += `copyIds?: string[]`, `labelFileId?`, `costEurCents?`.
- `CertificateRow` (new): `id, copyId, number: "C-07-S-012", issuedAt, fileId?`.
- `ProfileRow` += `country?`, `source?`, `hasPassword?`, `emailVerified?`, `passkeys?`, `newsletterAt?`.
- `SubscriberRow` (new): `id, email, customerId | null, subscribedAt, unsubscribedAt | null, source`.
- `TrafficDayRow` (new): `day, bySource: Record<Source, {visits, viewed, cart, checkout, paid}>, byDevice: Record<Device, number>` (D8).
- `ReaderEventRow` (new): `entitlementId, at, kind: "opened" | "step" | "completed" | "printed", step?`.
- `GiftCardRow` moves to `types.ts` (+ `expiresAt`, `voidedAt?`); `GiftCardRedemptionRow` (new).
- `PromoRow.scope` += `"gift_cards"`; `startsAt` used; `uses` becomes derived.
- `AffiliatePartnerRow`, `AffiliateClickDayRow`, `AffiliateCommissionRow` (`status: pending | confirmed | paid`), `AffiliateStatementRow`.
- `ExpenseRow` (new): `id, at, account, vendor, amountEurCents, memo, sourceId?` (print production, packaging, labels, software, studio, ads, bank, supplies).
- `PayoutRow` (new): `id, at, amountEurCents, status: scheduled | in_transit | paid, paymentIds[]`.
- `UrssafDeclarationRow` (new): `period, declaredAt | null, paidAt | null` (figures derived from the ledger).
- `SocialPostRow` (new): `id, network, at, theme, stats` (drives traffic).
- `RefundRow` += `kind: "guide" | "print" | "full"`, `shippingRefunded`, `toGiftCard?`.
- `SupportThreadRow` += `topic?`; first-reply time derived from messages.
- `AiJobRow` += `finishesAt?` (progress from the clock).
- `AuditEntry.actor?: "staff" | "simulated"` ("Lucas · simulated").
- `IntegrationLogRow`, `OutboxEmailRow` (subject, to, from, template, props, at, related), `SupplyStockRow`, `AlertReadRow`.
- `LedgerLine` lives in `src/lib/ledger/types.ts` (derived, never stored).

---

## 5. Phases (file by file)

Each sub-step is one commit (`admin-v2(<module>): …`). Each phase ends with the gate: `typecheck · lint · build · build:e2e + test:e2e · test:unit`, screenshots compared, decisions.md updated, report to Lucas (changes, tests, September check, decisions taken alone, next).

### Phase 1 — Clock + metrics skeleton (no visual change)

1. **Screenshots "before"**: `e2e/screens.spec.ts` (tagged, not in the default run) shoots every admin route × 4 roles where reachable × 1440/390 → `docs/admin-v2/screens/before/`. **This step comes first** so Phase 7 has a true baseline.
2. **Tooling**: Vitest (dev dependency) + `npm run test:unit`; `vitest.config.ts` with the `@/` alias; `build:e2e` = `NEXT_PUBLIC_SIM_NOW=2026-10-02T12:00:00Z npm run build` writing `out/.sim-now`; Playwright `globalSetup` fails fast with a clear message if `out/.sim-now` is missing or differs (prevents running e2e on a production build); `test:e2e` doc updated.
3. **`src/lib/clock.ts`** with the override order of 01 §1 (`?simNow=` → sessionStorage `geste.simnow.v1`; `NEXT_PUBLIC_SIM_NOW`; real time). Unit tests: override order, Paris day boundaries across DST (2026-10-25, 2027-03-28).
4. **Replace clock uses**: `adminNow()` → `simNow()` (body swap, name kept), `orderTime()`, `catalog.ts:137`, `dashboard.ts:80`, `marketing.ts:34`, `SupportPage.tsx:26`, `DashboardPage.tsx:24`, `OrdersPage.tsx:42`, `WorkEditor.tsx:68,157`, `GiftCardForm.tsx:39,129` (min date = `simToday()`), `FinancePage.tsx:36,42`. **Real time stays** for the reader's drying countdown (`progress.ts`, `TimerView.tsx`), cookies `savedAt`, session `signedInAt`, footer year: these are wall-clock by nature [me].
5. **`src/lib/metrics/*` skeleton**: each function returns today's constants through the new signatures (`(period) → value`, plus `definition`). Pages switch from `@/lib/api` aggregate getters to metrics where a KPI is shown; `getDashboard`/`getAnalytics`/`getFinance` keep their signatures and become thin wrappers over metrics. `orderTab()`, `todoCounts()`, `alerts()` land in `metrics/todo.ts` now, still returning the **same numbers as today** (badge 3 / tab 4 discrepancy kept until Phase 5).
6. ESLint: ban `@/sim` and `@/config` in pages and components.
**Gate**: screenshots identical to "before" (pixel diff), all e2e green unchanged.

### Phase 2 — Simulation engine, calibration, merge, renumbering

1. `src/sim/random.ts`, `names.ts`, `calendar.ts`, `config.ts`, `src/config/business.ts` (values + sources + `confirm`).
2. `day.ts` steps 1–6 (traffic, funnel, customers, baskets through `priceCart`, payments, post-payment effects), `state.ts`, `calibrate.ts` (anchors exact: Jul 108 / Aug 133 / Sep 187 orders including the fixture orders of each month; Sep visits 6,680; Jul ≈ 5,400, Aug ≈ 6,045).
3. Steps 7–15 (fulfilment lags with working days and 16:00 pickup, reader curve, shopping-list clicks + affiliate, support, reviews, refunds, marketing, AI, costs & money).
4. `history.ts` + IndexedDB cache (D4) + `materialize.ts` (D5, D6) + `visibilitychange` rebuild after 5 min.
5. `merge.ts` + `src/lib/api/local.ts` read path: `fixtures ∪ generated ∪ browser → overlay`. Every `all*()` keeps its name; new `all*()` for the new tables. Store-side consumers: `priceCart` (stock via `editionStock()` from the sync snapshot), `buildOrder` (no more `nextOrderNumber` from max+1: browser order id `order-local-<uuid>`, number from the sequence), `/prints`, Home, work page (build-time snapshot; client islands refresh after hydration, no flash).
6. **Renumbering**: fixtures keep ids; their numbers come from the sequence. Free-text references by number (`data/settings.ts:51-52` audit lines; gift-card comments) move to `{ orderId }` and print the number at read time. Audit `target` stays `order:<number>` for new lines but is resolved through the id for fixture lines. Gift-card code `GESTE-2042-0001` derived from the order **id** sequence, not the number [me]. Fix `pastAudit` "$35" → "$25" (GS-2025 totals $25).
7. **e2e helpers** `e2e/helpers.ts`: `orderNumber(id)`, `copyLabel(copyId)`, `nextCopyNumber(editionId)`, `metric(name, period)`, all importing the same `src/` functions with the clock pinned to the e2e value. Every test asserting a computed value is rewritten to read it through a helper; **no test deleted or skipped**. The behaviour each test checks stays the same.
8. Unit tests: determinism (hash of serialized history at 3 clocks), superset rule (D6), stock invariants, `priceCart` recomputation (tolerance 0 for sim/browser; fixture mismatches listed in decisions.md), calibration (exact anchors, Sept mix ±3 %, revenue ±5 % reported), performance (cold < 400 ms, warm < 150 ms, 730-day projection) in Node **and** in Chromium (Playwright `page.evaluate` timing on `/admin`). Worker only if the browser cold run exceeds 400 ms.

### Phase 3 — Ledger and accounting, Finance tabs, exports

1. `src/lib/ledger/*`: `ledgerFromOrder` (revenue by category, gift cards to liability, shipping income, fees by card region/premium/PayPal, FX 2 %, Stripe Tax only under `collect`), `ledgerFromRefund`, `…GiftCardRedemption`, `…Breakage`, `…Shipment`, `…Payout`, `…Expense`, `…AffiliateStatement`, `…UrssafPayment`. FX: base rate + deterministic daily drift ±0.3 %.
2. VAT regime switch (`collect` default; D1 export rule; OSS only when registered; Germany line only with German buyers). `src/data/tax.ts` rates: CH → 0; `includedVatCents` unchanged signature.
3. Metrics: `finance.ts` (P&L lines of 02 §8, shares), `urssaf.ts` (quarterly default, due dates, statuses), `thresholds.ts` (5 thresholds, projected crossing date at the 90-day pace, alert at 80 %), `cash.ts` (Stripe pending/available, Friday payouts with their payments, bank balance).
4. Finance page: period picker (month / quarter / year / custom) + tabs **P&L · Taxes & URSSAF · Cash & payouts · Ledger** (the existing P&L view keeps every block; "VAT to pay back" leaves the cost lines and becomes `liability.vat` in Cash, re-labelled not removed: the P&L keeps a "VAT collected (not revenue)" memo row). P&L rows click → Ledger tab filtered.
5. Exports: ledger CSV + `FEC.txt` (18 standard columns, tab-separated), filenames from the period. Dashboard Revenue tile = Finance turnover, same range.
6. Unit tests: every Money invariant of 07.

### Phase 4 — Integrations, Outbox, logs, Settings › Integrations & Simulation

1. `registry.ts` (≈ 40 rows: id, name, category, in/out, env vars, docs URL, `needsServer`, webhook path), `mode.ts` (overlay → `NEXT_PUBLIC_INTEGRATION_<ID>` → mock; D9), `log.ts`, `outbox.ts`, `errors.ts` (`IntegrationNotConfigured`).
2. Mock adapters moved out of the code: Stripe (`pi_` ids from `checkout.ts`, refunds, balance), Boxtal (`mockTrackingNo` from `client/admin/orders.ts:35-54`, label PDF), Resend (Outbox), Mux (5 s ready), Modal (`advanceJobs` driven by the clock), Claude (canned drafts), PostHog/Plausible (sim traffic), Search Console, Sentry, Upstash (no-op), Vercel, Web push (honours push topics), social ×5, Google Calendar, Qonto, Pennylane/Indy, URSSAF (copy figures), Invoices (react-pdf), affiliate, print lab, supplies, DeepL (real `messages/*.json` coverage = 0 % today), webhooks/Zapier, Slack/Discord. Live adapters written up to the HTTP call, refusing with the missing env var.
3. Settings › Integrations: the 5 existing rows + 4 Payments & tax rows kept, each with `Switch`, status chip, "Settings" drawer (env vars, webhook URL, docs, last 20 logs), "Send test event"; the rest grouped by category; Outbox and Logs sub-views (filterable). Payments & tax gains the VAT regime switch and the business config (read-only + "confirm with your accountant"). GPU budget editable here.
4. Settings › Simulation (new tab after Integrations): seed + Regenerate, clock real/fixed, hands-off hours, "Reset my actions" (overlay **and** purchases), assumptions table. Top bar: clock chip when overridden ("Clock: Oct 2, 12:00 · reset"), Demo data chip gains "Simulated data · generated up to 14:32". Dashboard line "Mock: 34 · Live: 0".

### Phase 5 — Logic fixes (05), module by module, gate after each

1. **Orders / refunds**: single `orderTab()` (badge = tab = phone = to-do), derived order status, refund guards (paid only, ≤ paid − refunded, support ≤ $50, guide-opened rule, shipping refunded only if nothing shipped), one-transaction effects (refund, ledger, balance, revoke, copies returned + number freed, gift-card refund, Outbox, timeline, audit). Customer totals net of refunds, one function. CSV of the filtered view with the 02 money columns. `BarcodeScanner` `useCallback`.
2. **Fulfilment / editions**: state machine (05), one `shipCopies(ids)` for detail, board and bulk; label needs packed, ship needs label, certificate needs printed; back from shipped only before the carrier scan; stock from copies; lowest free number reused; certificate `C-07-S-012` (shown "N°07 · A3 · 12/100"); store/cart/checkout read the same open/stock function; sold-out auto-closes; low = `0 < left ≤ 5`.
3. **Catalog / guides / AI**: one `workChecklist()` (9 guides × 15 steps, studio test, result photo, list links) for chips, tabs, Live **and** Scheduled guards, hero picker; default hero must pass (today N°06 does not); admin-created works get their own formats/palettes/list/guides; proportion change re-maps guides; scheduled go-live by the clock; AI approve creates draft work **and** draft guide with the job's format/level/layers/orientation, no duplicate image; candidates ≤ 10; real guide version numbers.
4. **Customers / support / reviews**: first-reply median, overdue > 24 h, saved replies managed, format swap action, support address from Settings; review actions on Published/Hidden, busy reset, feature cap, hide-real-result prompt.
5. **Marketing / content**: promo codes really apply at checkout through `priceCart` (new optional `promoCode` / `giftCards` options; signature kept), FIRSTCANVAS first order only, NOEL2026 gift cards only and never below price paid; gift-card codes usable; browser cards keep recipient and send date; audiences from subscriber rows ("1,240 subscribers · 412 are customers"); newsletter scheduled in Europe/Paris.
6. **Settings / roles**: invited staff can sign in with their role and 2FA state; session timeout enforced; role-aware breadcrumbs and cross-links (`ContentPage.tsx:46`, `ReviewsPage.tsx:44`, `WorkEditor.tsx:495`); Editions readable by Content.

### Phase 6 — Every control wired (04) + crawler

Work through 04 screen by screen (shell, dashboard, orders, detail, fulfilment, editions, catalog/editor/guides incl. new `/admin/guides` index and `/admin/content/article/?id=`, AI, customers, support, reviews, analytics, finance, marketing, content, settings, alerts). Delete every "Done · demo action" toast and the fake "sent" wordings. Staff "Library row → reader preview" uses a query route (static export cannot prebuild sim entitlements) [me]. New `e2e/admin-crawl.spec.ts`: per role, every admin route, fresh state per control, click each enabled `a`/`button`, assert URL changed to an existing route, overlay changed, download started or dialog opened; fail on "demo action"; role crawl never lands on "cannot open this page" through a link; badge = tab count for Orders, Support, Reviews, AI, Editions; axe no new violations.

### Phase 7 — Readability (06) + screenshots + decisions

`src/lib/dates.ts` admin formats (Q2), units and periods on every figure, `InfoTip` with the metric's `definition` + "See the rows", named deltas with sign + word, right-aligned tabular numbers (2 decimals in tables, 0 in tiles), sticky table headers + `FilterSummary` + `EmptyState` + `MistBlock`, page header line, `Section` grouping, status = dot + word, link affordances and row `aria-label`s, phone admin to-do first. Screenshots "after" in `docs/admin-v2/screens/after/`, side-by-side check that nothing is missing. Final gate.

---

## 6. Tests added

- **Unit (Vitest)**: clock; random/calibrate; determinism + superset (3 clocks: 2026-10-02 12:00, today, 2027-03-15 18:00); orders/stock invariants; `priceCart` recompute; money invariants (ledger = P&L = URSSAF per month, margin, gift-card liability ≥ 0, Stripe balance + payouts, dashboard = finance, customer spent); funnel monotonic, Σ sources, Σ devices, completion non-increasing; calibration; performance (Node); VAT regime and export rule (no total moves); integrations mode resolution; FEC format.
- **e2e**: `admin-crawl.spec.ts`, `admin-finance.spec.ts` (tabs, exports, URSSAF mark declared/paid), `admin-integrations.spec.ts` (switch, disabled Live reason, test event → log, Outbox), `admin-simulation.spec.ts` (clock override chip, regenerate, reset my actions, reopen later same day adds orders), `sim-perf.spec.ts` (browser cold/warm), `screens.spec.ts` (tagged). Existing specs rewritten through `e2e/helpers.ts`.

---

## 7. Risks for the store, reader and export, and how I avoid them

| Risk | Mitigation |
| --- | --- |
| Store pages are built at deploy time; stock and copy numbers now move with the sim | Server pages render the build-time snapshot; client islands (cart, configurator print line, /prints counters) re-read after hydration with `useHydrated()`, no flash. The board copy is unchanged; only the numbers differ. |
| `priceCart` is synchronous, the sim may be async (IndexedDB, Worker) | Sync stock snapshot in localStorage (`geste.simmeta.v1`) + build-time fallback; the cart never waits. |
| Bundle size on store pages | `@/sim` loaded with dynamic `import()` only where needed (account orders, success, tracking, cart stock refresh); store build-time path imports it on the server only. Admin bundle size measured each phase. |
| Hydration mismatches from `simNow()` on the server vs the client | Server render uses the build clock; any time-dependent text in client components renders after hydration. |
| Order numbers change on store pages (Library licence, account orders, tracking, success URL) | Numbers of past orders are stable at a given clock (D7); tests go through `orderNumber(id)`. The success URL keeps `?order=<number>` and also accepts the id. |
| e2e accidentally run on a production build (real clock) | `out/.sim-now` marker check in Playwright `globalSetup`. |
| Determinism across engines (`Math.log`/`exp`) | No trig; generation uses integer PRNG + `Math.log` only; tests run in Node V8 and Chromium V8. Same engine family in production browsers is not guaranteed bit-exact, so the cache key includes the code version and a cache from another engine simply rebuilds. |
| VAT change touches checkout | Rates only change the included part; totals untouched (test asserting every fixture total and a Swiss checkout total). |
| Promo codes and gift cards at checkout change store behaviour | Behind `priceCart` options; checkout e2e unchanged when no code is typed; new checkout tests for codes. |
| PWA offline reader | Sim is not imported by the reader; `/learn` keeps reading entitlements through `@/lib/api` (fixtures + browser rows), offline test unchanged. |
| localStorage blocked (private window) | Sim works from memory; IndexedDB failure → in-memory rebuild each visit (cold budget). |

---

## 8. Conflicts between the spec and the code / boards

1. **Edition `SOLD` constants vs calibration** → Q1 (a): pre-launch copies.
2. **Display time zone** → Q2 (a): admin Paris, store and reader UTC.
3. **Board numbers** (GS-2041 on AdminDashboard, AdminOrders, Account; Home "Edition 12/50"; "Today · Oct 2", "$5,278 · +38 % vs Aug", "Alerts, 6 unread") stop matching the boards once computed. The spec wins (Lucas's own pack); logged in decisions.md with the board names.
4. **Dashboard "Revenue"**: the board says VAT included in USD; spec 02 says EUR excl. VAT. Tile label becomes "€… excl. VAT · <period>" (re-label allowed by 06). The currency switch (EUR HT / USD) only affects store-side figures.
5. **"VAT to pay back"** row (decision 2026-09-29, Admin analytics/finance) leaves the cost lines (05); it stays visible as a memo row so nothing is removed.
6. **Storage key** `geste.sim.v1` in IndexedDB rather than localStorage (D4).
7. **Hands-off vs "the past never changes"** (D6).
8. **Not in 05, found while auditing**: entitlement ids `local-<guideId>` collide between two browser buyers of the same guide. They are kept, because the reader's static params depend on them. The collision is documented, and the merge keys browser entitlements by `(userId, guideId)`. `pastAudit` "$35" should read "$25". The `aiToReview` fallback of 5 is dead code. Customer country is already read from the address, so that 05 item is already done.
9. **`/learn` static params** cannot include generated entitlements, so the staff reader preview needs a query route (Phase 6).

---

## 9. September check (reported at the end of every phase)

Orders (paid, Paris month), visits, conversion, store receipts in USD (charged, VAT incl.) and turnover in EUR excl. VAT, guides/prints/gift-card shares, level mix, devices, sources, top 5 works. Phase 1 reports today's constants (187 · 6,680 · 2.8 % · $5,278 incl. affiliate / $4,960 store).
