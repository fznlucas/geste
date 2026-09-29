# Routes

Every canvas board maps to one route. Desktop boards (1440) and phone boards (prefix `M`, 390) are the same responsive route. English is default; French lives under `/fr/...` with the same slugs (next-intl, `localePrefix: 'as-needed'`).

## Store — `src/app/(store)`

| Route | Desktop board | Phone board | Render | Notes |
| --- | --- | --- | --- | --- |
| `/` | Home | MHome | ISR 1 h | Hero work from `site_settings.home.hero_work` |
| `/shop` | Shop | MShop | ISR + client filters | Filters `?level=&palette=` in the URL; 15 works, 5 × 3 |
| `/works/[slug]` | Product, Product01–15 | MProduct, MProduct01–15 | ISR per work | Config `?format=&level=&palette=` in the URL |
| `/works/[slug]/list` | ShoppingList | MShoppingList | ISR | Quantities from `shopping_items.quantity_rule[format]` |
| `/prints` | Print | MPrint | dynamic stock | Limited editions (A3 45, A2 75, 50×70 95) |
| `/prints/[slug]` | Print | MPrint | dynamic stock | One work's print |
| Cart drawer (any page), `/cart` | Cart | MCart | client | Cookie cart for guests |
| `/checkout` | Checkout (steps 1–3) | MCheckout | dynamic | contact → shipping (prints only) → payment |
| `/checkout/success?pi=` | Checkout (step 4) | MCheckout | dynamic | Summary hidden |
| `/gift-cards` | GiftCard | MGiftCard | ISR | $30 / $50 / $100 / custom, scheduled send |
| `/method` | Method | MMethod | static | |
| `/about` | About | MAbout | static | Honest AI provenance paragraph |
| `/journal`, `/journal/[slug]` | Journal, Article | MJournal, MArticle | ISR from `articles` | |
| `/help` | Help | MHelp | static | Tabs: orders, guides, prints, shipping, returns, contact |
| `/legal/[doc]` | Legal | MLegal | ISR from `legal_documents` | notice, terms, privacy, cookies, accessibility |
| `/track/[orderId]?t=` | Tracking | MTracking | dynamic | Signed token from the shipping email. Mock: `/track?order=` (docs/decisions.md "Tracking route (mock)") |
| 404 | NotFound | MNotFound | — | `not-found.tsx` |
| Phone menu | — | MMenu | client | Drawer |

## Account — `src/app/(store)/account` + auth pages

| Route | Board | Phone | Notes |
| --- | --- | --- | --- |
| `/login` | Login | MLogin | Tabs: passkey · email code · password; `/login/forgot`, `/login/reset` |
| `/register` | Register | MRegister | Optional password; passkey offered after first login |
| `/account` | Account | MAccount | Library: owned guides, progress, prints left, Open guide |
| `/account/orders` | Orders | MOrders | Invoices (PDF), tracking links |
| `/account/settings` | Settings | MSettings | Email, password, passkeys, devices, language, newsletter, export, delete |

## Guide reader — `src/app/(reader)/learn` (PWA scope)

| Route | Board | Notes |
| --- | --- | --- |
| `/learn` | redirects to `/account` on desktop; library on the installed PWA | |
| `/learn/[entitlementId]?step=2c` | GuideReader (desktop), AppStep (phone) | Full-screen, no site chrome. ← → keys, swipe on phone |
| `/learn/[entitlementId]/timer?layer=2` | GuideReader timer view, AppTimer | |
| `/learn/[entitlementId]/print` | AppPrint, Guide01–08 | Generates the watermarked PDF (uses 1 print credit). Mock: watermarked A4 preview + browser print, no credit spent |

## Admin — `src/app/(admin)/admin` (staff, AAL2)

| Route | Board | Phone | Roles |
| --- | --- | --- | --- |
| `/admin/login` | AdminLogin | — | — |
| `/admin` | AdminDashboard | AdminMToday | all |
| `/admin/orders` | AdminOrders | AdminMOrders | owner, support, fulfilment |
| `/admin/orders/detail?number=` (mock; `[number]` with the backend) | AdminOrderDetail | AdminMOrder | owner, support, fulfilment |
| `/admin/fulfilment` | AdminFulfilment | — | owner, fulfilment |
| `/admin/editions` | AdminEditions | — | owner, fulfilment |
| `/admin/works` | AdminCatalog | — | owner, content |
| `/admin/works/[slug]` (+ `/admin/works/draft?slug=` for works created in the browser, mock) | AdminWorkEditor | — | owner, content |
| `/admin/works/[slug]/guide/[guideId]` | AdminGuideEditor | — | owner, content |
| `/admin/ai` | AdminAIPipeline | — | owner, content |
| `/admin/customers`, `/admin/customers/[id]` | AdminCustomers, AdminCustomerDetail | — | owner, support |
| `/admin/support` | AdminSupport | — | owner, support |
| `/admin/reviews` | AdminReviews | — | owner, support, content |
| `/admin/analytics` | AdminAnalytics | — | owner |
| `/admin/finance` | AdminFinance | — | owner |
| `/admin/marketing` | AdminMarketing | — | owner |
| `/admin/content` | AdminContent | — | owner, content |
| `/admin/settings` | AdminSettings | — | owner |
| `/admin/alerts` | (popover on desktop; a plain list at this URL) | AdminMAlerts | all |

## API

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/webhooks/stripe` | POST | payment_intent.succeeded / payment_failed, charge.refunded, charge.dispute.created |
| `/api/webhooks/boxtal` | POST | tracking updates |
| `/api/webhooks/mux` | POST | video.asset.ready |
| `/api/webhooks/resend-inbound` | POST | support emails → threads |
| `/api/webhooks/ai` | POST | GPU worker progress (signed with `MODAL_WEBHOOK_SECRET`) |
| `/api/guides/[entitlementId]/pdf` | GET | PDF generation (owner, credit check, watermark) |
| `/api/cron/[job]` | GET | Vercel cron: release-scheduled-works, send-scheduled-gift-cards, abandoned-cart, sync-stripe-balance (header `CRON_SECRET`) |

Brand boards (Logo, Colour, Type, Icons, Voice, Packaging, Social, Favicon, Emails) are not routes: emails → `src/emails/*`, favicon → `app/icon.png`, OG → `app/opengraph-image.tsx` and `app/works/[slug]/opengraph-image.tsx`.
