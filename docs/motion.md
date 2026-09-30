# Motion

Motion is rare and slow enough to feel drawn. Nothing loops, nothing bounces, nothing flies. Every animation is off under `prefers-reduced-motion` (end state shown at once: CSS variables drop to 0 ms in `tokens.css`, and `theme.css` forces 0 ms globally). All values live in `src/lib/motion.ts`.

| Token | Value | Use |
| --- | --- | --- |
| `ease.standard` | cubic-bezier(.4, 0, .2, 1) | Fades, drawers, price morph, accordions |
| `ease.pen` | cubic-bezier(.45, .05, .55, .95) | Logo strokes |
| `duration.fast` | 150 ms | Hover colour, focus, cart count |
| `duration.base` | 240 ms | Accordion, tabs, modal, toast in |
| `duration.step` | 320 ms | Reader step change, progress segment |
| `duration.morph` | 380 ms (letter-spacing 440 ms) | Work card price morph |
| `duration.panel` | 420 ms | Cart drawer, phone menu, sticky buy bar |
| `duration.toastStore` / `toastAdmin` | 4000 / 1600 ms | Auto-dismiss |
| `duration.addedLabel` | 1600 ms | "Added" on the add-to-cart button |

## 1 · Logo pencil (hover, desktop)

The wordmark is filled type. On hover or keyboard focus of the logo link, "geste" is hidden by a mask and redrawn along 7 centre-line strokes (`stroke-dashoffset` 1 → 0, `pathLength=1`, stroke 150 units, round caps). ".studio" never moves. Mouse leave resets instantly. Never on page load, never looped, never on touch devices.

| Stroke | Letter | Starts | Duration |
| --- | --- | --- | --- |
| 1 | g, bowl | 0 ms | 230 ms |
| 2 | g, tail | 210 ms | 190 ms |
| 3 | e | 380 ms | 300 ms |
| 4 | s | 660 ms | 300 ms |
| 5 | t, stem | 940 ms | 170 ms |
| 6 | t, cross bar | 1090 ms | 110 ms |
| 7 | e | 1180 ms | 300 ms |

Each stroke starts 20 ms before the previous ends; total 1.48 s. Implementation: `Logo` with `animateOnHover` (it sets dashoffset 1 without transition, waits 40 ms, then transitions to 0 with per-stroke delays).

## 2 · Price morph (work cards)

| Property | Hidden | Shown | Duration |
| --- | --- | --- | --- |
| opacity | 0 | 1 | 380 ms |
| filter | blur(4px) | blur(0) | 380 ms |
| letter-spacing | 0.25em | 0 | 440 ms |
| transform | translateY(3px) | none | 380 ms |

Trigger: hover and keyboard focus of the card link. The image never scales, fades or moves. On touch screens the meta line is always shown.

## 3 · Cart drawer and phone menu

Panel translates from 100% to 0 in 420 ms (standard ease); scrim fades 0 → rgba(17,17,17,.24) in 420 ms. Close reverses. Escape and scrim click close. Focus is trapped inside, then returns to the trigger. Body scroll is locked.

## 4 · Modals

Scrim fade + panel fade and 8 px rise, 240 ms. No scale.

## 5 · Add to cart

Button trailing price → "✓" and label "Added" for 1.6 s, then back. Header count cross-fades (150 ms). The drawer does **not** open automatically on desktop; on phone a toast "Added to cart · View" appears for 4 s.

## 6 · Sticky buy bar (phone product page)

Appears when the in-page Buy button leaves the viewport (IntersectionObserver): translateY(100%) → 0, 420 ms. Hides when the button is visible again.

## 7 · Guide reader

Step change: text cross-fades and slides 8 px in the direction of travel (320 ms); the diagram cross-fades between layers; the current progress segment grows from 4 to 6 px. Timer digits change every second with no animation. At zero: optional soft sound (opt-in in settings) + system notification.

## 8 · Accordion

Height from 0 to content (`--radix-accordion-content-height`), 240 ms. Plus/minus swap without rotation.

## Don'ts

No parallax, no scroll-triggered reveals, no skeleton shimmer, no page transitions, no confetti on purchase, no hover zoom on artworks. The loupe (`LightboxZoom`, work and print pages) is not a hover zoom: it opens on a click, fades in 240 ms, zooms ×2.5 in 240 ms on a click or a double-tap, then the picture follows the cursor without easing; nothing under reduced motion.
