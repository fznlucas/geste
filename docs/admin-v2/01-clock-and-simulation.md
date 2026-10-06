# 01 · Clock and simulation engine

## 1. The clock — `src/lib/clock.ts`

One function decides what "now" is for the whole app (store, reader, admin):

```ts
export function simNow(): Date            // real Date.now() by default
export function simToday(): string        // "YYYY-MM-DD" in Europe/Paris
export function startOfDayParis(d: string): Date
```

Override order (first that is set wins):
1. `?simNow=2026-10-02T12:00:00Z` in the URL. It is kept in `sessionStorage` (`geste.simnow.v1`) for the tab, and shown in the top bar as a "Clock: Oct 2, 12:00 · reset" chip so it is never forgotten.
2. `NEXT_PUBLIC_SIM_NOW` at build time. Playwright serves the built `out/` folder (`scripts/serve-out.mjs`), so the e2e build must be made with `NEXT_PUBLIC_SIM_NOW=2026-10-02T12:00:00Z` (add an `build:e2e` script and use it in the Playwright `webServer`/CI) so tests are stable. The production build leaves it unset.
3. Real time.

Replace every use of `MOCK_NOW`, `adminNow()`, `orderTime()`, every literal "2026-10-02", "September", "Oct 5" and every `slice(-90)` on fixed arrays with `simNow()`/`simToday()`. The agents' audit found these spots: `src/data/customers.ts:8`, `src/lib/client/admin.ts:80-81`, `src/lib/client/purchases.ts:72`, `src/lib/client/admin/catalog.ts:137`, `src/lib/api/marketing.ts:34`, `src/app/(admin)/admin/(console)/support/SupportPage.tsx:26`, `src/lib/api/dashboard.ts:80-89,116`, `src/lib/api/insights.ts:92`, `src/data/dashboard.ts:71`, `WorkEditor.tsx:68,157`, `MarketingPage.tsx:292`, `FinancePage.tsx:42`. Grep again to find the rest.

`MOCK_NOW` stays exported (some store code may import it) but becomes `simNow().toISOString()` read at call time. Remove nothing that imports it.

Time zone: business days are **Europe/Paris** days (orders, URSSAF, payouts). Store timestamps stay ISO UTC.

## 2. The generator — `src/sim/`

```
src/sim/
  config.ts        every assumption, commented, in one place (see §6)
  random.ts        mulberry32 PRNG + helpers (poisson, lognormal, weighted pick), seeded per day
  calendar.ts      weekday factors, holidays, social posts, campaigns
  names.ts         first/last name pools FR, BE, CH, DE, US, UK; cities with postcodes
  day.ts           generateDay(date, state) → DayRows
  history.ts       buildHistory(until: Date) → all rows, memoised
  index.ts         getSimRows(): the merged, cached result for simNow()
```

### Determinism

- `seed = hash(SIM_SEED + date)`. `SIM_SEED` sits in `config.ts` ("geste-2026") and can be changed in Settings › Simulation to get another "parallel universe".
- A day is generated in full (00:00 → 24:00 Paris), then **cut at `simNow()`**: rows with a timestamp later than now are not returned yet. Coming back at 18:00 shows the orders placed between 12:00 and 18:00. The past never changes.
- Days are generated in order because they depend on state: customers, stock left in editions, gift-card balances, open support threads, reader progress. `history.ts` walks from `LAUNCH_DATE` to today and memoises per day, in memory, plus a `localStorage` cache `geste.sim.v1` keyed by `seed + lastFullDay` so a reopen is instant. If the cache is invalid or missing, rebuild (≈ 100–500 days, must stay under 150 ms; measure it).
- Rebuild also on `visibilitychange` when the tab comes back after more than 5 minutes, so an admin left open still moves forward.

### Merge order (read path)

`src/lib/api/local.ts` today merges fixtures + browser purchases + admin overlay. It becomes:

```
fixtures (src/data)  ∪  generated (src/sim)  ∪  browser purchases  →  then admin overlay patches/inserts
```

- Fixtures win over generated rows for the same id. The generator never creates a row with a fixture id.
- The admin overlay always wins: if Lucas ships an order, the simulation does not move it again.
- Every `@/lib/api` read function keeps its signature. Pages do not change their imports.

### Order numbers

One chronological sequence over all orders (fixtures, generated, browser), starting at `GS-1001` on launch day. Fixture orders keep their **ids** (`ord-2038`…) and their content, but their **number** is assigned by the sequence, so numbers always grow with time.
- Anything in fixtures that refers to an order by number (audit lines "#GS-2025", support links, the gift-card comment) is changed to refer by **id** and print the number at read time.
- e2e tests that use a number go through a helper `orderNumber("ord-2038")` exported from `e2e/helpers.ts`, which reads the same function. Tests are updated, never deleted.

Copy numbers of print editions and certificate numbers follow the same rule: assigned in payment order across fixtures and generated rows (see 05 › Editions).

## 3. Calibration on today's figures

The admin today shows these figures (src/data/dashboard.ts, insights.ts). They become **anchors** for the past months, so the simulated history looks like what Lucas already knows:

| Month | Paid orders | Visits | Conversion |
| --- | --- | --- | --- |
| July 2026 | 108 | ≈ 5,400 | 2.0 % |
| August 2026 | 133 | ≈ 6,045 | 2.2 % |
| September 2026 | 187 | 6,680 | 2.8 % |

- For an anchored month, the generator draws the daily shape (weekday factors, noise, social spikes) then rescales to the anchor total with largest-remainder rounding. Fixture orders in that month count toward the anchor.
- The September mix must land close to today's boards: guides ≈ 55 % of store sales, prints ≈ 30 %, gift cards ≈ 8 %. Level mix 58 / 31 / 11 %. Devices phone 71 / desktop 24 / tablet 5 %. Sources TikTok 49 %, Instagram 22 %, Direct 14 %, Google 9 %, Newsletter 6 %. Top works in order N°03, N°01, N°07, N°02, N°05. Tune the weights in `config.ts` until the Sept figures are within ±3 % (write a test that asserts it).
- Revenue is **not** forced: it is whatever the generated baskets cost through `src/lib/pricing.ts`. That is the point: it is consistent with the prices. Check that September store receipts land within ±5 % of $4,960 (the old $5,278 minus the $318 affiliate line, which was not a store sale).

From October 1 onward there is no anchor: the trend continues.

| Driver | Default (config.ts) |
| --- | --- |
| Base daily orders | September's daily average |
| Monthly growth | +12 % in Oct, then −1 pt per month, floor +3 % |
| Weekday factors (Mon→Sun) | 0.90, 0.95, 1.00, 1.00, 1.05, 1.15, 1.20 |
| Hour-of-day curve | low 01–07, peaks 12–14 and 20–23 (phone evenings) |
| Noise | lognormal σ = 0.18 per day |
| Social post day | ×1.6 that day, ×1.25 the next, ×1.1 the day after; source shifts to TikTok |
| Newsletter send | ×1.3 on send day, source shifts to Newsletter |
| Black Friday week | ×1.5, promo code usage ×3 |
| Dec 1–22 | ×1.4 with gift cards ×4 |
| Dec 24 – Jan 2 | ×0.7 |
| January | ×0.85; summer July–August ×0.95 from 2027 |

## 4. The day pipeline — `generateDay(date, state)`

Each step reads the previous one. Every row has the exact shape of `src/data/types.ts` (or a new type added there, mirrored in `supabase/migrations` as a comment if the table does not exist yet).

1. **Traffic** — visits by source and device; sessions (PostHog-shaped events `pageview`, `view_work`).
2. **Funnel** — views → `add_to_cart` → `begin_checkout` → `purchase`, with rates from config, calibrated to the anchors (view→cart ≈ 11.8 % is the known leak).
3. **Customers** — new buyer or returning (24 % of first-time buyers buy again within 60 days). New customers get a name, email, address and locale from `names.ts` and a country from the mix (FR 74 %, BE 9 %, CH 8 %, DE 2 %, US 4 %, UK 2 %, other EU 1 %). Newsletter opt-in 38 %.
4. **Baskets** — lines built only with real catalog objects: live works, their formats (`formatsOf`), level (by mix, `resolveLevel`), palette, print editions with stock left, gift-card presets. Bundle discount, signature surcharge and promo codes go through `priceCart` exactly like checkout. A print can only be sold if `left > 0`; a sold-out edition is skipped.
5. **Payment** — method (card 82 %, Apple/Google Pay 12 %, PayPal 6 %), card region (EEA / UK / international from the country), 3-D Secure (31 %), risk (low 96 %, medium 3.5 %, high 0.5 %), rare declines (2.5 % of attempts, logged as failed payments, not orders).
6. **Post-payment effects** — exactly what the Stripe webhook will do: entitlements for guides, `assign_print_copy` for prints in payment order, gift-card rows (liability), receipt email event, analytics `purchase`.
7. **Fulfilment** — each print copy moves by lags drawn from config: to_print → printed & signed (+1 working day) → packed (+0–1) → label created → shipped (+0–1, working days, pickup 16:00) → in transit → delivered (+1–4 by zone). See §5 for what stays waiting for Lucas.
8. **Reader** — guide opened (70 % same day, 92 % within 7 days), step progress following the completion curve (N°03 today: 100, 84 at 2a, 71, 61 % finished), drying timers, `guide_step_viewed` / `guide_completed` events, prints of the PDF (prints_left).
9. **Shopping-list clicks** — 46 % of guide buyers open the list, 63 % of them click a partner link; partner conversion 22 %; commission 6–8 % of the basket; commission becomes "confirmed" after 30 days and "paid" on the partner's monthly date (affiliate ledger, 02 §4).
10. **Support** — threads at 6 % of orders (topics: where is my print, format swap, access, refund, invoice), plus 1 % pre-sale questions. Replies, statuses.
11. **Reviews** — 18 % of finishers leave a review 2–10 days after finishing, 60 % with a result photo, stars mostly 4–5.
12. **Refunds** — 1.8 % of orders, 3–14 days later: guide not opened (withdrawal allowed), print damaged (re-ship or refund), sold-out race. Restock rules from 05.
13. **Marketing** — promo code use per code rules (FIRSTCANVAS first order only, TIKTOK10 when source = TikTok), newsletter sends on the calendar, subscriber growth and unsubscribes, open/click rates.
14. **AI pipeline** — jobs Lucas would have launched (≈ 2 per week), GPU cost per job from `aiJobCostCents`, candidates, verdicts.
15. **Costs & money** — print production, packaging, labels, payment fees, FX, subscriptions on their billing day, studio materials when a new work goes live, ads if any; Stripe balance and weekly payouts; URSSAF declarations and payments (02).

## 5. What the simulation leaves for Lucas

The point is to manage the business, so the simulation does not do Lucas's job for recent days:

- Anything created in the last **48 hours** (config `HANDS_OFF_HOURS`) that needs a human stays open: prints to pack and ship, support threads, reviews to moderate, AI candidates to validate, refund requests. That is today's to-do list.
- Older items are resolved by the simulation as Lucas "would have", with a realistic outcome, and written to the audit log with actor "Lucas · simulated" (a distinct actor so real clicks stay distinguishable).
- When Lucas acts in the admin, his action is written in the overlay and the simulation never touches that row again.
- A print waiting more than 3 working days raises an alert (late shipment), a thread waiting more than 24 h raises "reply overdue". These alerts are real consequences, not decorations.

## 6. `config.ts` — every assumption in one file

Group by: launch & seed, anchors, growth & seasonality, calendar (social posts, newsletter sends, campaigns), traffic & funnel, customers & countries, basket mix, payment mix, fulfilment lags, reader curve, affiliate, support, reviews, refunds, AI, costs (02 §6), FX, URSSAF & tax (02). Each value has a one-line comment saying where it comes from ("board", "Stripe pricing page FR", "estimate — confirm"). Settings › Simulation shows them read-only, with the seed and the hands-off hours editable (overlay).

## 7. Settings › Simulation (new tab, added after Integrations)

- Seed (text) and "Regenerate" (changes the seed, clears `geste.sim.v1`, keeps the overlay).
- Clock: real time / fixed date-time (writes the session override of §1).
- Hands-off hours (default 48).
- "Reset my actions" (clears the overlay and purchases: fixes the current reset that forgets purchases, `AdminPage.tsx:93`).
- A read-only table of the main assumptions from `config.ts`.
- The "Demo data" chip in the top bar keeps its role switch and gains a line "Simulated data · generated up to 14:32".
