# Launch checklist

## Business (Lucas)
- [ ] Final artworks uploaded in the admin (replacing the mock images); each launch guide painted in the studio and photographed.
- [ ] Micro-entreprise registered; SIRET in the legal notice.
- [ ] Terms of sale, withdrawal waiver wording, privacy policy reviewed by a lawyer.
- [ ] VAT/OSS position confirmed with an accountant.
- [ ] Real affiliate programmes signed; links replaced.
- [ ] Print supplier, paper, tubes chosen; edition sizes and prices set.
- [ ] Domain geste.studio, hello@geste.studio, Resend domain verified (SPF, DKIM, DMARC).

## Technical
- [ ] Stripe live keys, webhook endpoint in live mode, Stripe Tax registrations set, Apple Pay domain verified.
- [ ] Supabase production project (Pro for daily backups), migrations applied, `rls_test.sql` passes against a copy.
- [ ] Storage buckets created with policies; public bucket only `public-works`.
- [ ] Vercel env vars set for Production; preview uses test keys.
- [ ] Owner account created with TOTP; staff_roles row inserted.
- [ ] Sentry alerts on checkout and webhook errors; uptime check on `/` and `/api/webhooks/stripe` (405 on GET).
- [ ] Playwright suite green on production (guest purchase with a live $1 test product, then refund).
- [ ] Lighthouse ≥ 95 mobile on `/`, `/shop`, `/works/n03`; axe clean on every route.
- [ ] sitemap submitted to Search Console; OG images checked.
- [ ] Cookie-less analytics confirmed; no consent banner needed for Plausible; PostHog cookieless.
