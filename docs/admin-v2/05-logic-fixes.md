# 05 · Logic fixes (audit of the current code)

Audit of commit `f48247a`. Paths are relative to `src/`; `C/` = `app/(admin)/admin/(console)/`. Re-check each line before changing it: line numbers drift. Each item says what is wrong and the rule to implement.

## Numbers that are typed instead of computed → move to `lib/metrics`

| Where | Today | Becomes |
| --- | --- | --- |
| `lib/api/orders.ts:205` | `ORDERS_THIS_MONTH = 187` | paid orders in the current Paris month |
| `data/dashboard.ts:49-92` | `dailyRevenue`, `last30d`, `today`, `guidesSold30d` constants | ledger + orders + events by day; **delete these constants only after** every reader uses metrics |
| `data/insights.ts` | funnel, sources, completion, devices, level mix, repeat 24 %, P&L, VAT, turnover, payouts | metrics over events, orders, entitlements, ledger |
| `data/marketing.ts` | promo uses 58/112, gift balances, audiences 1240/410/830, open/click, affiliate | rows |
| `data/ai.ts:7-9` | budget 8000, spent 3820 | budget in settings; spent = sum of month's jobs |
| `data/works.ts:53-56` | `HISTORICAL_SALES` | all-time guides sold from orders |
| `lib/api/admin.ts:14,82-89` | AI badge fallback 5; alert times, "$1,668", previews | derived alerts (below) |
| `data/content.ts:9,41-46` | article views, translation % | analytics events; messages coverage |
| `data/settings.ts:15-20,41` | shipping "from", "$80/mo" | `pricing.SHIPPING`; GPU budget setting |
| `C/support/SupportPage.tsx:251` | "3h 10" | median first reply over 7 days |
| `C/fulfilment/FulfilmentPage.tsx:34`, `_dashboard/DashboardPage.tsx:66,266` | "16:00", "October newsletter draft" | settings; draft exists? |
| `C/orders/detail/OrderDetailPage.tsx:89-90,100,107,162` | "3DS passed", "cotton rag 308 g", "of 3 prints left" | payment row, edition paper, entitlement |

## Badges, tabs and alerts — one function each

- `orderTab(order)`, `todoCounts()`, `alerts()` live in `lib/metrics/todo.ts`. Sidebar badge = tab count = phone count = to-do row (today Orders badge 3 vs "To ship" tab 4, `api/admin.ts:42` vs `api/orders.ts:44-48`).
- Alerts are derived from state, never emitted at 0 (`api/admin.ts:86-88`), each has a stable id built from its cause (`late-print:<copyId>`), so marking one read does not mark another (`alert-ship` reused today). Clicking marks read (`components/admin/AlertsPopover.tsx:58`). Payout alert wording from payout status (sent vs scheduled).
- Low stock = `0 < left ≤ 5` everywhere (`C/editions/EditionsPage.tsx:78` flags sold-out editions in red today).

## Editions, copies, certificates

- Sold / reserved / left are **counted from `print_copies`** (paid = sold, reserved = in an unpaid checkout < 30 min, returned/available = free). Remove stored `SOLD` constants (`data/editions.ts:30-42`) once the sim creates the copies of past sales.
- Copy numbers assigned in payment order across fixtures, sim and browser (today GS-2036 has #11 and the later GS-2041 has #10, `data/editions.ts:75-76`). A refunded-and-restocked number is reused by the next buyer (lowest free number), as the Editions page promises.
- Certificate number includes the size: `C-07-S-012` (today S and M collide, `data/editions.ts:68`, `lib/api/checkout.ts:87`). Display stays readable: "N°07 · A3 · 12/100".
- Cart, checkout and store read edition open/closed and stock from the same function as the admin (today static `printEditions.open`, `lib/api/cart.ts:9,81`, `lib/api/checkout.ts:74`), so a closed or sold-out edition cannot be bought. Sold-out → auto-closed.
- Mapping functions read works/editions **through the overlay** (`lib/api/orders.ts:57,79`, `lib/api/editions.ts:11`).

## Fulfilment — a real state machine

`to_print → (sent_to_lab →) printed → packed → label_created → shipped → in_transit → delivered`, plus `returned`, `cancelled`.
- Forward moves one step at a time; "Mark as shipped" needs a label; label needs packed; certificate needs printed (today `markShipped` jumps from to_print and stamps printedAt, `lib/client/admin/orders.ts:57-75`).
- Moving back from shipped is only allowed before the carrier scan and deletes the shipment's shipped stamp (today it stays).
- Orders refunded or not paid cannot be shipped (`OrderDetailPage.tsx:214`, `OrdersPage.tsx:93`).
- Shipment status advances with tracking events (sim lags); delivered closes the copy.
- Order status is **derived** from its lines (guides delivered at payment; prints by copy status; refunds), never set by hand.

## Refunds

- Only paid orders; amount ≤ paid − already refunded; support role ≤ $50 (enforced in the action, not only hidden).
- Options: guide only (revokes access; allowed if guide not opened, else needs owner + reason), print only (restock if not shipped; shipping refunded only if nothing shipped, today always, `lib/api/orders.ts:198`), full.
- Effects in one transaction: refund row, ledger lines, Stripe balance, entitlement revoked, copies returned + number freed, gift-card refund to card balance if paid by gift card, Outbox email, timeline, audit.

## Orders and customers

- Customer totals (orders, spent, lifetime, "3rd order") net of refunds, pending/cancelled excluded, same function in list, detail header and order detail (today Adam shows 0 orders in header but GS-2025 in his list; `lib/api/orders.ts:165-170`, `lib/api/customers.ts:16,26`).
- Country of a customer = address country (board data had Inès "BE" in Nantes; use the row).
- Orders CSV exports the filtered view (`OrdersPage.tsx:52`) with money columns of 02.
- `BarcodeScanner` effect dependency: wrap `onCode` in `useCallback` (`OrderDetailPage.tsx:434,481`).

## Catalog and guides

- One `workChecklist(work)` used by: status chips, Drafts/Needs test tabs, Live **and Scheduled** guards (`lib/client/admin/catalog.ts:82`), the hero picker. Items: preview image, all 9 guides published with 15 steps, studio tested, real-result photo, shopping-list links. Fixture works that fail it (N°06, N°09 not painted; result photos null, `data/works.ts:50,104-105`) show their real state; the default hero must be a work that passes (today N°06, `data/works.ts:240`).
- Works created in the admin get their own formats, palettes, list and guides in the overlay (today read only from static tables, `lib/api/works.ts:385-409`), so they can reach Live.
- Changing proportion re-maps guides to the new formats (or asks), instead of orphaning them.
- Approving an AI candidate creates draft work **and** draft guide with its stroke plan (`lib/client/admin/ai.ts:84-106`), using the job's format, level, layers and orientation; no duplicate of an existing live image.
- Scheduled works go live at their time (clock), and only if the checklist still passes; otherwise an alert.
- Shopping-list prices scale with format quantities where relevant; standard and budget URLs both editable.
- Guide version numbering real (audit mock mentions v4 while guide has v1).

## Finance and money (details in 02)

Gift cards as liability; VAT out of revenue (today "VAT to pay back" is a cost line, `data/insights.ts:86`); refunds line; shipping income line; affiliate separated; Swiss VAT at 0 % (export); OSS only when registered; Germany line only if German customers; payouts reconcile to net receipts; turnover threshold in EUR excl. VAT on cash received; P&L = URSSAF base.

## Marketing

- Promo codes really apply at checkout (`app/(store)/checkout/CheckoutFlow.tsx:410-413` refuses everything today) through `priceCart`; uses counted from orders; "first order only" enforced; NOEL2026 scope gift cards only and never discounts gift-card face value below price paid.
- Gift-card codes usable at checkout; balances from redemptions; browser-bought cards keep recipient and send date (`lib/api/marketing.ts:90-92`).
- Newsletter audience = subscriber rows (today 1,240 vs 6 flagged customers): the sim generates subscribers who are not customers too, so both numbers are true and explained ("1,240 subscribers · 412 are customers").

## Roles and security (mock)

- Role checks in every action function (not only in pages); refund limit enforced in `refundOrder`.
- Breadcrumbs and cross-links role-aware (`C/content/ContentPage.tsx:46`, `C/reviews/ReviewsPage.tsx:44`, `WorkEditor.tsx:495`).
- Invited staff can sign in with their role; invites carry 2FA state.
- Session timeout from Settings › Security enforced in the staff session.

## Clocks

All the places that mixed `MOCK_NOW` (Oct 2) and real time now use `simNow()` (01 §1). Dates in fixtures stay as they are (they are the past).

## Things that could be done elsewhere — simplify

- **Edition settings** edited in 3 places (work editor Formats tab, Prints tab, Editions page) → one place: Editions page; the work editor shows a summary + link.
- **Tip and drying time** edited in both step and layer forms (`GuideEditor.tsx:271-293` vs `:332-346`) → layer only.
- **Shipping a print** possible from order detail, fulfilment board and bulk bar with different rules → one action `shipCopies(ids)` used by the three, same guards.
- **Today's to-do** existed in dashboard, phone Today and alerts with different links → one `todoCounts()`.
- **Guides** reachable only through N°03 → `/admin/guides` index + matrix in each work.
