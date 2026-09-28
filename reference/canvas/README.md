# Canvas boards (reference)

Snapshot of the validated Design canvas: 125 boards (`*.dc.html`) + `canvas.json` (pages and positions).

- Open a board in a browser: `npx serve reference/canvas` then visit `/Home.dc.html`. `support.js` here is a **static preview renderer** (default state, no interactions). The live canvas (Lucas's Design artifact) is interactive and is the true reference.
- Artwork images point to `../../public/mock/work-XX.jpg`, so boards open with their images.
- Exact values (spacing, sizes, colours) can be read from the inline styles. States and logic are in each board's `<script type="text/x-dc">` class: `renderVals()` shows what changes per state.
- `reference/copy/<Board>.txt` holds each board's visible text.

| Canvas page | Boards |
| --- | --- |
| Desktop — full site | Home, Shop, Product, Print, ShoppingList, Cart, Checkout, Login, Register, Account, Orders, Settings, Method, About, Journal, Article, Help, Legal, NotFound, GiftCard, Tracking, GuideReader |
| Desktop — product pages | Product01–15 |
| Phone — full site & app | MHome, MMenu, MShop, MProduct, MPrint, MCart, MCheckout, MShoppingList, MLogin, MRegister, MAccount, MOrders, MSettings, MTracking, MMethod, MAbout, MJournal, MArticle, MHelp, MLegal, MGiftCard, MNotFound, AppStep, AppTimer, AppPrint |
| Phone — product pages | MProduct01–15 |
| Guide N°03 | Guide01–08 (A4 PDF pages) |
| Brand system | BrandLogo, BrandColor, BrandType, BrandIcons, BrandVoice, BrandPackaging, BrandSocial, BrandFavicon, BrandEmails |
| Brand — explorations | Main, Icon, Lockups, Mark (history, not to build) |
| Admin — back-office | AdminLogin, AdminDashboard, AdminOrders, AdminOrderDetail, AdminFulfilment, AdminEditions, AdminCatalog, AdminWorkEditor, AdminGuideEditor, AdminAIPipeline, AdminCustomers, AdminCustomerDetail, AdminSupport, AdminReviews, AdminAnalytics, AdminFinance, AdminMarketing, AdminContent, AdminSettings, AdminMToday, AdminMOrders, AdminMOrder, AdminMAlerts |
| Dev — design system | DS* boards: tokens, components in every state, motion, layout grids |
