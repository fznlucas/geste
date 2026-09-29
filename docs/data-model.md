# Data model & API

33 tables in Supabase Postgres, RLS on all of them. Full SQL: `supabase/migrations/0001_init.sql`. Seed: `supabase/seed.sql` (N°03, its 60×80 intermediate guide, 4 palettes, shopping list, A3 edition of 50). Tests: `supabase/tests/rls_test.sql` (run after the seed; it must print "all RLS and business tests passed").

Money is integer cents in USD. Times are `timestamptz`. Ids are uuid, except the human order number `GS-2041`.

## Tables

| Domain | Table | Key columns |
| --- | --- | --- |
| People | `profiles` | id = auth.users.id, email, full_name, locale en/fr, newsletter, deleted_at |
| | `staff_roles` | user_id, role owner/support/fulfilment/content |
| Catalog | `works` | number "N°03", slug, status draft/scheduled/live/archived, publish_at, orientation portrait/landscape, signature, preview/result/studio images, studio_tested, seo |
| | `work_formats` | work_id, format 30x40…80x100 (turned for a landscape work), default_level, guide_price_cents (any level; Signature +$6 added by pricing.ts), est_minutes, active |
| | `palettes` | work_id, key, name, swatches [{hex,name}], preview_filter |
| Guides | `guides` | work × format × level, current_version |
| | `guide_layers` | position, name, brush, plate, tip, minutes (painting time), dry_seconds, diagram (strokes) |
| | `guide_steps` | layer_id, position 1–5 (a–e), text, brush (null = the layer's), mux_playback_id, highlight |
| | `guide_print` | guide_id, content (the printed guide's copy, Guide01–08); staff-only draft, published into the version |
| | `guide_versions` | immutable published snapshot (content jsonb: layers with minutes, steps with brush, print) — what buyers read |
| Shopping | `shopping_items` | name, standard/budget label, price, affiliate URLs, quantity_rule per format |
| Prints | `print_editions` | work, size S/M/L, edition_size, price, open |
| | `print_copies` | edition, number, status available/reserved/sold/void, order_item, fulfilment, certificate_no |
| Orders | `carts` | user_id, items |
| | `orders` | number GS-xxxx, user/email, status, subtotal/discount/shipping/tax/total, promo, gift card, address, stripe_payment_intent, withdrawal_waived, paid_at |
| | `order_items` | kind guide/print/gift_card, work, guide, edition, config {format, level, palette}, title, detail, unit price, qty, fulfilment |
| | `refunds` | amount, reason, restock, revoke_access, stripe_refund_id, created_by |
| | `shipments` | carrier, tracking_no, label_path, parcel, status, shipped/delivered |
| Access | `entitlements` | user, guide, palette_key, prints_left (3), progress {step}, opened_at, revoked_at |
| | `devices` | user, label, last_seen (max 3 active) |
| Growth | `promo_codes`, `promo_redemptions` | code, percent/amount, scope, limits, dates |
| | `gift_cards` | code GESTE-XXXX-XXXX, initial, balance, sender, recipient, message, send_at |
| | `newsletter_subscribers`, `campaigns` | double opt-in, audience, stats |
| Community | `reviews` | rating, body, photo, status pending/published/featured/hidden |
| | `support_threads`, `support_messages` | inbox |
| Content | `articles`, `legal_documents`, `site_settings` | journal EN/FR, versioned legal, key/value settings |
| AI | `ai_jobs`, `ai_candidates` | params, stage, progress, GPU cost; similarity, stroke plan, verdict |
| Ops | `audit_log` | actor, action, target, meta, at |

## Functions

| Function | Does |
| --- | --- |
| `is_staff()`, `has_role(role)` | Used by RLS. Owner passes every role check. |
| `handle_new_user()` (trigger) | Creates the profile when an auth user is created (guest checkout included). |
| `create_print_copies()` (trigger) | Creates copies 1…n when an edition is created. |
| `assign_print_copy(edition, order_item)` | Locks and assigns the next free number, sets certificate `C-03-012`; returns null when sold out. |
| `release_print_copy(order_item)` | Puts the number back (refund with restock). |
| `use_print_credit(entitlement)` | Decrements prints_left for the caller; raises `no_prints_left`. |

## Views (admin)

`v_daily_revenue` (dashboard chart), `v_todo_counts` (dashboard to-do and sidebar counts), `v_pnl_monthly` (finance). All `security_invoker`, so RLS of the caller applies.

## RLS summary

| Who | Can |
| --- | --- |
| Anyone | Read live works, formats, palettes, shopping lists, editions and copy availability, published articles, legal texts, reviews, `home.*` settings |
| Customer | Read/update own profile, cart, devices; read own orders, items, shipments, entitlements; update own progress; read published guide versions of owned guides; write reviews for owned works; open and reply to own support threads |
| Support | + read profiles, orders, refunds (insert ≤ $50), threads, messages, entitlements (reset print credits), moderate reviews, gift cards |
| Fulfilment | + read orders and items, manage editions, copies, shipments |
| Content | + manage works, formats, palettes, lists, guides, layers, steps, publish versions, articles, AI jobs and candidates, `home.*` settings, moderate reviews |
| Owner | Everything, including team, promos, campaigns, finance views, legal, audit log |
| Service role (server) | Webhooks, checkout, emails, audit inserts |

## Server actions (`src/actions`)

| File | Actions |
| --- | --- |
| `cart.ts` | `addToCart(config)`, `updateCartLine(id, qty)`, `removeCartLine(id)`, `applyCode(code)` (promo or gift card) |
| `checkout.ts` | `createPaymentIntent(cart, contact, address?)` → recomputes prices with `pricing.ts`, promo, gift card, shipping, Stripe Tax; stores a `pending` order; returns client_secret |
| `auth.ts` | `sendEmailCode(email)`, `verifyEmailCode`, `setPassword`, `registerPasskey`, `signOut` |
| `reader.ts` | `saveProgress(entitlementId, step)`, `markOpened(entitlementId)` |
| `account.ts` | `updateProfile`, `exportMyData`, `requestDeletion`, `subscribe(email)` |
| `reviews.ts` | `submitReview(workId, rating, body, photo?)` |
| `admin/orders.ts` | `markShipped`, `createLabel`, `refundOrder`, `resendAccess`, `resendReceipt`, `addOrderNote` |
| `admin/fulfilment.ts` | `moveCopy(copyId, status)`, `generateCertificate(copyId)` |
| `admin/catalog.ts` | `saveWork`, `saveFormats`, `savePalettes`, `saveShoppingList`, `setWorkStatus` (revalidates `works` tag) |
| `admin/guides.ts` | `saveStep`, `saveLayer`, `addStep`, `publishGuide` (writes `guide_versions`) |
| `admin/ai.ts` | `createJob(params)`, `approveCandidate(id)` (creates draft work + guide from stroke plan), `rejectCandidate(id)` |
| `admin/customers.ts` | `sendLoginLink`, `resetPrintCredits`, `exportCustomerData`, `scheduleDeletion` |
| `admin/support.ts` | `reply(threadId, body)`, `setThreadStatus` |
| `admin/reviews.ts` | `setReviewStatus(id, status)` |
| `admin/marketing.ts` | `createPromo`, `scheduleCampaign`, `sendTest` |
| `admin/settings.ts` | `inviteStaff(email, role)`, `removeStaff`, `saveSetting` |

Every admin action: `requireStaff(role)` → validate input with zod → mutate → `audit_log` insert → `revalidatePath/Tag`.

## Webhook: `payment_intent.succeeded` (idempotent on `stripe_payment_intent`)

1. Load the pending order by payment intent; stop if already `paid`.
2. Find or create the auth user for `orders.email` (guest).
3. Mark order `paid`, `paid_at = now()`.
4. For each guide item → `entitlements` row (palette from config).
5. For each print item → `assign_print_copy`; if null → mark item `void`, refund that line automatically, email an apology with other sizes.
6. Gift card items → create `gift_cards` rows; email now or at `send_at`.
7. Promo → `promo_redemptions`; gift card used → decrement balance.
8. Emails: receipt + library magic link (guides), "we're printing it" (prints).
9. PostHog `purchase` event server-side.
