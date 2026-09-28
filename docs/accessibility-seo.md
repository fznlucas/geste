# Accessibility, performance, SEO, analytics

Target: WCAG 2.2 AA; Lighthouse ≥ 95 (mobile) on `/`, `/shop`, `/works/[slug]`.

## Accessibility

| Area | Requirement |
| --- | --- |
| Contrast | Ink on Paper 18.9:1, Stone on Paper 5.1:1, Signal on Paper 6.3:1. Stone never on Sand |
| Keyboard | All controls reachable in visual order; visible focus ring; ← → in the reader; Escape closes overlays; focus returns to the trigger |
| Targets | ≥ 44 px (48 px primary); dense admin pills 32 px only on desktop |
| Names | Icon-only controls have `aria-label` ("Cart, 2 items"); logo link "geste.studio, home" |
| Status | Dot + word, never colour alone |
| Forms | Labels always present (visually hidden only when obvious), errors linked with `aria-describedby`, `role=alert` |
| Charts | Hover and focus tooltips, plus a visually hidden table of the same values |
| Motion | `prefers-reduced-motion` removes pen, morph, slides |
| Timer | `role=timer`, announces every 5 minutes and at zero via a polite live region |
| Language | `<html lang>` follows EN/FR |
| Tests | axe in Playwright on every route; manual VoiceOver pass on checkout and reader before launch |

## Performance budget

| Metric | Budget |
| --- | --- |
| LCP (mobile, 4G) | < 2.0 s |
| CLS | < 0.05 (fixed 4:5 image boxes) |
| INP | < 200 ms |
| JS on shop/work pages | < 120 kB gzip |
| Images | next/image, AVIF/WebP, `sizes` set, priority only on the first row |
| Fonts | next/font, 2 weights, swap |

## SEO

- Server-rendered pages; `generateMetadata` per work from `works.seo_title/seo_description`.
- JSON-LD: `Product` (name "Guide N°03", offers lowPrice/highPrice in USD, availability) on work pages; `Organization` on home; `Article` on journal posts.
- `sitemap.ts` (works, journal, legal), `robots.ts` (disallow `/admin`, `/learn`, `/account`, `/checkout`).
- hreflang en/fr; canonical without query strings except `format` is dropped from canonical.
- OG image per work: artwork left, "N°03 · paint it yourself" in JetBrains Mono (board BrandFavicon).

## Analytics events (PostHog; Plausible for page views)

| Event | Properties | Fired |
| --- | --- | --- |
| `view_work` | work, source | work page view |
| `configure` | work, format, level, palette | configurator change (debounced) |
| `add_to_cart` | kind, work, price | add |
| `begin_checkout` | items, value | checkout step 1 |
| `checkout_step` | step | each step |
| `purchase` | order, value, items | server, webhook |
| `guide_opened` | entitlement, work | first open |
| `guide_step_viewed` | entitlement, step | each step |
| `guide_completed` | entitlement, minutes | last step |
| `timer_started` / `timer_skipped` | layer | reader |
| `pdf_printed` | entitlement, prints_left | PDF route |
| `affiliate_click` | item, option, url | shopping list |
| `result_shared` | work | review with photo |

The admin Analytics module reads these through the PostHog query API.
