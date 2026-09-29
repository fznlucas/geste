# Payments, delivery & security

## Checkout

- Steps: **01 Contact → 02 Shipping (only if a print is in the cart) → 03 Payment → 04 Confirmation**. Completed steps are clickable to edit; upcoming steps are not.
- Express Checkout Element (Apple Pay, Google Pay, PayPal) sits at the top with one sentence: "One tap: your wallet fills in contact, address and payment", then "or fill in step by step".
- Contact: email ("where your guides are sent"), "Have an account? Log in". Guests: "Log in later with a code sent by email, or choose a password below."
- Payment: Stripe Payment Element (card first). "Gift card or promo code" field. EU digital-content checkbox: "I want access now and understand I lose the 14-day withdrawal right once I open the guide" (required when the cart contains a guide; stored in `orders.withdrawal_waived`).
- Confirmation: summary hidden; "Open your guide" primary button; receipt sent.

## Money rules

| Topic | Rule |
| --- | --- |
| Currency | USD displayed; Stripe account in EUR settles automatically |
| Guide price | `pricing.ts`: `work_formats.guide_price_cents` (defaults 15/19/25/29 by format, any level) + $6 for a Signature work |
| Print price | `print_editions.price_cents` (defaults S 55, M 95, L 145) |
| Bundle | Guide and print of the same work in one order: −15 % on both lines (`order_items.discount_cents`, `orders.discount_cents` = sum) |
| Shipping | Prints only. France from $4, Europe $12, Switzerland $18 (duties), world off at launch |
| Tax | Stripe Tax. Digital guides: buyer's country rate (EU OSS). Prints: French VAT, OSS for EU buyers. Prices shown tax included |
| Promo | One code per order; scope guides/prints/everything; cannot reduce below $1 |
| Gift card | Balance used before card; can pay the whole order |
| Refunds | Guides: until first opened (or if broken). Prints: 14 days after delivery. Support ≤ $50, owner any |
| Disputes | Webhook flags the order; owner is emailed |

## Delivering guides

1. Access is an `entitlements` row. No row, no guide.
2. The reader loads the **published** `guide_versions` snapshot, rendered in the buyer's palette.
3. Videos: Mux signed playback tokens (1 h), watermark text overlay with the buyer's email.
4. PDF: `/api/guides/[id]/pdf` checks ownership, calls `use_print_credit`, renders the 8-page guide (boards Guide01–08) with `@react-pdf/renderer`, footer on every page "Licensed to {email} · order {number}", uploads to the private `guides` bucket, returns a 60 s signed URL.
5. Max 3 active devices per account; a 4th login signs out the oldest and emails the owner.
6. Screenshots cannot be blocked in a browser; the watermark is the deterrent.

## Authentication

| Who | Methods | Session |
| --- | --- | --- |
| Customer | Passkey (WebAuthn) → email code (6 digits, 10 min) → password (≥ 10 chars, strength meter) | 30 days, refresh rotation |
| Staff | Password or passkey **+ TOTP** (AAL2 required by middleware) | 12 h |

Rate limits (Upstash): login, OTP send/verify, password reset, checkout → 5/min/IP and 10/hour/email.

## Security checklist

- [ ] RLS enabled on every table (migration does it; test with `rls_test.sql`).
- [ ] Service-role client only in `src/lib/supabase/admin.ts`, imported only by server files (`import "server-only"`).
- [ ] Stripe, Boxtal, Mux, Resend, AI webhooks verify signatures and are idempotent.
- [ ] CSP: `default-src 'self'`; allow Stripe (js.stripe.com, hooks), Mux (stream.mux.com, image.mux.com), PostHog, Plausible, Supabase URL. `frame-ancestors 'none'`. HSTS.
- [ ] Private buckets: guides, certificates, labels, results, ai. Public: public-works only.
- [ ] Zod validation on every server action input.
- [ ] Admin mutations write `audit_log`.
- [ ] Backups: Supabase Pro daily + PITR when revenue allows.
- [ ] GDPR: export and deletion from settings and admin; cookie-less analytics (Plausible); PostHog in cookieless mode until consent.
- [ ] Secrets only in Vercel env; `.env*` git-ignored.
