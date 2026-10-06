# 03 · Integrations — every input and output, behind a Mock / Live switch

## 1. Pattern

```
src/lib/integrations/
  registry.ts          list of integrations (id, name, category, what flows in/out, env vars, docs URL, needsServer)
  mode.ts              getMode(id): "mock" | "live"; setMode(id, mode) (overlay, owner only)
  <id>/types.ts        the adapter interface (what the app needs, not the vendor's API)
  <id>/mock.ts         complete implementation on simulated data
  <id>/live.ts         real implementation as far as possible without secrets; throws IntegrationNotConfigured
  index.ts             adapter(id) → mock or live by mode
```

Rules:
- **No page and no `@/lib/api` function calls a vendor directly.** They call `adapter("stripe").refund(...)`. Today's direct stubs (e.g. `mockTrackingNo` in `src/lib/client/admin/orders.ts:35-54`, fake `pi_` ids in `src/lib/api/checkout.ts`) move into the mock adapters.
- **Mode resolution**: overlay value set in Settings › Integrations, else `NEXT_PUBLIC_INTEGRATION_<ID>=live|mock`, else `mock`.
- **Live is only allowed when it can work.** The site is a static export with no server today. An integration marked `needsServer` (anything with a secret key) shows its switch **disabled** with the reason "Needs a server · set NEXT_PUBLIC_API_BASE" until a backend URL is configured. When live is chosen but env vars are missing, the status reads "Live · missing STRIPE_SECRET_KEY" and calls fall back to nothing (error toast, no silent mock). Never put a secret in a `NEXT_PUBLIC_` variable.
- **Inbound webhooks** are listed with their future path (`/api/webhooks/<id>`) and, in mock, are simulated by the generator (01 §4) and by a "Send test event" button that injects one event into the overlay.
- Every adapter call writes an **integration log** row (time, integration, direction in/out, operation, mock|live, ok|error, related row). Settings › Integrations › Logs shows it, filterable.

## 2. Settings › Integrations (the existing tab, extended)

Keep the five rows already there (Email sending, Analytics, Video hosting, Accounting export, GPU provider) and the four Payments & tax rows; each gets: a **Switch Mock / Live** (existing `Switch` component), a status chip (dot + word: "Mock", "Live · connected", "Live · missing config", "Off"), "Settings" (opens a drawer with env vars expected, webhook URL, docs link, last 20 log lines), "Send test event". Then add the rest of the table below, grouped by category with the same row layout. The Payments & tax tab keeps its rows and gets the VAT regime switch (02 §5).

## 3. The list

| Category | Integration | In (to Geste) | Out (from Geste) | Env vars (live) | Mock behaviour |
| --- | --- | --- | --- | --- | --- |
| Core | **Supabase DB** | all rows | all writes | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | fixtures + sim + overlay (`local.ts`) |
| Core | **Supabase Auth** | sessions, staff AAL2 | magic links, OTP, passkeys, invites | same | `sessionStore`; invited staff can sign in (fix) |
| Core | **Supabase Storage** | — | previews, result photos, guide PDFs, labels, certificates, exports | same | files kept as object URLs / data URLs in IndexedDB `geste.files.v1`, shown back on screen |
| Payments | **Stripe Payments** | `payment_intent.succeeded/failed`, `charge.refunded`, `charge.dispute.created` | PaymentIntents, refunds | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | generator + checkout mock; refunds update balance |
| Payments | **Stripe Balance & Payouts** | balance transactions, payouts | — | same | weekly payouts from the ledger (02 §7) |
| Payments | **Stripe Tax** | tax amounts | tax calculations | same | rates of `src/data/tax.ts` by regime |
| Payments | **Stripe Radar** | risk level | — | same | risk from generator |
| Payments | **PayPal** (via Stripe) | captures | refunds | Stripe | 6 % of payments |
| Payments | **Klarna** (via Stripe) | — | — | Stripe | Off by default ("later") |
| Email | **Resend — sending** | delivery/bounce/open events | receipts, access links, shipping, gift cards, support replies, newsletter, invites, login links | `RESEND_API_KEY`, `EMAIL_FROM` | Outbox: every email the app "sends" is stored and readable in Settings › Integrations › Outbox (subject, to, rendered React Email template) |
| Email | **Resend — inbound** | support emails | — | inbound route | generator creates threads |
| Shipping | **Boxtal** (Colissimo, Mondial Relay, Chronopost) | tracking events | labels (PDF), pickups | `BOXTAL_API_KEY`, `BOXTAL_SECRET` | label = generated PDF (simple, real file to download), tracking numbers in carrier format, status events by lag |
| Video | **Mux** | `video.asset.ready` | uploads, signed playback tokens | `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`, `MUX_SIGNING_KEY` | uploaded file kept locally, status "ready" after 5 s |
| AI | **Modal (GPU worker)** | job progress, candidates | jobs | `MODAL_TOKEN_ID`, `MODAL_TOKEN_SECRET`, webhook | existing `advanceJobs` moved into the mock adapter, runs from the clock (not only while the page is open) |
| AI | **Midjourney / image model** | images | prompts with the style code (`--p`) | manual for now | candidate images from `public/mock` |
| AI | **Claude API** | drafts | support reply drafts, translations, guide text polish | `ANTHROPIC_API_KEY` | canned drafts |
| Analytics | **PostHog** | events, funnel, completion | events | `NEXT_PUBLIC_POSTHOG_KEY`, `POSTHOG_PERSONAL_API_KEY` | generator events (01 §4) |
| Analytics | **Plausible** | visits, sources, pages | — | `PLAUSIBLE_API_KEY`, site id | generator traffic |
| Analytics | **Google Search Console** | queries, clicks | sitemap | OAuth | small generated table |
| Ops | **Sentry** | errors | — | `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` | 0–2 generated errors/week, checkout errors raise an alert |
| Ops | **Upstash (rate limit)** | — | — | `UPSTASH_REDIS_REST_URL/TOKEN` | no-op |
| Ops | **Vercel (cron, revalidate, deploy)** | deploy status | revalidate store pages after publish | `VERCEL_TOKEN` | "Publish" shows "Store updates at next deploy" (today's honest wording) |
| Ops | **Web push** | — | admin notifications | VAPID keys | in-app toast + alert, honours the push topics (today stored but unused) |
| Social | **TikTok** | posts, views, likes, link clicks | (scheduling later) | OAuth | posts from the social calendar with generated stats; drive traffic spikes |
| Social | **Instagram (Meta Graph)** | posts, reach, profile clicks | — | OAuth | same |
| Social | **Pinterest** | pins, outbound clicks | pins of works | OAuth | same |
| Social | **YouTube** | shorts stats | — | OAuth | Off by default |
| Social | **Meta / TikTok pixels** | — | purchase events (only with consent) | pixel ids | Off; respects cookie consent |
| Calendar | **Google Calendar** | — | social calendar, URSSAF due dates, payouts | OAuth | calendar view inside admin only |
| Bank | **Qonto** (or any bank via aggregator) | transactions, balance | — | API key | bank account from the ledger (02 §7) |
| Accounting | **Pennylane** / **Indy** | — | ledger lines, receipts | API key | export files (CSV + FEC) |
| Accounting | **URSSAF autoentrepreneur** | — | declaration figures | no public API: manual | "Copy figures" button + due-date reminders |
| Accounting | **Invoices** | — | invoice PDFs per order (numbered, legal mentions, VAT mention per regime) | — | real PDF generated in the browser with `@react-pdf/renderer` (already a dependency); enables the disabled "Invoice PDF" button |
| Affiliate | **Partner programmes** (Amazon, Awin, Effiliation, art-supply shops) | clicks, sales, commissions, monthly statements | tracked links | per partner | affiliate ledger from generator; Marketing › Affiliate becomes editable (partner, rate, link template) |
| Suppliers | **Print lab** (or in-house) | order status, cost | print files per copy (size, number, signature) | per lab | "Send to lab" on a copy → status `sent_to_lab` → printed after lag; in-house mode skips it |
| Suppliers | **Packaging & paper supplier** | stock, invoices | reorders | — | stock counters (tubes, paper S/M/L, certificates) decreasing with each print, reorder alert at threshold |
| Translation | **DeepL** | translations | EN→FR strings | `DEEPL_API_KEY` | Translations tab: real coverage computed from `messages/*.json`, "Translate missing" fills with a marked draft |
| Automation | **Outgoing webhooks / Zapier / Make** | — | order.paid, print.shipped, review.published… | URL + secret | events listed in Outbox |
| Notifications | **Slack / Discord** | — | new order, late print, budget reached | webhook URL | Outbox |

Add any vendor not listed through the same pattern; nothing else in the app should change when one is added.

## 4. What the switch means for Lucas

- **Mock**: the admin runs on simulated data and stores his actions in the browser.
- **Live**: calls the vendor through the backend. Until there is a backend, Live is greyed out with the reason. When the backend exists, turning Supabase to Live makes the data layer read the database instead of fixtures + sim; the generator then stops (a banner says so).
- A global line on the dashboard: "Mock: 34 · Live: 0" linking to Settings › Integrations.
