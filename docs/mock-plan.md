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
| `geste.progress.v1` | `src/lib/client/progress.ts` | `{ [entitlementId]: { step, openedAt, completedAt, drying: { layer, seconds, until, pausedLeft } \| null, updatedAt } }` | `markOpened`, `saveProgress`, `completeGuide`, `startDrying`, `toggleDrying`, `dryingLeft`, `stopDrying`, `restartGuide`, `useLibraryProgress`, `useProgressEntry`, `applyProgress` |
| `geste.cookies.v1` | `src/lib/client/cookies.ts` | `{ audience, ads, savedAt }` (essential cookies are always on) | `saveCookieConsent`, `cookieConsent`, `useCookieConsent` |
| `geste.admin.v1` | `src/lib/client/admin.ts` + `src/lib/client/admin/*.ts` | `{ patches: { [table]: { [id]: columns } }, inserts: { [table]: rows[] }, audit: AuditEntry[] }` | `patchRow`, `insertRow`, `audit`, `useAdminQuery`, `requireStaff`, `setDemoRole`; domain actions `markShipped`, `refundOrder`, `moveCopy`, `saveWork`, `publishGuide`, `reply`, `setReviewStatus`, `createPromo`, `inviteStaff`… |

`resetMockState()` (`src/lib/client/store.ts`) empties all of them: wire it to a discreet "Reset demo" link in the footer and on `/kit`.

Hydration: stores return their empty value during the server render and hydration, then the stored one. Use `useHydrated()` (or the `loading` status of `useSession()`) so a page never flashes "Your cart is empty" or "signed out" for a frame.

### What the fakes do

| Real thing | Mock behaviour |
| --- | --- |
| Log in (password, passkey, email code) | Nothing is checked. An email of a mock customer signs in as that customer (e.g. `sarah.cohen@mail.com`); any other email, and the passkey button, sign in as Camille Martin ("Hi Camille"). Codes: any 6 digits. |
| Admin login + TOTP | Email + any password, then any 6 digits (or the passkey button). Signs in as Lucas · Owner (`src/data/staff.ts`). The staff session is separate from the customer one, as in production. The top bar's "Demo data" chip switches the role (Owner, Support, Fulfilment, Content) and resets the admin's changes. |
| Admin mutations | Written to `geste.admin.v1` with an audit line; `@/lib/api` merges them into every read (`src/lib/api/local.ts`), so the admin sees its own changes. The store pages are built at deploy time and ignore them, except what the browser reads (Library, reader: a refund revokes the guide, a published guide version is read by the reader). Exports (CSV, JSON) are built in the browser. |
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
| `/help` | S+c | topics in the page (board copy) | Topic from the URL hash; the contact form adds a `support_threads` row to this browser's admin overlay (`contactSupport`), nothing is sent |
| `/legal/[doc]` | S+c | `getLegalDocuments` (mock `legal_documents`) | notice, terms, privacy, cookies, accessibility; cookie choices in `geste.cookies.v1` (`saveCookieConsent`) |
| `/track?order=` | C | `getOrderTracking` (mock and local orders with a print) | No token check in the mock; a query instead of `/track/[orderId]` so local orders have a page |
| `/login`, `/register`, forgot, reset | C | `signIn` | See "What the fakes do"; forgot/reset only change screens |
| `/account` | C | `getLibrary(userId)` + `useLibraryProgress` | Upload opens the photo picker and keeps nothing (board's "Photo received"); Continue / Start / Open → the reader, Print → its print sheet |
| `/account/orders` | C | `getOrders({ customerId })` | Invoice link disabled with a tooltip "Available after launch" |
| `/account/settings` | C | `getCustomer`, `getAccountSecurity` | Changes are local to the page; "Yes, delete" logs out and deletes nothing |
| `/learn/[entitlementId]` | C | `getEntitlement(id, userId)`, `flattenSteps` | `markOpened` on open, `saveProgress` on each step, `completeGuide` on the last; stand-in guides show a quiet "Preview content" note |
| `/learn/[id]/timer` | C | same | `startDrying` / `toggleDrying` / `stopDrying`; no notification permission in the mock |
| `/learn/[id]/print` | C | same | Watermarked preview only; credits not spent |
| `/learn` | C | `getLibrary` + `progress` | The installed app's start page: opens the last guide touched on this device, else the Library. Service worker scope `<base>/learn/` (§4 M8) |
| `/admin/login` | C | `signInStaff` | |
| `/admin/**` | C | admin reads of `@/lib/api` through `useAdminQuery` | Role-filtered nav from the staff session; mutations in `geste.admin.v1`. Order detail is `/admin/orders/detail?number=` and new works open at `/admin/works/draft?slug=` (no prebuilt page for rows created in the browser) |

---

## 4. Order of work

Each step is one prompt / one commit, like `docs/build-plan.md`, and ends with `npm run typecheck`, `npm run build` (the export must build), a check of the page at 1440×900 and 390×844 against its board, and a push (the site redeploys).

**Done**
- M0.1 Static export, GitHub Pages workflow, `noindex` everywhere, `asset()`.
- M0.2 Mock tables (`src/data`) and data API (`src/lib/api`).
- M0.3 Browser state: cart + `priceCart`, fake session (customer and staff), reader progress (`src/lib/client`).
- M0.4 This plan.
- M1 Store shell: `src/app/(store)/layout.tsx` → `_chrome/StoreChrome.tsx` (headers, footer, cart drawer on `useCart`, toasts, "Reset demo" line, `useCartDrawer()` for pages), `/cart` (MCart), `src/app/not-found.tsx` (NotFound / MNotFound), `CartPanel` + `ButtonLink` in the kit, ESLint flat config. Mock: FR shows a "French is coming soon." toast; the newsletter form succeeds without sending anything.
- M2 Catalog: `/` (Home / MHome), `/shop` (Shop / MShop, filters in the URL), `/works/[slug]` for the 15 works (Product, Product01–15, MProduct; configuration in the URL, add to cart, JSON-LD). M2b done: `/works/[slug]/list` (ticks kept in `geste.list-have.v1`; "Email me this list" only shows the sent state), `/prints` + `/prints/[slug]`, `/gift-cards` (adds a gift card line to the cart), `/journal` + `/journal/[slug]`. "Open the guide" goes to `/account` until the reader exists (M5). Every page was measured against its boards at 1440 and 390 (text positions and difference images).
- M3 Checkout: `/checkout` (Checkout / MCheckout: contact, shipping, payment; express buttons; outcomes from Stripe test cards, `?paymentOutcome=soldout` for the sold-out race; see docs/decisions.md "Checkout (M3)") and `/checkout/success?order=` (step 04). `src/lib/client/purchases.ts` (`geste.purchases.v1`) keeps the order, its numbered copies and one entitlement per guide (`local-<guideId>`), signs the buyer in and empties the cart; `src/lib/api/checkout.ts` `buildOrder` is the future `createPaymentIntent` + webhook; `src/lib/api/local.ts` merges the local rows into getOrders / getOrder / getLibrary / getEntitlement / getCustomer and into the cart's stock. Pages measured against both boards in every state (default, incomplete, shipping, payment, declined, 3DS, sold out, summary open, confirmation).
- M4 Account: `/login` (password, email code, forgot → sent → reset; `?next=`, `?mode=forgot`), `/register`, `/account` (Library), `/account/orders`, `/account/settings`, `/track?order=` (see docs/decisions.md "Account (M4)", "Tracking route (mock)"). `_parts/AccountFrame.tsx` guards the account (`useRequireCustomer`; `signOut` skips the redirect of the page being left). New components: `AccountNav`, `LibraryRow`, `AccountOrderRow`, `TrackingSteps`, `PasswordField` + `PasswordRules` + `OrDivider`, `ProgressBar variant="line"`, `Checkbox layout="setting"`, `Button variant="danger-solid"`; tokens `text-code`, `tracking-code`. `src/lib/dates.ts` (board date formats, UTC), delivery helpers moved to `src/lib/delivery.ts`. "Open my library", "Set it up" (→ `/account/settings#passkeys`) and "Track it" are wired. Phone checkout gained the country and the payment method (decisions "Phone checkout: country and payment method"). Playwright `e2e/account.spec.ts`; axe clean on the new routes at 1440 and 390; every board state measured (text positions, difference images).

- M5 Reader: `src/app/(reader)/learn/[entitlementId]` (GuideReader ≥ 1024 px, AppStep below), `/timer?layer=` (GuideReader drying view, AppTimer), `/print` (AppPrint sheet → watermarked A4 preview of Guide01–08 → browser print / save as PDF; no credit spent). No site chrome. `generateStaticParams` = the mock entitlements + `local-<guideId>` for every published guide. ← → keys, swipe (phone), segment clicks; `markOpened`, `saveProgress` on every step (URL `?step=` replaced, not pushed), `completeGuide` on "I signed it. Finish"; the drying timer is pausable and survives a reload (`progress.drying` holds the end date or the seconds left). Library "Continue / Start / Open" and "Print" are links to the reader and its print sheet. Events through `src/lib/analytics.ts` (`geste:track` DOM events in the mock). Redrawn to the boards: `StepProgress`, `StepCard`, `Plate`, `DryingTimer`; new `PrintSheet`, `GuideBooklet` / `GuideSheet`; all in /kit. Camille's GS-2028 is a shipped, in-transit print (decisions "Camille's shipped print"). Playwright `e2e/reader.spec.ts`; axe clean on the reader, timer and print sheet; every board state measured (see decisions "Reader (M5)").

- M6 Admin: `src/app/(admin)/admin`: `/admin/login` (password → TOTP, passkey), the console layout (`_admin/AdminFrame.tsx`: staff guard, 257 px sidebar with live counts, toasts; `_admin/AdminPage.tsx`: top bar with search, "Demo data" role menu, alerts; phone header + Today · Orders · Alerts tabs below 768 px) and every admin board: dashboard (+ AdminMToday), alerts (+ AdminMAlerts), orders (+ AdminMOrders), order detail with the refund dialog (+ AdminMOrder, barcode scan), fulfilment, editions, customers + detail, works, work editor (+ drafts), guide editor (180 static guides), AI pipeline, support, reviews, content, analytics, finance, marketing, settings. Roles per docs/admin.md: the nav, the pages (no-access notice) and the actions (revenue owner-only, Support refunds ≤ $50, Fulfilment ships, Content edits the catalog) follow the role. A checkout order in this browser appears in Orders, its detail, Fulfilment, Editions, the customer and the dashboard, and can be shipped and refunded (the refund revokes the guide in the Library). Publishing a guide version is read by the reader in the same browser. Migration 0002 adds the reader's guide fields (minutes, step brush, printed copy). Playwright `e2e/admin-*.spec.ts` (7 files), axe clean; every board measured (decisions "Admin (M6)" rows).

- M7 Tests + static pages: `/method`, `/about`, `/help` (topics in the URL hash, contact form → a support thread in this browser's admin), `/legal/[doc]` (notice, terms, privacy, cookies with the cookie settings, accessibility; `getLegalDocuments`) from their boards (decisions "Method page", "About page", "Help page", "Legal pages"). Playwright: `e2e/journey.spec.ts` (work page → cart → checkout → success → Library → reader → the Library continues where the painter stopped), `e2e/a11y.spec.ts` (axe on every exported route, one per dynamic family, at 1440 and 390, signed in as customer and staff), `e2e/pages.spec.ts`. The tests serve out/ with `scripts/serve-out.mjs` (GitHub Pages behaviour; Python's server dropped connections under load). Brand: favicon, app icons and link previews from BrandFavicon (`scripts/brand-icons.ts`, `src/lib/og.tsx`). The /kit reader board works at 390 (StepProgress is one slider; boards scroll inside themselves).
- M8 (PWA): `src/app/manifest.ts` (start_url and scope `<base>/learn/`), `/learn` start page (opens the last guide), service worker `src/sw/sw.ts` built by `serwist build` (`serwist.config.mjs`, chained in `npm run build`): a guide opened once online works offline, timer and print sheet included; the install line on phones. `e2e/pwa.spec.ts` runs it offline.

**Next**
8. **M8 · rest, optional before the backend.** French under `/fr` with next-intl static params (translation files in `messages/`, none written yet); `/dev/emails` previews of the React Email templates (`emails/` is empty).

---

## 5. Plugging in the backend

When the mock ends, in this order:

1. Remove `output: 'export'`, `images.unoptimized` and the Pages workflow; deploy to Vercel. Remove the `robots` noindex in `src/app/layout.tsx` at launch, not before.
2. Re-implement each file of `src/lib/api` on Supabase with the same signatures (server-only where it reads private data). Delete `src/data` and `src/lib/api/clone.ts`. Move `priceCart` into the `createPaymentIntent` action; the browser keeps calling it for display only.
3. Replace `src/lib/client/session.ts` with Supabase Auth (`src/lib/auth.ts` + `middleware.ts`); the guards become server redirects, `useSession` reads the Supabase client session.
4. Replace the bodies of `src/lib/client/cart.ts` with the `src/actions/cart.ts` actions (signed cookie for guests, `carts` when signed in, merge at login). The stored line shape is the `carts.items` shape.
5. Replace `src/lib/client/progress.ts` storage with IndexedDB + `saveProgress` / `markOpened` sync. `applyProgress` and `useLibraryProgress` stay.
6. Drop `purchases.ts` and the admin overlay (`geste.admin.v1`, `src/lib/client/admin*`); the webhook and the admin actions (`src/actions/admin/*.ts`, same names) write the database (with `audit_log`). `/admin/orders/detail?number=` becomes `/admin/orders/[number]`.
7. Add the missing columns listed in docs/decisions.md ("Mock-only fields").

---

## 6. Open points

- Store pages are built at deploy time, so an admin change in the mock (price, status, new work) does not show on the store. Acceptable for a demo; say so on the admin pages with a quiet note if it confuses testers.
- Guide content exists only for N°03 · 60×80 · Intermediate; every other guide is a stand-in (`isStandIn`).
- The whole mock dataset ships in the JavaScript bundle. Fine while it is fake; watch the bundle size of the admin pages.
