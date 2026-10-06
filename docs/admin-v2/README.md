# Admin v2 — full information system on simulated data

Spec pack for the admin overhaul. Drop this folder at `docs/admin-v2/` in the repo. The prompt in `PROMPT-CLAUDE-CODE.md` tells Claude Code to build it phase by phase.

## What changes, in one paragraph

The admin stops reading frozen numbers. A deterministic **simulation engine** generates the whole business, day by day, from launch (2026-07-01) up to **today's real date and hour**, every time the admin opens. Every screen reads the same rows and the same metric functions, so one order shows the same amount on the dashboard, the orders list, the customer, the P&L, the URSSAF declaration and the payout. Each external service sits behind an **adapter with a Mock / Live switch**, and every button and link does something real on the mock data.

## Non-negotiables

1. **Nothing is removed from the UI.** No screen, block, button, tab, column or copy line disappears. Things may be added, rewired, re-labelled for clarity or computed instead of hard-coded.
2. **The design system stays as is.** Use only the existing tokens, components and states (`CLAUDE.md`, `docs/tokens.md`, `docs/states.md`). New UI is built from existing components first; a truly new one goes into the right layer and `/kit`.
3. **Nothing breaks.** The store, the reader, checkout and the static export (`output: "export"`, GitHub Pages) keep working. `npm run typecheck`, `npm run lint`, `npm run build` and `npm run test:e2e` pass at the end of every phase. If a test asserts a hard-coded number that is now computed, the test is updated to read the value from the same function, never deleted.
4. **One source per number.** No screen computes its own KPI. Every figure comes from `src/lib/metrics/*`, which reads rows from `@/lib/api`. If two screens show the same concept, they call the same function with the same period.
5. **Deterministic.** Same seed + same date-time gives exactly the same data, on every machine. Reopening the admin later the same day adds the orders placed since, never changes the past.
6. **Mock today, live tomorrow.** Every external I/O goes through an adapter interface. The mock adapter is complete; the live adapter is written as far as possible without secrets and refuses clearly ("Needs server · set X") until configured.

## Files

| File | Holds |
| --- | --- |
| `01-clock-and-simulation.md` | The clock, the generator, calibration on today's figures, the day pipeline, how fixtures and the browser overlay merge |
| `02-ledger-and-accounting.md` | Micro-entreprise in EUR excluding VAT: revenue categories, gift-card liability, refunds, FX, fees, costs, URSSAF, ceilings, VAT regime switch, payouts, cash |
| `03-integrations.md` | The registry, the Mock / Live switch, every integration with its inputs, outputs, env vars and mock behaviour |
| `04-actions-and-links.md` | Every button, link, tab and row of every admin screen: what it does now (mock) and later (live) |
| `05-logic-fixes.md` | The audit: inconsistencies, illogical workflows and dead ends found in the code, with file references and the fix |
| `06-readability.md` | How to make the screens easier to read without removing anything |
| `07-acceptance.md` | Phase gates, invariants to test, the reconciliation checks |

## Words used in these files

- **Fixture rows**: the hand-written rows in `src/data/*` (14 customers, orders GS-2025 → GS-2041, reviews, threads…). They stay, unchanged, and are part of history.
- **Generated rows**: rows the simulation creates (`src/sim/*`). Same shapes as `src/data/types.ts`.
- **Overlay**: what the admin or the browser checkout changed (`geste.admin.v2`, `geste.purchases.v2`). Always wins over generated rows.
- **Sim now**: the clock value (`src/lib/clock.ts`), real time by default.
