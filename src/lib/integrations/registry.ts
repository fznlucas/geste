/**
 * Every external input and output of Geste (docs/admin-v2/03 §3): what flows in and out, the env vars a
 * live connection needs, and whether it needs a server (a secret key never goes in NEXT_PUBLIC_*). Adding a
 * vendor is one more entry here plus its adapter; nothing else in the app changes.
 */

export type IntegrationCategory = "Core" | "Payments" | "Email" | "Shipping" | "Video" | "AI" | "Analytics" | "Ops" | "Social" | "Calendar" | "Bank" | "Accounting" | "Affiliate" | "Suppliers" | "Translation" | "Automation" | "Notifications";

export interface Integration {
  id: string;
  name: string;
  category: IntegrationCategory;
  /** What comes into Geste from it, and what Geste sends it. */
  inbound: string;
  outbound: string;
  /** Env vars of a live connection (secrets live on the server only). */
  env: string[];
  /** Needs a backend (a secret key or a webhook): Live stays disabled until NEXT_PUBLIC_API_BASE is set. */
  needsServer: boolean;
  /** Mode when nothing is set: most run on simulated data; a few are off until wanted. */
  defaultMode: "mock" | "off";
  /** What the mock does. */
  mock: string;
  docsUrl: string;
  /** Inbound webhook path once the backend exists. */
  webhook?: string;
}

const I = (i: Integration) => i;

export const INTEGRATIONS: Integration[] = [
  I({ id: "supabase-db", name: "Supabase database", category: "Core", inbound: "all rows", outbound: "all writes", env: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"], needsServer: true, defaultMode: "mock", mock: "Fixtures + simulation + this browser's changes", docsUrl: "https://supabase.com/docs" }),
  I({ id: "supabase-auth", name: "Supabase Auth", category: "Core", inbound: "sessions, staff 2FA", outbound: "magic links, codes, passkeys, invites", env: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"], needsServer: true, defaultMode: "mock", mock: "Sessions kept in this browser", docsUrl: "https://supabase.com/docs/guides/auth" }),
  I({ id: "supabase-storage", name: "Supabase Storage", category: "Core", inbound: "—", outbound: "previews, result photos, guide PDFs, labels, certificates, exports", env: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"], needsServer: true, defaultMode: "mock", mock: "Files kept in this browser and shown back", docsUrl: "https://supabase.com/docs/guides/storage" }),

  I({ id: "stripe-payments", name: "Stripe · cards, Apple Pay, Google Pay", category: "Payments", inbound: "payment_intent.succeeded / failed, charge.refunded, charge.dispute.created", outbound: "PaymentIntents, refunds", env: ["STRIPE_SECRET_KEY", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "STRIPE_WEBHOOK_SECRET"], needsServer: true, defaultMode: "mock", mock: "Checkout and the simulation pay; refunds update the balance", docsUrl: "https://docs.stripe.com/payments", webhook: "/api/webhooks/stripe" }),
  I({ id: "stripe-payouts", name: "Stripe balance & payouts", category: "Payments", inbound: "balance transactions, payouts", outbound: "—", env: ["STRIPE_SECRET_KEY"], needsServer: true, defaultMode: "mock", mock: "Weekly payouts from the books", docsUrl: "https://docs.stripe.com/payouts" }),
  I({ id: "stripe-tax", name: "Tax · OSS registration", category: "Payments", inbound: "tax amounts", outbound: "tax calculations", env: ["STRIPE_SECRET_KEY"], needsServer: true, defaultMode: "mock", mock: "French VAT, OSS after €10,000, exports at 0 % (by the VAT regime)", docsUrl: "https://docs.stripe.com/tax" }),
  I({ id: "stripe-radar", name: "Stripe Radar", category: "Payments", inbound: "risk level", outbound: "—", env: ["STRIPE_SECRET_KEY"], needsServer: true, defaultMode: "mock", mock: "Risk from the simulation", docsUrl: "https://docs.stripe.com/radar" }),
  I({ id: "paypal", name: "PayPal", category: "Payments", inbound: "captures", outbound: "refunds", env: ["STRIPE_SECRET_KEY"], needsServer: true, defaultMode: "mock", mock: "6 % of payments", docsUrl: "https://docs.stripe.com/payments/paypal" }),
  I({ id: "klarna", name: "Klarna · pay in 3", category: "Payments", inbound: "—", outbound: "—", env: ["STRIPE_SECRET_KEY"], needsServer: true, defaultMode: "off", mock: "Off (later)", docsUrl: "https://docs.stripe.com/payments/klarna" }),

  I({ id: "resend", name: "Email sending (transactional + newsletter)", category: "Email", inbound: "delivered, bounced, opened", outbound: "receipts, access links, shipping, gift cards, support replies, newsletter, invites, login links", env: ["RESEND_API_KEY", "EMAIL_FROM"], needsServer: true, defaultMode: "mock", mock: "Every email is kept in the Outbox, readable", docsUrl: "https://resend.com/docs", webhook: "/api/webhooks/resend" }),
  I({ id: "resend-inbound", name: "Resend · inbound support email", category: "Email", inbound: "support emails", outbound: "—", env: ["RESEND_API_KEY"], needsServer: true, defaultMode: "mock", mock: "The simulation writes the threads", docsUrl: "https://resend.com/docs", webhook: "/api/webhooks/resend-inbound" }),

  I({ id: "boxtal", name: "Boxtal · Colissimo, Mondial Relay, Chronopost", category: "Shipping", inbound: "tracking events", outbound: "labels (PDF), pickups", env: ["BOXTAL_API_KEY", "BOXTAL_SECRET"], needsServer: true, defaultMode: "mock", mock: "Labels as PDF files, tracking numbers in carrier format, scans by lag", docsUrl: "https://www.boxtal.com/fr/fr/api", webhook: "/api/webhooks/boxtal" }),
  I({ id: "mux", name: "Video hosting with DRM", category: "Video", inbound: "video.asset.ready", outbound: "uploads, signed playback tokens", env: ["MUX_TOKEN_ID", "MUX_TOKEN_SECRET", "MUX_SIGNING_KEY"], needsServer: true, defaultMode: "mock", mock: "File kept in this browser, ready after 5 s", docsUrl: "https://docs.mux.com", webhook: "/api/webhooks/mux" }),

  I({ id: "modal", name: "GPU provider (AI pipeline)", category: "AI", inbound: "job progress, candidates", outbound: "jobs", env: ["MODAL_TOKEN_ID", "MODAL_TOKEN_SECRET"], needsServer: true, defaultMode: "mock", mock: "Jobs advance with the clock", docsUrl: "https://modal.com/docs", webhook: "/api/webhooks/modal" }),
  I({ id: "midjourney", name: "Image model (Midjourney)", category: "AI", inbound: "images", outbound: "prompts with the style code", env: [], needsServer: false, defaultMode: "mock", mock: "Candidate images from the works", docsUrl: "https://docs.midjourney.com" }),
  I({ id: "claude", name: "Claude API", category: "AI", inbound: "drafts", outbound: "support reply drafts, translations, guide text", env: ["ANTHROPIC_API_KEY"], needsServer: true, defaultMode: "mock", mock: "Canned drafts", docsUrl: "https://docs.claude.com" }),

  I({ id: "posthog", name: "PostHog · product analytics", category: "Analytics", inbound: "events, funnel, completion", outbound: "events", env: ["NEXT_PUBLIC_POSTHOG_KEY", "POSTHOG_PERSONAL_API_KEY"], needsServer: true, defaultMode: "mock", mock: "Events from the simulation", docsUrl: "https://posthog.com/docs" }),
  I({ id: "plausible", name: "Analytics (privacy-friendly)", category: "Analytics", inbound: "visits, sources, pages", outbound: "—", env: ["PLAUSIBLE_API_KEY", "PLAUSIBLE_SITE_ID"], needsServer: true, defaultMode: "mock", mock: "Traffic from the simulation", docsUrl: "https://plausible.io/docs" }),
  I({ id: "search-console", name: "Google Search Console", category: "Analytics", inbound: "queries, clicks", outbound: "sitemap", env: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"], needsServer: true, defaultMode: "mock", mock: "A small generated table", docsUrl: "https://developers.google.com/webmaster-tools" }),

  I({ id: "sentry", name: "Sentry", category: "Ops", inbound: "errors", outbound: "—", env: ["SENTRY_DSN", "SENTRY_AUTH_TOKEN"], needsServer: true, defaultMode: "mock", mock: "A few generated errors", docsUrl: "https://docs.sentry.io" }),
  I({ id: "upstash", name: "Upstash · rate limit", category: "Ops", inbound: "—", outbound: "—", env: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"], needsServer: true, defaultMode: "mock", mock: "No limit applied", docsUrl: "https://upstash.com/docs" }),
  I({ id: "vercel", name: "Vercel · deploy and revalidate", category: "Ops", inbound: "deploy status", outbound: "revalidate store pages after publish", env: ["VERCEL_TOKEN"], needsServer: true, defaultMode: "mock", mock: "\"Store updates at next deploy\"", docsUrl: "https://vercel.com/docs" }),
  I({ id: "web-push", name: "Web push", category: "Ops", inbound: "—", outbound: "admin notifications", env: ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"], needsServer: true, defaultMode: "mock", mock: "In-app toasts, following the push topics", docsUrl: "https://developer.mozilla.org/docs/Web/API/Push_API" }),

  I({ id: "tiktok", name: "TikTok", category: "Social", inbound: "posts, views, likes, link clicks", outbound: "(scheduling later)", env: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"], needsServer: true, defaultMode: "mock", mock: "Posts of the calendar with generated stats; they drive traffic", docsUrl: "https://developers.tiktok.com" }),
  I({ id: "instagram", name: "Instagram", category: "Social", inbound: "posts, reach, profile clicks", outbound: "—", env: ["META_APP_ID", "META_APP_SECRET"], needsServer: true, defaultMode: "mock", mock: "Same as TikTok", docsUrl: "https://developers.facebook.com/docs/instagram-api" }),
  I({ id: "pinterest", name: "Pinterest", category: "Social", inbound: "pins, outbound clicks", outbound: "pins of works", env: ["PINTEREST_APP_ID", "PINTEREST_APP_SECRET"], needsServer: true, defaultMode: "mock", mock: "Same as TikTok", docsUrl: "https://developers.pinterest.com" }),
  I({ id: "youtube", name: "YouTube", category: "Social", inbound: "shorts stats", outbound: "—", env: ["GOOGLE_OAUTH_CLIENT_ID"], needsServer: true, defaultMode: "off", mock: "Off", docsUrl: "https://developers.google.com/youtube" }),
  I({ id: "pixels", name: "Meta / TikTok pixels", category: "Social", inbound: "—", outbound: "purchase events (with consent only)", env: ["NEXT_PUBLIC_META_PIXEL_ID", "NEXT_PUBLIC_TIKTOK_PIXEL_ID"], needsServer: false, defaultMode: "off", mock: "Off; respects cookie consent", docsUrl: "https://developers.facebook.com/docs/meta-pixel" }),

  I({ id: "google-calendar", name: "Google Calendar", category: "Calendar", inbound: "—", outbound: "social calendar, URSSAF and VAT due dates, payouts", env: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"], needsServer: true, defaultMode: "mock", mock: "Calendar inside the admin only", docsUrl: "https://developers.google.com/calendar" }),
  I({ id: "qonto", name: "Bank (Qonto)", category: "Bank", inbound: "transactions, balance", outbound: "—", env: ["QONTO_API_KEY", "QONTO_ORGANIZATION_SLUG"], needsServer: true, defaultMode: "mock", mock: "Bank account from the books", docsUrl: "https://api-doc.qonto.com" }),
  I({ id: "pennylane", name: "Accounting export", category: "Accounting", inbound: "—", outbound: "ledger lines, receipts", env: ["PENNYLANE_API_KEY"], needsServer: true, defaultMode: "mock", mock: "CSV + FEC files", docsUrl: "https://pennylane.readme.io" }),
  I({ id: "urssaf", name: "URSSAF autoentrepreneur", category: "Accounting", inbound: "—", outbound: "declaration figures", env: [], needsServer: false, defaultMode: "mock", mock: "No public API: Copy figures and due-date reminders", docsUrl: "https://www.autoentrepreneur.urssaf.fr" }),
  I({ id: "invoices", name: "Invoices (PDF)", category: "Accounting", inbound: "—", outbound: "numbered invoice PDFs with the legal mentions", env: [], needsServer: false, defaultMode: "mock", mock: "Generated in the browser", docsUrl: "https://react-pdf.org" }),

  I({ id: "partners", name: "Affiliate partners", category: "Affiliate", inbound: "clicks, sales, commissions, monthly statements", outbound: "tracked links", env: ["AWIN_API_KEY"], needsServer: true, defaultMode: "mock", mock: "Commissions from the simulation", docsUrl: "https://wiki.awin.com" }),
  I({ id: "print-lab", name: "Print lab", category: "Suppliers", inbound: "order status, cost", outbound: "print files per copy", env: ["PRINT_LAB_API_KEY"], needsServer: true, defaultMode: "mock", mock: "In-house printer (lab mode off)", docsUrl: "https://geste.studio" }),
  I({ id: "supplies", name: "Packaging & paper supplier", category: "Suppliers", inbound: "stock, invoices", outbound: "reorders", env: [], needsServer: false, defaultMode: "mock", mock: "Stock counters, reorder by email", docsUrl: "https://geste.studio" }),
  I({ id: "deepl", name: "DeepL", category: "Translation", inbound: "translations", outbound: "EN → FR strings", env: ["DEEPL_API_KEY"], needsServer: true, defaultMode: "mock", mock: "Marked drafts", docsUrl: "https://developers.deepl.com" }),
  I({ id: "webhooks", name: "Outgoing webhooks (Zapier, Make)", category: "Automation", inbound: "—", outbound: "order.paid, print.shipped, review.published…", env: ["OUTGOING_WEBHOOK_URL", "OUTGOING_WEBHOOK_SECRET"], needsServer: true, defaultMode: "mock", mock: "Events listed in the Outbox", docsUrl: "https://zapier.com/developer" }),
  I({ id: "slack", name: "Slack / Discord", category: "Notifications", inbound: "—", outbound: "new order, late print, budget reached", env: ["SLACK_WEBHOOK_URL"], needsServer: true, defaultMode: "mock", mock: "Messages listed in the Outbox", docsUrl: "https://api.slack.com/messaging/webhooks" }),
];

export const integration = (id: string) => INTEGRATIONS.find((i) => i.id === id);

/** The board's rows of Settings › Payments & tax and › Integrations, in their order. */
export const PAYMENT_ROWS = ["stripe-payments", "paypal", "klarna", "stripe-tax"];
export const INTEGRATION_ROWS = ["resend", "plausible", "mux", "pennylane", "modal"];
