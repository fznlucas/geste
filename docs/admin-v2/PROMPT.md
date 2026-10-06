# Prompt for Claude Code — Admin v2

Put the `docs/admin-v2/` folder in the repo first, then paste everything below the line into Claude Code at the root of the `geste` repo.

---

You are working on the `geste` repo (Next.js 16 static export, mock phase). Read `CLAUDE.md`, `docs/mock-plan.md`, `docs/admin.md`, `docs/decisions.md`, then **all of `docs/admin-v2/`** (README first). This is an overhaul of the admin back-office into a complete information system running on simulated data. The spec in `docs/admin-v2/` is the source of truth for this work; `CLAUDE.md` rules (tokens only, components first, states, motion, accessibility, copy) still apply to everything you build.

## Goal

1. A deterministic simulation generates the whole business from launch (2026-07-01) up to the real current date and hour, every time the admin opens, calibrated on the figures the admin shows today (`01-clock-and-simulation.md`).
2. Every number on every admin screen is computed from the same rows through one metrics layer, and they all reconcile: orders, stock, customers, analytics, finance in EUR excluding VAT for a French micro-entreprise, URSSAF, payouts, cash (`02-ledger-and-accounting.md`).
3. Every external input/output sits behind an adapter with a Mock / Live switch; mock is complete, live is written as far as possible and refuses clearly without config (`03-integrations.md`).
4. Every button, link, tab and row does something real (`04-actions-and-links.md`), the workflows make sense (`05-logic-fixes.md`), and the screens are easier to read (`06-readability.md`).

## Hard rules

- **Do not remove anything from the UI** (screens, blocks, buttons, tabs, columns, copy) and **do not change the design system**. Add, rewire, compute, clarify.
- **Do not break anything**: store, checkout, reader, PWA, static export, existing tests. Run `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:e2e` at the end of every phase; all green before moving on. If a test asserts a hard-coded value that becomes computed, change the test to read the value through the same function or helper; never delete or skip a test.
- Pages import only `@/lib/api`, `@/lib/client`, `@/lib/metrics`; never `@/data` or `@/sim` directly. Keep every existing `@/lib/api` signature.
- No KPI computed inside a page. One function per concept in `src/lib/metrics/`.
- Deterministic generation (seeded per day), Europe/Paris business days, cut at `simNow()`.
- No secrets in `NEXT_PUBLIC_*`. Live adapters that need a server stay disabled with the reason until a backend URL exists.
- Every admin mutation: role check inside the action, state guard, overlay write, audit line, integration log if it touches a vendor, Outbox entry if it "sends" an email.
- Values that are business or legal assumptions (rates, thresholds, fees, costs) live in config with a source comment and are flagged "confirm" in the UI. Do not invent other legal rules; if something is unclear, write it in `docs/decisions.md` and pick the conservative option.
- Small, reviewable commits, one per sub-step, message naming the module. Never force-push, never rewrite history.

## How to work

**Phase 0 — read and plan, no code.** Read the spec and the code it cites (line numbers may have drifted: re-find each spot). Then write `docs/admin-v2/PLAN.md`: the file-by-file list of changes per phase, the new files, the data shapes you will add to `src/data/types.ts`, the tests you will add, risks for the store and how you avoid them, and any conflict between the spec and the code. Stop and show me the plan summary before Phase 1.

Then follow the phase order in `07-acceptance.md`:

1. Clock + metrics skeleton (no visual change).
2. Simulation engine, calibration, merge, order renumbering with id references, e2e helper `orderNumber(id)`, `NEXT_PUBLIC_SIM_NOW` set for the e2e build (`build:e2e` script, Playwright serves `out/`).
3. Ledger and accounting, Finance tabs (P&L · Taxes & URSSAF · Cash & payouts · Ledger), exports CSV + FEC.
4. Integrations registry, adapters, Settings › Integrations (switches, status, settings drawer, test event, logs), Outbox, Settings › Simulation.
5. Logic fixes from `05`, module by module, gate after each module.
6. Wire every control from `04`; add the e2e crawler that clicks every enabled control on every admin route for each role and fails on dead controls or "demo action" toasts.
7. Readability pass from `06`; screenshots of every admin route at 1440×900 and 390×844 before/after saved under `docs/admin-v2/screens/`; nothing missing.

At the end of each phase, give me a short report: what changed, tests run and their result, the numbers of the September check (orders, visits, conversion, revenue in USD and EUR excl. VAT), anything you decided alone (also in `docs/decisions.md`), and what is next.

## Definition of done

All invariants in `07-acceptance.md` are unit-tested and pass at three clock values; the crawler passes for the four roles; the store and reader e2e tests pass unchanged in behaviour; opening the admin tomorrow shows tomorrow's orders without any code change; switching an integration to Live without config shows the reason instead of failing silently.
