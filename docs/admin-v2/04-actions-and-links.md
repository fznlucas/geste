# 04 · Every button, link, tab and row

Rule: **no control may be inert, fake or a dead end.** Each one either changes data (overlay + audit line + integration log when it touches a vendor), navigates to a real place that answers the intent (with the right filter/selection in the URL), or opens a real file. "Done · demo action" toasts are forbidden; delete the helper that produces them (`SettingsPage.tsx:126` and others) once nothing uses it. A control that genuinely cannot work yet (needs a vendor in Live) stays visible, enabled in Mock, and in Live without config shows a disabled state with the reason as hint.

Every action also respects: role permissions (hide or disable with "Owner only"), state guards (05), confirm dialog for destructive or customer-visible actions, success toast naming what changed, and focus return.

Columns: **Control** · **Mock behaviour (now)** · **Writes** · **Live (later)**.

## Shell (all pages)

| Control | Mock | Writes | Live |
| --- | --- | --- | --- |
| Sidebar items + badges | Badge = the exact count of the target tab/filter, from the same function (05 §Badges); click opens the page **with that filter** (Orders → `?tab=to_ship`, Support → `?status=open`, Reviews → `?tab=moderate`, AI → `#to-validate`, Editions → `?low=1`) | — | same |
| "Guide editor" (sidebar) | Opens new index `/admin/guides` (all guides, filter by work, format, level, status) instead of the hard-wired N°03 (`AdminShell.tsx:19`) | — | same |
| Search | Searches orders (number, email, name), customers, works, guides, threads, promo codes; results grouped; Enter opens first; role-aware fallback "No result in what you can open" | — | Supabase search |
| Alerts · N | Popover of derived alerts (05 §Alerts); clicking one marks it read **and** navigates to the cause; "Mark all read"; N = unread | overlay `alerts_read` | same |
| Demo data chip | Role switch (unchanged) + "Simulated · up to HH:MM" + link to Settings › Simulation | — | hidden in Live |
| "New work +" | Creates a draft and opens the work editor (same as Catalog, `CatalogPage.tsx:63`) — today it only opens the catalog (`DashboardPage.tsx:74`) | work draft | same |
| View the store ↗ | Opens store in new tab | — | — |
| Lucas · Owner / 2FA on | 2FA chip reads the staff row (not a literal, `AdminShell.tsx:116,121`); click → Settings › Security | — | Supabase AAL |
| Log out | Signs out staff session | session | Supabase |

## Dashboard `/admin`

| Control | Mock | Live |
| --- | --- | --- |
| KPI tiles (Revenue, Orders, Avg. order, Conversion, Guides finished, Affiliate) | Computed by `metrics` for the selected range; each tile is a link: Revenue → Finance (same period), Orders → Orders (period), Avg. order → Analytics basket, Conversion → Analytics funnel, Guides finished → Analytics completion, Affiliate → Marketing › Affiliate. Delta compares with the previous equal period, the label says which ("vs Sep 6 – Oct 5") | same |
| Range 7 d / 30 d / 90 d | Real rolling windows ending today (today partial); persists in URL `?range=` | same |
| Revenue per day chart | Daily turnover from the ledger; hover tooltip; bar click → Orders filtered on that day; notes come from the social calendar & campaigns | same |
| To do today rows | Each row derived from data with its count (never shown at 0), link to the filtered place: prints to pack → Fulfilment `?col=to_print`; support → Support `?status=open`; reviews → Reviews `?tab=moderate`; AI → AI `#to-validate`; low edition → Editions `?low=1`; newsletter draft → Marketing › Newsletter `?id=` (only if a draft exists); URSSAF due → Finance › Taxes; late prints; overdue replies | same |
| Latest orders / All orders | Last 5 paid; row → order detail | same |
| Top works / Catalog | Guides sold in range per work; bar → work editor; "Catalog" → Catalog sorted by sales | same |
| Phone "Today" | Same metrics for today vs **same weekday last week** (label computed); its to-do links go to the real modules, not `/admin/alerts` (`DashboardPage.tsx:266-268`) | same |

## Orders `/admin/orders` and order detail

| Control | Mock | Live |
| --- | --- | --- |
| Tabs All / To ship / Issues / Done | Single `orderTab(order)` function used by tabs, badges and phone view (today duplicated, `api/orders.ts:44-48`, `OrdersPage.tsx:72-76`); counts in tabs | same |
| Type pills, date range, search | Filters in URL | same |
| Row checkbox + bulk bar | Bulk: create labels (for eligible prints), mark shipped (only orders with labels), export selection; ineligible rows listed in the confirm dialog | Boxtal |
| Export CSV | Exports **what is filtered** (tab, type, range, search), with refunded amount, shipping, VAT, EUR excl. VAT, FX, fees columns | — |
| "12 orders shown · 187 this month" | Both numbers computed (shown rows; paid orders in current calendar month) | — |
| Row → detail | `/admin/orders/detail/?number=` (static export pattern kept) | — |
| Carrier / tracking / parcel | Form validated; parcel options from config | Boxtal |
| Create shipping label | Allowed when copy is packed; creates shipment `label_created` with carrier-format tracking number and a **real PDF label** (generated, downloadable); cost goes to ledger | Boxtal |
| Label ready · PDF | Downloads that PDF (today empty handler, `OrderDetailPage.tsx:352`) | Storage signed URL |
| Generate certificate | Only for printed copies; creates certificate row with number `C-<work>-<size>-<nnn>` and a PDF (05 §Editions) | Storage |
| Mark as shipped and notify | Requires label; sets shipment `shipped`, copies `shipped`, writes the email to the Outbox, timeline line | Resend + Boxtal |
| Resend library access / receipt | Writes the email to the Outbox (readable), audit + timeline | Resend |
| Invoice PDF | Enabled: generates a numbered invoice PDF (legal mentions, VAT per regime) | Storage |
| Refund… | Modal with guards (05 §Refunds); writes refund, ledger, restock, revoke, email | Stripe |
| Internal note / Add | Saves note with author/time; shows in timeline | Supabase |
| Customer block | Name → customer detail; email → Support new thread prefilled; "3rd order · $124 lifetime" computed net of refunds | — |
| Risk | From payment row (3DS real flag, not literal) | Radar |
| Timeline | Every event of the order from rows (paid, emails, label, printed, shipped, tracking events, delivered, refund, notes), in time order | — |

## Fulfilment `/admin/fulfilment`

| Control | Mock | Live |
| --- | --- | --- |
| Columns | To print · Printed & signed · Packed · Shipped (kept) + **Delivered** (added, collapsed to last 14 days) | — |
| → / ← per card | State machine 05 §Fulfilment; moving one copy never ships the whole order silently: if the order has several prints, the dialog lists them | — |
| "Print lab: … · next pickup … 16:00" | From Settings › Shipping (pickup time, lab mode); "today/tomorrow" computed from clock | Boxtal pickups |
| Edition stock | → Editions | — |
| Card click | → order detail | — |
| "Send to lab" (added on To print cards when lab mode = external) | Status `sent_to_lab` | Print lab |
| Supplies line (added) | Tubes, paper S/M/L, certificates left; reorder button → Outbox email to supplier + expense | supplier |

## Editions `/admin/editions`

| Control | Mock | Live |
| --- | --- | --- |
| Table | Sold / reserved / left **computed from copies** (05 §Editions); ≤ 5 left highlighted only when > 0; sold out shows "Sold out" and closes automatically | — |
| Close / reopen edition | Guards: cannot close with reserved copies unshipped; closing hides the size from the store and cart (store reads the same function) | — |
| Edit | Drawer: price, edition size (≥ sold), paper; single place where edition settings are edited (work editor Prints tab becomes a read-only summary with a link here) | — |
| Certificate log | All certificates, row → order; search by number | — |
| Reachable by owner, fulfilment **and content** (read-only for content) so the work-editor link is not a dead end (`WorkEditor.tsx:495`) | | |

## Catalog, work editor, guides

| Control | Mock | Live |
| --- | --- | --- |
| New work + / Generate with AI | Draft work / AI page with "new generation" open | — |
| Tabs All / Live / Drafts / Needs test / Grid / List | Status from the same checklist function; counts | — |
| Card | → work editor; "62 sold" = all-time guides sold computed from orders | — |
| Work editor tabs (General, Formats & prices, Palettes, Shopping list, Prints, SEO) | All fields saved (incl. "Allow Custom level", today local only `WorkEditor.tsx:382`) | Supabase |
| Digital preview › Replace | File picker → stored (IndexedDB) → shown everywhere in admin; store uses it after deploy | Storage |
| Real result › Pick from submitted results | Picker of published review photos for that work | — |
| Studio test › Upload | Stores the photo and shows it (today discarded, `WorkEditor.tsx:252-263`) | Storage |
| + Add a palette | Creates a palette (name + swatches) | — |
| Publishing Live / Draft / Scheduled / Archived | Live and Scheduled both require the checklist (05); Scheduled has date-time, goes live at that time by the clock; Archived hides from store | Vercel revalidate |
| Save changes | Atomic: validation first, then one write (05) | — |
| Preview on the store / phone ↗ | Opens the store page (phone opens a 390 px window) | — |
| Before going live checklist | Each item links to where to fix it | — |
| Guide box / Open guide editor | Shows the **9 guides** (3 formats × 3 levels) as a matrix with status; each opens its editor (uses the unused `getWorkGuides`, `api/guides.ts:166`) | — |
| Guide editor: steps, + Add a step / layer | Add, edit, **delete, reorder** (drag + buttons for keyboard); tip and drying edited in one place (layer), shown read-only on step | — |
| Edit strokes | Opens stroke list editor for the layer (add/remove/reorder strokes, width from brush kit); diagram updates | — |
| Import from AI | Picks an approved candidate's stroke plan for this guide's format/level | Modal |
| Gesture video | Upload → Mux mock "processing → ready" | Mux |
| Published → / Preview / history | Publish creates version n+1 (real numbering), Preview opens reader with draft, history lists versions with restore | — |

## AI pipeline `/admin/ai`

| Control | Mock | Live |
| --- | --- | --- |
| New generation form | Validation: candidates ≤ 10 (= what the worker returns; today 24 charged for 10, `client/admin/ai.ts:29,59`); cost estimate = `aiJobCostCents` | Modal |
| Generate | Blocked when month budget reached; budget **editable in Settings › Integrations › GPU** (today mentioned but absent) | — |
| Running jobs | Progress driven by the clock, continues when the page is closed | Modal webhook |
| Approve | Creates draft work **with draft guide from the stroke plan, matching format, level, layers, orientation**; card shows "→ Works (draft)" as a real link | — |
| ✕ (reject) | Rejected, moves to a "Decided" filter (decided cards leave the to-validate list) | — |
| "GPU this month: $x of $y" | Sum of this calendar month's jobs (running included) | Modal billing |

## Customers

| Control | Mock | Live |
| --- | --- | --- |
| Segments All / Repeat / Newsletter / Abroad, Export CSV | Computed; export what is filtered | — |
| Columns Orders / Spent / Last order | Net of refunds; consistent with detail header (05) | — |
| Detail: Send a login link | Outbox email | Supabase + Resend |
| Reset print quota | Sets prints_left to 3 for a chosen guide | — |
| Write to X | Support `?customer=<id>&new=1` opens a new thread prefilled | — |
| Export her data | Downloads JSON (honest wording "Downloaded", or Outbox email in Live) | — |
| Delete account… | Double confirm; schedules deletion at request + 30 days, visible countdown; anonymises at date | — |
| Library rows | → reader preview of that entitlement (read-only, as staff) | — |
| Orders rows | → order detail | — |
| Results / Open in moderation | → Reviews `?id=<review>` scrolled and focused | — |
| Account chips (password, email verified, Face ID) | From the customer row (not literals) | Supabase |

## Support

| Control | Mock | Live |
| --- | --- | --- |
| Open / Done | Counts; thread list sorted by waiting time; overdue (> 24 h) marked | — |
| Saved replies | Insert into the reply box; **manage** (add, edit, delete) in a drawer | — |
| Format swap reply | Also offers the action "Swap guide format" (changes the entitlement, audit) — today the text promises it but nothing happens | — |
| Send reply / Mark as done | Outbox email from the support address of Settings (not hard-coded `hello@`), status | Resend |
| Customer profile / Order # | Links | — |
| "Average first reply this week" | Computed from threads | — |
| Draft with Claude (added) | Fills the box with a draft (canned in Mock) | Claude API |

## Reviews

| Control | Mock | Live |
| --- | --- | --- |
| Tabs To moderate / Published / Hidden | Counts | — |
| Approve / Feature / Hide | State changes; Published and Hidden keep actions (Unpublish, Unhide, Unfeature) — today none (`ReviewsPage.tsx:89`); busy state reset after undo (`:69-78`) | — |
| Hide | If the photo is a work's real-result photo, asks to replace it | — |
| Reply privately | Support new thread with the customer, prefilled with the review | Resend |
| Feature | Max N featured (config); shows where it appears | — |

## Analytics, Finance, Marketing, Content, Settings, Alerts

| Screen | Control | Mock |
| --- | --- | --- |
| Analytics | 7 d / 30 d / 90 d / Year | Every block recomputed for the range (funnel, sources, completion, devices, level mix, repeat) — not scaled copies (`data/insights.ts:31-42`) |
| Analytics | Biggest leak sentence | Computed: the funnel step with the lowest rate, with its % |
| Analytics | Work selector on completion (added) | Pick any work; "Edit these steps" deep-links to the guide editor at the worst step |
| Finance | Period, P&L rows, VAT, threshold, payouts | 02; each P&L row clickable → ledger lines of that account and period |
| Finance | Export for accountant | CSV + FEC of the period |
| Finance | Taxes & URSSAF tab (added) | Declarations, Mark declared / paid, Copy figures |
| Marketing | Promo codes | Uses = orders with that code; form adds start date, "first order only", scope; default code and discount agree; NOEL2026 scope fixed to gift cards really |
| Marketing | Gift cards | Balances from redemptions; resend email; void; extend |
| Marketing | Newsletter | Audience = subscribers rows; Send test → Outbox; Schedule in Europe/Paris time (fix the 07:00 UTC, `marketing.ts:68`); stats generated after send |
| Marketing | Affiliate | Editable partners (name, rate, link template, payout day); clicks/sales/commissions from affiliate rows |
| Marketing | Social calendar | Editable (add/move/delete post, network, theme); week navigation; stats per post from the social adapter; posts drive simulated traffic |
| Content | New article | Opens new editor `/admin/content/article/?id=` (title, body markdown, category, cover, date, status, FR translation); list rows open it |
| Content | Home page | Hero options = live works only; Publish home writes settings that the store home reads (client read, store updates live in Mock) |
| Content | Translations | Coverage computed from the real translation files (there is no `messages/` folder yet: the French site is not built, so coverage shows the true state, e.g. 0 %, with a note); "Translate missing" (DeepL adapter) once the files exist |
| Content | Legal pages | Edit, version, publish; status consistent with what the store shows; includes Accessibility |
| Content | Breadcrumbs | Role-aware (no link to a page the role cannot open) |
| Settings | Store | Fields are used: support email (support panel, emails), currency display, legal entity (invoices, legal notice), domain (links in emails) |
| Settings | Shipping | Zones and prices **from `pricing.SHIPPING`** (today Switzerland "from $18" vs $12 charged); pickup time; lab mode |
| Settings | Payments & tax | Rows of 03 + VAT regime switch + business config (rates, thresholds, URSSAF frequency, ACRE, versement libératoire) |
| Settings | Team & roles | Invite → invited staff can sign in (mock) with role; change role; remove (not owner); permission grid includes Marketing, Analytics, Reviews |
| Settings | Security | Session length enforced, 2FA per staff, sign-out all sessions, audit log viewer (filters, export) |
| Settings | Integrations | 03 |
| Settings | Simulation (added) | 01 §7 |
| Alerts (phone) | Push topics | Used by the notifier: a topic off means no toast/push for it |
