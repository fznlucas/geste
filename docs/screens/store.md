# Store screens

## Layout (all store pages)

- **Boards:** any desktop store board (header/footer), MHome/MMenu (phone header, menu), Cart.
- **Desktop header:** logo left (pencil on hover) · nav "Shop Prints Method Journal About" next to the icons · account icon · cart icon + "(n)". Padding 8 × 32, no bottom rule.
- **Phone header:** logo · account · cart (n) · "Menu" (opens MobileMenu drawer).
- **Footer:** newsletter ("Letters from the studio. New works, new methods.") spanning 2 columns, then Shop / Help / Studio / Legal columns; bottom row "© 2026 Geste Studio — Lyon, France" and "USD $ · EN FR".
- **Components:** SiteHeader, MobileHeader, MobileMenu, SiteFooter, Drawer (cart), ToastProvider.
- **Acceptance:** header and footer identical on every store page; cart count updates without reload; EN/FR switch keeps the current path.

## Home — `/`

- **Boards:** Home (1440 × 3200), MHome.
- **Sections (top → bottom):** hero with the featured work and "Paint it yourself." + lead + "Browse all works" / "Start with N°03" · How it works (01 Choose, 02 Get, 03 Paint) + "Read the method" · New works row (5 WorkCards) + "See all 15 works" · Limited prints (3 editions) · From the journal (2 articles). No reviews section and no newsletter block: the footer has the newsletter (Home board; see docs/decisions.md).
- **Data:** live works ordered by `sort_order`; hero from `site_settings.home.hero_work`; featured reviews; 3 latest articles.
- **Events:** `view_work` source=home on card click.
- **Acceptance:** LCP image is the hero; no layout shift; works row prices follow `cardPriceCents(default_format)`.

## Shop — `/shop`

- **Boards:** Shop (1440 × 1760), MShop.
- **Layout:** title line "“Paint it yourself.” Each work comes with its method, materials and step-by-step guide." · filters "Level: All Beginner Intermediate Advanced" and "Palette: All Warm Cool Earth" (Segmented, in the URL) · count "15 works" · grid 5 × 208 px (40 px gaps, 64 px row gap), all images the same 4:5 size; phone 2 columns with meta always visible.
- **Card:** WorkCard — image only, meta line "Level · time" left and "from $X" right appears with the price morph on hover/focus. No image hover.
- **Empty:** "No work matches these filters. Clear filters."
- **Acceptance:** filters keep scroll position and are shareable; keyboard focus shows the meta line.

## Work page — `/works/[slug]`

- **Boards:** Product (template), Product01–15, MProduct, MProduct01–15.
- **Layout desktop:** breadcrumb "Shop / N°03" · left: ProductGallery (Preview · Real result, caption "Original palette, 60×80") · right: N°03, price, description, GuideConfigurator, then Accordion ("The guide · 4 steps", "Included · 2 items", "Shipping & returns").
- **Configurator:** see `src/components/commerce/GuideConfigurator.tsx` doc comment. Price = `pricing.ts`. Palette changes the preview with `palettes.preview_filter`.
- **Phone:** gallery, title/price on one line, configurator, and StickyBuyBar always pinned to the bottom ("N°03 · 60×80 / Guide + list · Add $19", board MProduct), so Buy is visible without scrolling at 390 × 844.
- **Copy under the button:** "Digital preview. A similar original sells from $600: yours will be signed by you. Guide unlocks instantly, prints ship in 3–5 days."
- **Data:** work, active formats, palettes, published guide summary (steps count), edition stock (for the print option).
- **Events:** `view_work`, `configure`, `add_to_cart`.
- **Acceptance:** Buy button above the fold at 1440 × 900 and 390 × 844 (Playwright assertion); URL reproduces the configuration; JSON-LD Product valid.

## Shopping list — `/works/[slug]/list`

- **Boards:** ShoppingList, MShoppingList.
- **Layout:** breadcrumb "Library / N°03 / Shopping list" · thumbnail + "Shopping list" + "N°03 · 60×80 · Intermediate · Original palette" · "Standard / Budget" + "0 of 10 already at home" · ShoppingListTable (tick what you already have; "Find it" to the partner shop) · "From your kitchen" panel · side panel "Estimated budget": Still to buy, Full list, disclosure "Prices are indicative. Links may earn the studio a small commission, at no cost to you.", "Email me this list →", "Open the guide".
- **Data:** format, level and palette from the work page link (?format=&level=&palette=).
- **Acceptance:** labels change with the format; each link opens in a new tab with `rel="noopener sponsored"` and fires `affiliate_click`.

## Prints — `/prints`, `/prints/[slug]`

- `/prints` has no board: it shows the leading print (N°07).

- **Boards:** Print (1440 × 2000), MPrint.
- **Layout:** artwork on a Sand mat · size choice (A3 $45, A2 $75, 50×70 $95) · EditionCounter ("12 of 50 left", Signal when ≤ 5) · paper, signature and certificate details · "Add to cart" · cross-sell "Paint it yourself instead? Guide from $12".
- **Acceptance:** stock is live (not cached); sold-out sizes are disabled with "Sold out".

## Gift cards — `/gift-cards`

- **Boards:** GiftCard, MGiftCard. Amounts $15 / $30 / $50 / $100 / $150 (what each covers under them), card design (N°03, N°07, N°01), their name, your name, their email, message, "Send it: Now / On a date". Live preview of the card. Delivered by email at the chosen date (cron). Code format `GESTE-XXXX-XXXX`.

## Method `/method`, About `/about`, Journal `/journal` + `/journal/[slug]`, Help `/help`, Legal `/legal/[doc]`

- **Boards:** Method (2480 tall), About, Journal, Article, Help, Legal (+ phone twins). Content from `articles` and `legal_documents` where applicable; Method and About are static MDX.
- **About** must state the AI's role honestly (works are designed with AI tools, then tested and painted by hand in the studio).
- **Help** tabs match the board; the contact form creates a `support_threads` row.

## Tracking — `/track/[orderId]?t=`

- **Boards:** Tracking, MTracking. Timeline Paid → Printed & signed → Shipped → Delivered with dates, carrier link. Token-protected link from the shipping email; no login required.

## 404

- **Boards:** NotFound, MNotFound. One sentence, links to Shop and Home.
