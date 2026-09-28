# CLAUDE.md — how to build Geste

You are building **Geste** (geste.studio): a store that sells step-by-step guides to paint abstract gestural works, numbered art prints, and gift cards; a guide reader installed as a PWA; and an admin back-office. The design is final and validated. Your job is to build exactly what is drawn, not to redesign it.

## Sources of truth (in this order)

1. **Canvas boards** — `reference/canvas/*.dc.html` (open them in a browser, or read the markup for exact values). The live canvas is the Design artifact Lucas shares with you.
2. **Docs** — `docs/` (architecture, tokens, components, states, motion, routes, data model, screens).
3. **Code in this kit** — `tokens/`, `src/components/`, `src/lib/`, `supabase/`.

If two sources disagree, follow the higher one and write the conflict in `docs/decisions.md`. Never guess silently.

## Stack (fixed)

- Next.js 16 (App Router, TypeScript strict, React Server Components), deployed on Vercel.
- Tailwind CSS 4 with `tokens/theme.css` (spacing unit = 1 px: `p-12` is 12 px, `gap-24` is 24 px).
- Radix primitives for dialogs, tabs, accordion, popover, menu, tooltip. No other UI library.
- Supabase: Postgres + RLS, Auth (passkey, email OTP, password; TOTP for staff), Storage (private buckets).
- Stripe: Payment Element + Express Checkout Element, Stripe Tax, webhooks.
- Resend + React Email. Mux for step videos. Boxtal for shipping labels. PostHog + Plausible. Sentry.

## Rules

- **Tokens only.** No raw hex, px font sizes or ad-hoc shadows in components or pages. Paint colours in guide content are data, not UI. If a value is missing, add a token in `tokens/tokens.json` first and regenerate the CSS.
- **Components first.** Pages compose `@/components`. If a screen needs something new, create a component in the right layer, add it to `src/app/(dev)/kit/page.tsx` in every state, then use it.
- **One font:** JetBrains Mono 400/500 via `next/font`. 12 px / 20 px is the default everywhere. Sentence case, no uppercase labels, no italic.
- **Sharp corners.** Radius 0 except chart bar ends (3 px) and status dots.
- **States:** every interactive element implements default, hover, focus-visible, active/selected, disabled, error, loading as described in `docs/states.md`. Focus is always visible.
- **Motion:** only the timings in `src/lib/motion.ts`. Nothing loops or bounces. Respect `prefers-reduced-motion`.
- **Prices are computed on the server** with `src/lib/pricing.ts`; the client value is display only.
- **Security:** RLS on every table (already written). The service-role key is used only in route handlers and server actions that need it (webhooks, checkout), never in the browser. Every admin mutation writes `audit_log`.
- **Accessibility:** WCAG 2.2 AA. 44 px targets (48 px primary buttons). Status never by colour alone. Every icon-only control has `aria-label`.
- **Copy:** use the exact words on the boards. English first; French lives under `/fr` (translation files in `messages/`).
- **Artworks:** the 15 mock images from the canvas are in `public/mock/work-01.jpg … work-15.jpg`. Use them everywhere a work image is needed (seed, fixtures, /kit); they are swapped through the admin, not in code.

## Workflow for each task

1. Read the screen spec in `docs/screens/` and open its board(s) in `reference/canvas/`.
2. List the components and data it needs; build missing components first.
3. Build the route with server components by default; client components only where there is state or interaction.
4. Handle empty, loading, error, signed-out and (reader) offline states.
5. Add analytics events listed in the spec.
6. Test: `npm run typecheck`, `npm run lint`, Playwright test for the main flow, axe check. Screenshot at 1440×900 and 390×844 and compare to the board.
7. Tick the acceptance criteria in the spec. Commit with a message naming the route.

## Commands

```bash
npm run dev              # local app on :3000, style guide at /kit
npm run typecheck
npm run lint
npm run test:e2e         # Playwright
supabase start           # local Supabase (Docker)
supabase db reset        # applies migrations + seed.sql
psql "$DATABASE_URL" -f supabase/tests/rls_test.sql   # must print "all RLS and business tests passed"
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Build order

Follow `docs/build-plan.md`: foundations → store & checkout for guides → guide reader → admin core (launch) → prints & growth → AI pipeline & French. Each phase ends with a gate that must pass on the production URL.
