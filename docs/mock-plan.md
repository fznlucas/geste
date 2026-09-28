# Mock plan

Until further notice geste.studio is a **100 % mock**: a static export published on GitHub Pages, with no Supabase, Stripe, Resend, Mux, Boxtal, PostHog or Sentry (docs/decisions.md, 2026-09-28). Everything on the boards should be clickable, with believable data, and the code must be ready to take the real backend without rewriting the pages.

This file says how. It overrides `docs/architecture.md` and `docs/build-plan.md` wherever they assume a server, until the backend is plugged in. The sources of truth for the design do not change (boards → docs → code).

---

## 1. The three layers

| Layer | Where | What it holds | What replaces it later |
| --- | --- | --- | --- |
| Mock tables | `src/data/*` | Rows shaped like `supabase/migrations/0001_init.sql` (camelCase, storage paths): 15 works, formats, palettes, guides (N°03 content + stand-ins), editions and copies, 14 customers, orders, refunds, shipments, entitlements, reviews, support threads, staff, VAT rates | The database and `seed.sql` |
| Data API | `src/lib/api/*` | Async read functions (`getWorks`, `getWork`, `getLibrary`, `getEntitlement`, `getOrders`…) and the isomorphic `priceCart`. Types in `src/lib/api/types.ts` | The same signatures re-implemented on Supabase; `priceCart` becomes the body of `createPaymentIntent` |
| Browser state | `src/lib/client/*` | Cart, fake session, reader progress, in `localStorage` | Signed cookie + `carts`, Supabase Auth, IndexedDB + `saveProgress` |

Rules:

- Pages and components import `@/lib/api` (data) and `@/lib/client` (browser state). **Never `@/data`.**
- Browser-state functions carry the names of the future server actions (`addToCart`, `updateCartLine`, `removeCartLine`, `saveProgress`, `markOpened`, `signIn`…). Swapping the backend changes their bodies, not their callers.
- Nothing stores a price. The cart holds choices; every total comes from `pricing.ts` through `priceCart`.

### Browser storage

All keys start with `geste.` and end with a version (`.v1`). Bump the version when a shape changes: old values are then ignored. Every read is validated; anything invalid falls back to the empty state. If storage is blocked (private window), the stores work in memory for the visit.

| Key | Module | Shape | Main functions |
| --- | --- | --- | --- |
| `geste.cart.v1` | `src/lib/client/cart.ts` | `StoredCartLine[]`: guide (work, format, level or `match`, palette), print (edition, quantity), gift card (amount, recipient, message, send date) | `addToCart`, `updateCartLine`, `removeCartLine`, `clearCart`, `useCart(opts)` |
| `geste.session.v1` | `src/lib/client/session.ts` | `{ customer, staff }` | `signIn`, `signOut`, `signInStaff`, `signOutStaff`, `useSession`, `useStaffSession`, `useRequireCustomer`, `useRequireStaff(role)`, `safeNext` |
| `geste.progress.v1` | `src/lib/client/progress.ts` | `{ [entitlementId]: { step, openedAt, completedAt, drying, updatedAt } }` | `markOpened`, `saveProgress`, `completeGuide`, `startDrying`, `stopDrying`, `restartGuide`, `useLibraryProgress`, `useProgressEntry`, `applyProgress` |

`resetMockState()` (`src/lib/client/store.ts`) empties all of them: wire it to a discreet "Reset demo" link in the footer and on `/kit`.

Hydration: stores return their empty value during the server render and hydration, then the stored one. Use `useHydrated()` (or the `loading` status of `useSession()`) so a page never flashes "Your cart is empty" or "signed out" for a frame.

### What the fakes do

| Real thing | Mock behaviour |
| --- | --- |
| Log in (password, passkey, email code) | Nothing is checked. An email of a mock customer signs in as that customer (e.g. `sarah.cohen@mail.com`); any other email, and the passkey button, sign in as Camille Martin ("Hi Camille"). Codes: any 6 digits. |
| Admin login + TOTP | Email + any password, then any 6 digits. Signs in as Lucas · Owner (`src/data/staff.ts`). The staff session is separate from the customer one, as in production. |
| Middleware guards | Client guards: `useRequireCustomer()` on `/account/**` and `/learn/**` → `/login?next=`; `useRequireStaff(role)` on `/admin/**` → `/admin/login?next=`. `next` goes through `safeNext` (same-site paths only). |
| RLS | `getEntitlement(id, customerId)` returns null for someone else's guide; client pages pass the session's `userId`. |
| Cart cookie / `carts` | `localStorage`, shared by guests and signed-in visitors; logging out keeps the cart. |
| Guide once per config | `addToCart` does not add the same guide configuration twice (`match` and the explicit default level are the same guide); the same edition adds one copy, capped at the copies left. |
| Stock | Editions' `left` from the mock counts; a sold-out edition stays in the cart flagged `sold_out` and is not counted. |
| VAT | `includedVatCents` with the rates of `src/data/tax.ts` (FR 20 %, BE 21 %, CH 8.1 %), shown once a country is known. |
| Reader progress | Local entry overrides the mock `entitlements.progress`; the Library reads the same entry, so both always agree. The drying timer keeps its end time, so it survives a reload. |

---

## 2. Static export: how to build a page

`next.config.ts` sets `output: 'export'`. That rules out middleware, server actions, route handlers (other than static GET), ISR, cookies and headers. The patterns below keep pages close to their final form.

| Case | Pattern |
| --- | --- |
| Public page with catalog data (Home, Shop, Work, Prints, Journal…) | **Server component** that awaits `@/lib/api` at build time. The HTML ships with the data, as it will with ISR. |
| State in the URL (`?level=&palette=`, `?format=&level=&palette=&print=1`, `?step=2c`, `?layer=2`) | Read with `useSearchParams()` in a client component wrapped in `<Suspense>` (required by the export). The server component renders the default state. |
| Dynamic segment (`/works/[slug]`, `/prints/[slug]`, `/journal/[slug]`, `/legal/[doc]`, `/learn/[entitlementId]`, `/track/[orderId]`, `/admin/orders/[number]`, `/admin/works/[id]`, `/admin/customers/[id]`…) | `generateStaticParams()` from `@/lib/api` + `export const dynamicParams = false`. Unknown params → the 404 page. |
| Private page (account, reader, admin) | Static shell + client component: guard with `useRequireCustomer` / `useRequireStaff`, then load with `@/lib/api` in the browser using the session id. Render a skeleton while `status === "loading"`. |
| Mutation (add to cart, save progress, admin edits) | Function from `@/lib/client` (same name as the future action). Admin mutations: see §4 step M6. |
| Links | `next/link` and `router.push` add the basePath themselves. Anything else that builds a public URL (img `src`, `window.location`, `og:image`) goes through `asset()` / `BASE_PATH`. Trailing slashes are on: link to `/shop`, the export serves `/shop/`. |
| Images | `next/image` is unoptimised; always pass `sizes`. Artworks come from the API as ready URLs (`asset("mock/work-03.jpg")`). |
| Not found | `src/app/not-found.tsx` (NotFound / MNotFound) is exported as `404.html`, which GitHub Pages serves for every unknown path. |

Private data is bundled into the site in the mock (it is fake). Do not add real personal data to `src/data`.

---

## 3. Routes in the mock

Render: **S** = server component at build, **S+c** = server shell with client islands (URL state, cart), **C** = guarded client page.

| Route | Render | Data | Mock behaviour |
| --- | --- | --- | --- |
| `/` | S | `getHomeHeroWork`, `getWorks`, `getEditions` | As the Home board |
| `/shop` | S+c | `getWorks` (all live), filtered on the client | Level / Palette in the URL |
| `/works/[slug]` | S+c | `getWork`, `getShoppingList`, `getEditions({ workId })`, `getReviews({ workId, status: ["published","featured"] })` | Configurator in the URL; "Add to cart" → `addToCart`; with print adds the A3 edition as a second line |
| `/works/[slug]/list` | S+c | `getShoppingList(workId, format)` | Affiliate links open the partner URL, no tracking |
| `/prints`, `/prints/[slug]` | S+c | `getEditions` | Stock from the mock counts; sold out as on AdminEditions |
| Cart drawer, `/cart` | client | `useCart()` | Board copy: "N°03 — Guide", "+ shopping list", "Signed, with certificate", cross-sell line |
| `/checkout` | C (no guard) | `useCart({ shippingMethod, country })`, `useSession` | Fake payment, see §4 step M3 |
| `/checkout/success?order=` | C | local purchase | "Thank you, Camille." · "Open your guide" |
| `/gift-cards` | S+c | `GIFT_CARD_PRESETS`, min/max | `addToCart({ kind: "gift_card", … })` |
| `/method`, `/about`, `/help`, `/legal/[doc]`, `/journal`, `/journal/[slug]` | S | copy from `reference/copy/`; articles and legal docs as mock tables if needed | Static |
| `/track/[orderId]` | S | `getOrder` for orders with a shipment | No token check in the mock |
| `/login`, `/register`, forgot, reset | C | `signIn` | See "What the fakes do"; forgot/reset only change screens |
| `/account` | C | `getLibrary(userId)` + `useLibraryProgress` | Upload banner creates nothing (toast "Thanks, we'll look at it") |
| `/account/orders` | C | `getOrders({ customerId })` | Invoice link disabled with a tooltip "Available after launch" |
| `/account/settings` | C | `getCustomer` | Changes are local to the page; "Delete my account" shows the confirmation only |
| `/learn/[entitlementId]` | C | `getEntitlement(id, userId)`, `flattenSteps` | `markOpened` on open, `saveProgress` on each step, `completeGuide` on the last; stand-in guides show a quiet "Preview content" note |
| `/learn/[id]/timer` | C | same | `startDrying` / `stopDrying`; no notification permission in the mock |
| `/learn/[id]/print` | C | same | Watermarked preview only; credits not spent |
| `/admin/login` | C | `signInStaff` | |
| `/admin/**` | C | admin reads of `@/lib/api` | Role-filtered nav from the staff session; mutations per §4 step M6 |

---

## 4. Order of work

Each step is one prompt / one commit, like `docs/build-plan.md`, and ends with `npm run typecheck`, `npm run build` (the export must build), a check of the page at 1440×900 and 390×844 against its board, and a push (the site redeploys).

**Done**
- M0.1 Static export, GitHub Pages workflow, `noindex` everywhere, `asset()`.
- M0.2 Mock tables (`src/data`) and data API (`src/lib/api`).
- M0.3 Browser state: cart + `priceCart`, fake session (customer and staff), reader progress (`src/lib/client`).
- M0.4 This plan.
- M1 Store shell: `src/app/(store)/layout.tsx` → `_chrome/StoreChrome.tsx` (headers, footer, cart drawer on `useCart`, toasts, "Reset demo" line, `useCartDrawer()` for pages), `/cart` (MCart), `src/app/not-found.tsx` (NotFound / MNotFound), `CartPanel` + `ButtonLink` in the kit, ESLint flat config. Mock: FR shows a "French is coming soon." toast; the newsletter form succeeds without sending anything.

**Next**
2. **M2 · Catalog.** Done: `/` (Home / MHome), `/shop` (Shop / MShop, filters in the URL), `/works/[slug]` for the 15 works (Product, Product01–15, MProduct; configuration in the URL, add to cart, JSON-LD). M2b done: `/works/[slug]/list` (ticks kept in `geste.list-have.v1`; "Email me this list" only shows the sent state), `/prints` + `/prints/[slug]`, `/gift-cards` (adds a gift card line to the cart), `/journal` + `/journal/[slug]`. "Open the guide" goes to `/account` until the reader exists (M5). Every page was measured against its boards at 1440 and 390 (text positions and difference images).
3. **M3 · Checkout.** `/checkout` and `/checkout/success`. Payment step: a plain card form styled like the Payment Element (not Stripe's iframe). Outcomes follow the Checkout board's `paymentOutcome` tweak and Stripe's test numbers: `4242 4242 4242 4242` success, `4000 0000 0000 0002` declined (Modal), `4000 0027 6000 3184` 3DS (fake challenge Modal, then success), a sold-out edition in the cart → sold-out message. Express pay buttons run the success path. On success: add `src/lib/client/purchases.ts` (`geste.purchases.v1`) that records the order and one entitlement per guide, signs the buyer in (`signIn({ method: "email_code", email })`), and `clearCart()`. `getLibrary` / `getEntitlement` / `getOrders` merge these local rows on the client.
   - Local entitlement ids are `local-<guideId>` so the reader route can be pre-generated: `/learn/[entitlementId]` `generateStaticParams` = the mock entitlements + `local-<guideId>` for every published guide.
   - Double click on Pay: disable while "processing" (800 ms fake delay) so one order only.
4. **M4 · Account.** `/login` (+ code, forgot, reset), `/register`, `/account`, `/account/orders`, `/account/settings`.
5. **M5 · Reader.** `/learn/[entitlementId]`, timer, print preview (build-plan 2.1–2.2, 2.4 as a preview). PWA and offline (2.3) wait for M8.
6. **M6 · Admin.** Login, shell, dashboard, orders + detail, works + editor + guide editor, customers, support, reviews, fulfilment, editions, then the owner-only pages (analytics, finance, marketing, content, settings, AI) as read-only boards. Mutations write to a local overlay (`geste.admin.v1`: patches keyed by table and id, plus an `audit_log` list shown on AdminSettings) that the admin reads merge; they never touch the store side, except work status and prices, which the store pages ignore in the mock (they are built at deploy time).
7. **M7 · Tests.** Playwright on the built export (`npx serve out`): add a guide → checkout success → open the guide → progress in the Library; admin login → refund modal. Axe on every route.
8. **M8 · Optional before the backend.** PWA manifest + Serwist with `scope` under the basePath; French under `/fr` with next-intl static params; `/dev/emails` previews of the React Email templates.

---

## 5. Plugging in the backend

When the mock ends, in this order:

1. Remove `output: 'export'`, `images.unoptimized` and the Pages workflow; deploy to Vercel. Remove the `robots` noindex in `src/app/layout.tsx` at launch, not before.
2. Re-implement each file of `src/lib/api` on Supabase with the same signatures (server-only where it reads private data). Delete `src/data` and `src/lib/api/clone.ts`. Move `priceCart` into the `createPaymentIntent` action; the browser keeps calling it for display only.
3. Replace `src/lib/client/session.ts` with Supabase Auth (`src/lib/auth.ts` + `middleware.ts`); the guards become server redirects, `useSession` reads the Supabase client session.
4. Replace the bodies of `src/lib/client/cart.ts` with the `src/actions/cart.ts` actions (signed cookie for guests, `carts` when signed in, merge at login). The stored line shape is the `carts.items` shape.
5. Replace `src/lib/client/progress.ts` storage with IndexedDB + `saveProgress` / `markOpened` sync. `applyProgress` and `useLibraryProgress` stay.
6. Drop `purchases.ts` and the admin overlay; the webhook and admin actions write the database (with `audit_log`).
7. Add the missing columns listed in docs/decisions.md ("Mock-only fields").

---

## 6. Open points

- Store pages are built at deploy time, so an admin change in the mock (price, status, new work) does not show on the store. Acceptable for a demo; say so on the admin pages with a quiet note if it confuses testers.
- Local purchases (M3) show in the customer's Library and Orders but not in the admin, whose order pages are pre-generated from the mock tables.
- Guide content exists only for N°03 · 60×80 · Intermediate; every other guide is a stand-in (`isStandIn`).
- The whole mock dataset ships in the JavaScript bundle. Fine while it is fake; watch the bundle size of the admin pages.
