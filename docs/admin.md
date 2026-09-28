# Admin back-office

Same app, `/admin/**`, guarded by middleware (staff row + AAL2) and by RLS. `AdminShell` hides modules a role cannot use. Boards: page "Admin — back-office" (19 desktop + 4 phone).

## Roles

| Area | Owner | Support | Fulfilment | Content |
| --- | --- | --- | --- | --- |
| Dashboard | ✓ | ✓ no revenue | ✓ no revenue | ✓ no revenue |
| Orders, refunds | ✓ | ✓ refunds ≤ $50 | read | — |
| Fulfilment, editions | ✓ | read | ✓ | — |
| Works, guides, AI | ✓ | — | — | ✓ |
| Customers, support | ✓ | ✓ | — | — |
| Reviews & results | ✓ | ✓ | — | ✓ |
| Analytics, finance, marketing | ✓ | — | — | — |
| Content, translations | ✓ | — | — | ✓ |
| Settings, team | ✓ | — | — | — |

## Modules

| Module | Route | Data | Key actions | Notes |
| --- | --- | --- | --- | --- |
| Dashboard | `/admin` | `v_daily_revenue`, `v_todo_counts`, latest orders, top works | range 7/30/90 d | KPIs cached 5 min. Chart: single series, Stone bars, hovered bar Ink + tooltip |
| Orders | `/admin/orders` | orders + items | filter tabs (All, To ship, Issues, Done), type pills, bulk: labels, mark shipped, export CSV | Row → detail |
| Order detail | `/admin/orders/[n]` | order, items, payment, shipment, timeline | create label (Boxtal), certificate, mark shipped + notify, resend access/receipt, invoice PDF, refund modal (partial/full, reason, restock), internal notes | Refund modal: print only / guide only (revokes access) / full |
| Fulfilment | `/admin/fulfilment` | print_copies by fulfilment | move ← / next → | Columns: To print, Printed & signed, Packed, Shipped |
| Editions | `/admin/editions` | editions + counts | close/reopen edition, certificate log | ≤ 5 left shows Signal |
| Works | `/admin/works` | works | grid/list, tabs All/Live/Drafts/Needs test | "New work", "Generate with AI" |
| Work editor | `/admin/works/[id]` | work, formats, palettes, list, editions, SEO | save, status (Live/Draft/Scheduled/Archived), preview desktop/phone | Checklist before live: preview image, 15 steps, painted by studio, real result photo, list links |
| Guide editor | `/admin/works/[id]/guide/[g]` | layers, steps, diagram | edit step text/brush/tip/timer/video, add step/layer, edit strokes, import from AI, publish | Drafts never reach buyers until Publish creates a version |
| AI pipeline | `/admin/ai` | ai_jobs, ai_candidates | new generation (style, format, medium, palette = real tubes, max strokes, layers, candidates), approve / reject | GPU budget bar; job blocked when budget reached |
| Customers | `/admin/customers` | profiles + order stats | segments All/Repeat/Newsletter/Abroad, export CSV | |
| Customer detail | `/admin/customers/[id]` | profile, library, orders, results | login link, reset print quota, write, GDPR export/delete (double confirm) | |
| Support | `/admin/support` | threads, messages | saved replies, send, mark done | Inbound via Resend |
| Reviews | `/admin/reviews` | reviews | approve, feature, hide, reply privately | Featured → home + product "Real results" |
| Analytics | `/admin/analytics` | PostHog API | ranges | Funnel, sources, guide completion by step (drop-offs in Signal with the reason), devices, level mix, repeat rate |
| Finance | `/admin/finance` | `v_pnl_monthly`, Stripe balance | export for accountant | P&L, VAT by country (OSS), turnover threshold (value entered by the accountant), payouts |
| Marketing | `/admin/marketing` | promos, gift cards, campaigns, affiliate stats | create code, schedule letter, send test | Social calendar is a simple weekly board |
| Content | `/admin/content` | articles, home settings, translations, legal | publish home, new article | Translation progress per area |
| Settings | `/admin/settings` | settings, staff | store, shipping zones, payments & tax, team & roles (invite), security, integrations | Audit log visible to owner |

## Phone admin

Same routes, responsive. `AdminMToday` (today's KPIs + to-do + latest), `AdminMOrders` (to ship, one-tap "Mark as shipped"), `AdminMOrder` (scan label barcode with `BarcodeDetector`, fallback to typing), `AdminMAlerts` (web-push toggles). Bottom tab bar: Today · Orders · Alerts.
