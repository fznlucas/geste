# Architecture

One Next.js 16 app on Vercel serves three surfaces — the store, the guide reader (installable PWA) and the admin — from route groups of the same codebase. Supabase holds data, auth and files; Stripe holds money. There is no separate backend: Server Actions and Route Handlers are the API.

```
Browser (store) ─┐
PWA (reader)  ───┼──► Next.js on Vercel ──► Supabase (Postgres + RLS, Auth, Storage)
Admin         ───┘        │   │   │   │
                          │   │   │   └──► Boxtal (labels, tracking)  ◄── webhook
                          │   │   └──────► Mux (step videos, signed playback) ◄── webhook
                          │   └──────────► Resend (emails, inbound support)
                          └──────────────► Stripe (payments, tax, refunds) ◄── webhook
GPU worker (Modal, Python) ◄── polls ai_jobs ──► writes ai_candidates + images to Storage
```

## Repository layout

```
.
├── CLAUDE.md                     instructions for Claude Code
├── tokens/                       tokens.json (source) → tokens.css, theme.css (Tailwind 4), tailwind.preset.ts (v3)
├── src/
│   ├── app/
│   │   ├── layout.tsx            font, globals, metadata
│   │   ├── globals.css
│   │   ├── (store)/              public site: /, /shop, /works/[slug], /prints, /checkout, /journal…
│   │   │   ├── layout.tsx        SiteHeader / MobileHeader, SiteFooter, CartDrawer, ToastProvider
│   │   │   └── account/          /login, /register, /account, /account/orders, /account/settings
│   │   ├── (reader)/learn/       /learn/[guideId] — no site chrome, PWA scope
│   │   ├── (admin)/admin/        /admin/** — AdminShell, staff middleware
│   │   ├── (dev)/kit/            living style guide (all components, all states)
│   │   ├── api/
│   │   │   ├── webhooks/stripe/route.ts
│   │   │   ├── webhooks/boxtal/route.ts
│   │   │   ├── webhooks/mux/route.ts
│   │   │   ├── guides/[id]/pdf/route.ts
│   │   │   └── cron/[job]/route.ts
│   │   ├── manifest.ts           PWA manifest (scope /learn)
│   │   ├── sitemap.ts, robots.ts, opengraph-image.tsx, icon.png
│   ├── components/               brand, primitives, overlay, layout, commerce, reader, admin (this kit)
│   ├── lib/
│   │   ├── cn.ts, format.ts, motion.ts, pricing.ts, types.ts   (this kit)
│   │   ├── supabase/server.ts    createServerClient (cookies)
│   │   ├── supabase/admin.ts     service-role client — import only in server files
│   │   ├── stripe.ts, email.ts, mux.ts, boxtal.ts, posthog.ts
│   │   └── auth.ts               getSession, requireUser, requireStaff(role)
│   ├── actions/                  server actions grouped by domain (cart.ts, checkout.ts, reader.ts, admin/*.ts)
│   └── emails/                   React Email templates (receipt, access link, shipped, gift card, OTP)
├── messages/en.json, fr.json     UI strings (next-intl)
├── public/mock/                  the 15 mock artworks (work-01 … work-15.jpg)
├── supabase/
│   ├── migrations/0001_init.sql  33 tables, RLS, functions, views
│   ├── seed.sql                  N°03 with its guide, palettes, list, edition
│   └── tests/rls_test.sql        behaviour tests (RLS, print numbering, credits)
├── worker/                       Python AI pipeline (Modal) — phase 5
└── tests/e2e/                    Playwright
```

## Rendering strategy

| Surface | Strategy | Why |
| --- | --- | --- |
| Home, shop, work pages, journal, method, about, legal | Static with ISR (revalidate 1 h + on-demand `revalidateTag('works')` from admin) | Speed and SEO |
| Print pages | Dynamic segment for stock only (`<Suspense>` around `EditionCounter`) | Stock must be live |
| Cart | Client state, persisted in a signed cookie; merged into `carts` at login | Works for guests |
| Checkout | Dynamic, server actions | Prices and tax computed on the server |
| Account, reader | Dynamic, auth required | Private data |
| Admin | Dynamic, staff required, `noindex` | Private |

## Auth and middleware

- `middleware.ts` refreshes the Supabase session cookie on every request.
- `/account/**` and `/learn/**` redirect to `/login?next=` when signed out.
- `/admin/**` requires a `staff_roles` row **and** an AAL2 session (TOTP verified); otherwise redirect to `/admin/login`.
- Role checks run twice: in the page (`requireStaff('support')`) to hide UI, and in the database (RLS `has_role`) to enforce.
- Guest checkout creates the user with `auth.admin.createUser({ email, email_confirm: true })` in the webhook and emails a magic link.

## PWA (reader)

- `app/manifest.ts`: name "Geste", start_url `/learn`, scope `/learn`, display `standalone`, background #FAFAF8, theme #111111.
- Service worker (Serwist): cache the app shell and the published `guide_versions.content` + diagram of each owned guide for offline use. Videos stream only online.
- Progress is saved locally first (IndexedDB) and synced with `saveProgress` when online.
- Web push (optional) for the drying timer and, for staff, new orders.

## Environments

| Env | URL | Data |
| --- | --- | --- |
| Local | localhost:3000 | `supabase start`, Stripe test mode |
| Preview | Vercel preview per PR | Supabase branch or staging project, Stripe test mode |
| Production | geste.studio | Supabase prod (Pro plan for backups), Stripe live |

See `.env.example` for every variable.
