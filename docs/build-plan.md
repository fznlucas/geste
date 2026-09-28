# Build plan

Six phases. The store opens after phase 3. Durations assume one developer with Claude Code full time; a part-time freelance roughly doubles them. Each phase ends only when its **gate** passes on the production URL.

Each numbered item below is one prompt for Claude Code. Paste it as is; it already points to the spec and the board. Commit after each.

---

## Phase 0 · Foundations (1 week)

**Gate:** every component on `/kit` matches its canvas board in all states at 1440 and 390; `supabase/tests/rls_test.sql` passes; CI green.

0.1 — "Create a Next.js 16 app (App Router, TypeScript strict, Tailwind 4, ESLint, src/ dir) in this repo. Keep the existing `tokens/`, `src/components`, `src/lib`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/(dev)/kit`, `supabase/`, `public/mock`. Install the dependencies listed in `package.json`. Make `npm run dev` serve `/kit` without errors. Read CLAUDE.md first."

0.2 — "Set up Supabase locally (`supabase init`, keep `supabase/migrations/0001_init.sql` and `seed.sql`). Run `supabase db reset`, then run `supabase/tests/rls_test.sql` and make it pass. Create `src/lib/supabase/server.ts` (SSR client with cookies), `src/lib/supabase/admin.ts` (service role, `import 'server-only'`), and generate types into `src/lib/database.types.ts`."

0.3 — "Add `middleware.ts`: refresh the Supabase session; protect `/account/**` and `/learn/**` (redirect to `/login?next=`); protect `/admin/**` (staff_roles row + AAL2, else `/admin/login`). Add `src/lib/auth.ts` with `getSession`, `requireUser`, `requireStaff(role)`."

0.4 — "Add Playwright with axe. Write a test that opens `/kit`, checks there are no axe violations, and takes screenshots at 1440×900 and 390×844 into `tests/__screenshots__`. Add GitHub Actions: typecheck, lint, Playwright, and the RLS test against a Supabase service container."

0.5 — "Add Sentry (server + client), PostHog (cookieless) and Plausible. Create `src/lib/analytics.ts` with a typed `track(event, props)` for the events in docs/accessibility-seo.md."

## Phase 1 · Store and checkout for guides (2–3 weeks)

**Gate:** a real card payment on production delivers a guide to a brand-new account, the receipt arrives, and the guide opens.

1.1 — "Build `src/app/(store)/layout.tsx`: SiteHeader on ≥1200 px, MobileHeader below, SiteFooter, a CartDrawer (Drawer + CartLine + CartSummary) and ToastProvider. Spec: docs/screens/store.md §Layout. Boards: Home, Cart, MHome, MMenu, MCart."

1.2 — "Build `/` from docs/screens/store.md §Home and board Home / MHome, using WorkCard for the works row. Data from Supabase (live works, `site_settings.home.hero_work`). ISR 1 h, tag `works`."

1.3 — "Build `/shop` (docs/screens/store.md §Shop, boards Shop / MShop): 5×3 grid of WorkCard at ≥1200 px, 2 columns on phone, filters Level and Palette as Segmented, kept in the URL."

1.4 — "Build `/works/[slug]` (docs/screens/store.md §Work page, boards Product, Product01–15, MProduct): ProductGallery, GuideConfigurator with config in the URL, Accordion details, StickyBuyBar on phone, JSON-LD Product. The Buy button must be above the fold at 1440×900 and 390×844 — add a Playwright assertion."

1.5 — "Implement the cart: `src/actions/cart.ts` (signed cookie for guests, `carts` table when signed in, merged at login), add-to-cart feedback per docs/motion.md §5."

1.6 — "Build `/checkout` and `/checkout/success` (docs/screens/checkout.md, boards Checkout / MCheckout, tweak paymentOutcome): CheckoutStepper, ExpressPay with Stripe Express Checkout Element, Payment Element, promo/gift field, withdrawal checkbox, all error outcomes. Server action `createPaymentIntent` recomputes prices with `src/lib/pricing.ts`."

1.7 — "Implement `/api/webhooks/stripe` exactly as docs/data-model.md §Webhook: idempotent, guest user creation, entitlements, emails. Test with `stripe listen` and `stripe trigger payment_intent.succeeded`."

1.8 — "Build the React Email templates in `src/emails/` from board BrandEmails: receipt, library access (magic link), email code, shipped, gift card. Send with Resend."

1.9 — "Build `/login` (passkey, email code with OtpInput, password; forgot + reset), `/register`, `/account`, `/account/orders`, `/account/settings` from docs/screens/account.md and boards Login, Register, Account, Orders, Settings (+ phone)."

1.10 — "Build the static pages: `/method`, `/about`, `/help`, `/legal/[doc]`, `/journal`, `/journal/[slug]`, `/gift-cards`, 404 (docs/screens/store.md). Add sitemap, robots, OG images."

## Phase 2 · Guide reader PWA (2 weeks)

**Gate:** a beginner who has never painted completes N°03 end to end from a phone, offline for at least one layer.

2.1 — "Build `/learn/[entitlementId]` (docs/screens/reader.md, boards GuideReader, AppStep): full-screen, no site chrome, StepProgress (15 segments), CanvasDiagram left and StepCard right on desktop, stacked on phone, big Back/Next, ← → keys and swipe. Load the published guide_versions content; palette names from the entitlement."

2.2 — "Add the drying timer view (boards GuideReader timer, AppTimer) with DryingTimer; ask notification permission on first timer only."

2.3 — "Make the reader a PWA: `app/manifest.ts` (scope /learn), Serwist service worker caching the shell and owned guides; progress saved to IndexedDB and synced with `saveProgress`; offline banner."

2.4 — "Build `/api/guides/[entitlementId]/pdf` and `/learn/[id]/print` (board AppPrint, Guide01–08): 8-page A4 PDF with @react-pdf/renderer, watermark footer, `use_print_credit`, signed URL."

2.5 — "Build `/works/[slug]/list` (board ShoppingList): ShoppingListItem rows for the chosen format, standard/budget switch, affiliate disclosure, `affiliate_click` tracking."

2.6 — "Integrate Mux: upload step videos from the admin later; in the reader, show the gesture video under the step when `mux_playback_id` exists, with signed playback."

## Phase 3 · Admin core, then launch (2 weeks)

**Gate:** Lucas creates, fills and publishes a new work and its guide without a developer, and handles a refund.

3.1 — "Build `src/app/(admin)/admin/layout.tsx` with AdminShell (role-filtered nav, counts from `v_todo_counts`), `/admin/login` with TOTP (board AdminLogin)."

3.2 — "Build `/admin` dashboard (board AdminDashboard, docs/admin.md): KpiTile row, BarChart (7/30/90 d), to-do list, latest orders, top works."

3.3 — "Build `/admin/orders` and `/admin/orders/[number]` (boards AdminOrders, AdminOrderDetail): DataTable with selection and bulk bar, Timeline, refund Modal, resend access/receipt, invoice PDF. All actions in `src/actions/admin/orders.ts` with audit_log."

3.4 — "Build `/admin/works` and `/admin/works/[id]` (boards AdminCatalog, AdminWorkEditor): tabs General, Formats & prices, Palettes, Shopping list, Prints, SEO; publishing panel with the go-live checklist; on save `revalidateTag('works')`."

3.5 — "Build the guide editor `/admin/works/[id]/guide/[guideId]` (board AdminGuideEditor): layer/step tree, CanvasDiagram, step form, Publish creates a guide_versions snapshot."

3.6 — "Build `/admin/customers`, `/admin/customers/[id]`, `/admin/support`, `/admin/reviews` (boards AdminCustomers, AdminCustomerDetail, AdminSupport, AdminReviews). Inbound support email through the Resend inbound webhook."

3.7 — "Launch checklist: docs/launch-checklist.md. Switch Stripe to live, verify the domain in Resend, set Vercel env, run the full Playwright suite on production."

## Phase 4 · Prints and growth (2 weeks)

**Gate:** a numbered print ships with its certificate and tracking link, and the customer receives the shipping email.

4.1 — "Build `/prints` and `/prints/[slug]` (board Print / MPrint) with EditionCounter (live stock), and add print items to the checkout (shipping step, addresses, Boxtal rates)."

4.2 — "Build `/admin/fulfilment` (KanbanBoard) and `/admin/editions`; Boxtal label creation and tracking webhook; certificate PDF."

4.3 — "Build `/track/[orderId]` (board Tracking)."

4.4 — "Build `/admin/marketing` (promo codes, gift cards, newsletter with double opt-in and scheduled campaigns, affiliate stats) and `/admin/finance` (P&L view, VAT by country, payouts, CSV export)."

## Phase 5 · AI pipeline, French, analytics (3+ weeks)

**Gate:** a job generates candidates, one is approved and becomes a draft work with a stroke plan in the guide editor; the whole store works in French.

5.1 — "Create `worker/` (Python, Modal): poll `ai_jobs`, generate the target image with the studio style model, decompose into a stroke plan per layer within max strokes, render a preview, compute similarity, upload to the `ai` bucket, insert `ai_candidates`, report progress to `/api/webhooks/ai`. Respect the monthly GPU budget in `site_settings`."

5.2 — "Build `/admin/ai` (board AdminAIPipeline) and `approveCandidate` (creates a draft work and guide from the stroke plan)."

5.3 — "Add next-intl with `messages/en.json` and `fr.json`, `/fr` routes, EN/FR switch in the footer, French emails, hreflang. Build `/admin/content` translation progress."

5.4 — "Build `/admin/analytics` from PostHog (funnel, sources, guide completion by step with drop-offs, devices, level mix, repeat rate) and `/admin/settings` (store, shipping, payments, team invites, security, integrations, audit log)."
