# Admin screens

The full module list, data and actions are in `docs/admin.md`. Exact words: `reference/copy/Admin*.txt`.

| Screen | Board | Acceptance |
| --- | --- | --- |
| Log in | AdminLogin | Password or passkey, then 6-digit TOTP; failed attempts rate-limited and logged |
| Dashboard | AdminDashboard | KPI tiles link to their module; chart 7/30/90 d with tooltips; to-do counts match `v_todo_counts` |
| Orders | AdminOrders | Tabs All / To ship / Issues / Done; type pills; selection bar with Print labels, Mark as shipped, Export CSV |
| Order detail | AdminOrderDetail | Label, tracking, certificate, mark shipped (emails customer), resend access/receipt, invoice, refund modal (3 options, reason, restock), timeline + notes |
| Fulfilment | AdminFulfilment | 4 columns, ← / next buttons, counts per column, pickup note |
| Editions | AdminEditions | Sold/edition bars, reserved, left (Signal ≤ 5), close/reopen, certificate log |
| Works | AdminCatalog | Grid/list, tabs All/Live/Drafts/Needs test, "New work", "Generate with AI" |
| Work editor | AdminWorkEditor | 6 tabs, publishing panel, checklist blocks Live until complete |
| Guide editor | AdminGuideEditor | Tree of layers/steps, diagram, step form, autosave draft, Publish creates a version |
| AI pipeline | AdminAIPipeline | Form, running jobs with progress, candidates with similarity/strokes, approve/reject, GPU budget |
| Customers | AdminCustomers | Segments, search, export |
| Customer detail | AdminCustomerDetail | Library progress, orders, results, login link, reset prints, GDPR export/delete (2-step) |
| Support | AdminSupport | 3 panes, saved replies fill the draft, send, done/reopen |
| Reviews | AdminReviews | Approve / Feature / Hide, tabs by status |
| Analytics | AdminAnalytics | Funnel, sources, completion by step with the two drop-offs explained, devices, level mix, repeat rate |
| Finance | AdminFinance | KPI row, P&L table, VAT by country, threshold bar, payouts, CSV export |
| Marketing | AdminMarketing | Tabs Promo codes / Gift cards / Newsletter / Affiliate / Social calendar |
| Content | AdminContent | Journal list, home hero, translation progress, legal versions |
| Settings | AdminSettings | Tabs Store / Shipping / Payments & tax / Team & roles / Security / Integrations; invite + PermissionMatrix; audit log |
| Phone: Today, To ship, Order, Alerts | AdminMToday, AdminMOrders, AdminMOrder, AdminMAlerts | Bottom tabs; mark shipped in one tap; barcode scan; push toggles |

**Mock (M6, done):** every screen above is built on the mock (docs/mock-plan.md M6) and measured against its board; where the mock data or a rule wins over a board, see docs/decisions.md "Admin … (M6)". Not in the mock: real rate limiting of failed logins, Boxtal labels, emails, PostHog/Stripe data (mock tables).
