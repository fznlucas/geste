# Geste — developer handoff kit

Everything needed to build geste.studio exactly as designed: store, guide reader (PWA) and admin, on Next.js 16 + Supabase + Stripe.

**Start here:** read `CLAUDE.md`, then `docs/architecture.md`, then follow `docs/build-plan.md` prompt by prompt.

## What's inside

| Path | Content | Status |
| --- | --- | --- |
| `CLAUDE.md` | Rules and workflow for Claude Code (or any developer) | ready |
| `tokens/` | `tokens.json` (source, W3C format), `tokens.css`, `theme.css` (Tailwind 4), `tailwind.preset.ts` (Tailwind 3) | ready |
| `src/components/` | 52 component files (≈ 60 exports) in 7 layers: brand, primitives, overlay, layout, commerce, reader, admin | **type-checked and rendered** |
| `src/lib/` | `motion.ts` (all timings), `pricing.ts` (the one pricing function, server + client), `format.ts`, `types.ts`, `cn.ts` | ready |
| `src/app/` | root layout (font, metadata), `globals.css`, `(dev)/kit` living style guide showing every component in every state | builds with `next build` |
| `supabase/migrations/0001_init.sql` | 33 tables, enums, RLS policies (57), functions (print numbering, credits), admin views | **applied and tested on Postgres 16** |
| `supabase/seed.sql` | N°03 with its 60×80 intermediate guide (3 layers, 15 steps, diagram), 4 palettes, shopping list, A3 edition | tested |
| `supabase/tests/rls_test.sql` | Behaviour tests: RLS isolation, refund limits, print numbering and sold-out, print credits | passing |
| `docs/` | architecture, tokens, components (props), states, motion, routes, data model, payments & security, admin, accessibility/SEO/analytics, copy & emails, build plan (prompts), decisions, launch checklist | ready |
| `docs/screens/` | Specs per screen with acceptance criteria | ready |
| `reference/canvas/` | The 125 validated boards + static viewer | snapshot |
| `reference/copy/` | Exact visible text of every board | extracted |
| `public/mock/` | The 15 mock artworks used on the canvas (work-01 … work-15.jpg) | mock |
| `.env.example` | Every environment variable | ready |

## Quick start

```bash
npm install
cp .env.example .env.local        # fill Supabase + Stripe test keys
supabase start && supabase db reset
npm run dev                        # http://localhost:3000/kit
```

## Verified before handoff

- `tsc --noEmit` strict: 0 errors across all components and the kit page.
- `next build` (Next 16.3.6, Tailwind 4): builds; `/kit` rendered in Chromium and checked against the canvas.
- Migration + seed + `rls_test.sql` on PostgreSQL 16 with a Supabase auth stub (`supabase/tests/local_supabase_stub.sql`): "all RLS and business tests passed".
