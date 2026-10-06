# 07 · Phases, gates and invariants

## Phase gates (each phase ends only when all pass)

`npm run typecheck` · `npm run lint` · `npm run build` (static export) · `npm run test:e2e` · new unit tests (`npm run test:unit`, add Vitest if absent, dev dependency only) · screenshots compared · `docs/decisions.md` updated with every choice made.

## Invariants (unit tests on the generated data, at 3 clock values: Oct 2 2026 12:00, today, Mar 15 2027 18:00)

Determinism
- Same seed + same clock → identical serialized history (hash equality).
- Clock later the same day → superset of earlier rows; no past row changed.

Orders and stock
- Order numbers strictly increase with `paidAt`; no duplicate.
- For every edition: sold + reserved + left = edition size; no copy number used twice by active copies; copy numbers follow payment order.
- No print sold when left was 0; no sale of a closed edition.
- Every generated or browser order total = `priceCart` of its lines (recomputed) — tolerance 0. Fixture orders that do not match are listed in `docs/decisions.md`, not edited.

Money
- Σ ledger revenue lines of a month = P&L turnover = URSSAF turnover of that month (EUR cents, exact).
- Gross margin = turnover − direct costs; result = gross margin − overheads − contributions.
- Gift-card liability = Σ sold − Σ redeemed − Σ breakage ≥ 0, per card and in total.
- Stripe balance + payouts = Σ payments net of fees − refunds (per day).
- Dashboard revenue (range) = Finance revenue (same range) = Σ order-derived ledger lines.
- Customer spent (net) summed over customers = Σ paid orders − refunds.

Funnel and analytics
- visits ≥ viewed ≥ cart ≥ checkout ≥ paid, each day.
- Σ sources = paid orders; Σ devices = 100 %; level mix from order items.
- Completion curve non-increasing by step.

Calibration
- July/Aug/Sept paid orders = 108 / 133 / 187 exactly; Sept visits 6,680 ± 1 %; Sept conversion 2.8 % ± 0.1 pt; Sept mix within ± 3 % of 01 §3.

UI
- Every `<a>` and `<button>` on every admin route has an effect: e2e crawler visits each admin route as owner, clicks each enabled control in a fresh state, and asserts one of: URL changed to an existing route, overlay changed, a download started, a dialog opened. Fails on any "demo action" toast.
- Badge = tab count for Orders, Support, Reviews, AI, Editions.
- axe: no new violations.
- Role crawl: content / support / fulfilment never land on "cannot open this page" through a link.

## Order of work (the prompt follows it)

0. Read & plan — no code.
1. Clock + metrics layer skeleton; screens switched to metrics with today's constants as temporary source (no visual change). Gate.
2. Simulation engine + calibration + merge into `local.ts`; order renumbering with id references; e2e helper. Gate.
3. Ledger + accounting (EUR excl. VAT, URSSAF, thresholds, cash, payouts) + Finance tabs. Gate.
4. Integrations registry + adapters (mock complete, live stubs) + Settings › Integrations & Simulation + Outbox + logs. Gate.
5. Logic fixes (05) module by module: orders/refunds → fulfilment/editions → catalog/guides/AI → customers/support/reviews → marketing/content → settings/roles. Gate after each module.
6. Every control wired (04) + crawler test. Gate.
7. Readability pass (06) + screenshots + decisions log. Final gate.
