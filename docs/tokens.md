# Design tokens

Source of truth: `tokens/tokens.json` (W3C Design Tokens format). Generated outputs: `tokens/tokens.css` (CSS variables), `tokens/theme.css` (Tailwind 4 `@theme`), `tokens/tailwind.preset.ts` (Tailwind 3). Components use **semantic** names only.

The interface is colourless so the paintings carry the colour: 7 brand colours, 1 typeface, 6 sizes, sharp corners.

## Colour

| Token | Tailwind | Value | Brand | Use |
| --- | --- | --- | --- | --- |
| `--color-bg` | `bg-bg` | #FAFAF8 | Paper | Page background |
| `--color-surface` | `bg-surface` | #FFFFFF | — | Inputs, admin boxes |
| `--color-surface-muted` | `bg-surface-muted` | #F1EEEA | Mist | Panels, tips, image grounds, ghost hover, skeletons |
| `--color-surface-sunk` | `bg-surface-sunk` | #EDEAE5 | Sand | Print mats, packaging |
| `--color-surface-hover` | `bg-surface-hover` | #F4F1ED | — | Table row hover, kanban columns |
| `--color-fg` | `text-fg` | #111111 | Ink | Text, primary buttons, rules that matter |
| `--color-fg-muted` | `text-fg-muted` | #6F6A64 | Stone | Secondary text (5.1:1 on Paper). Never on Sand (4.46:1 fails) |
| `--color-fg-inverse` | `text-fg-inverse` | #FAFAF8 | Paper | Text on Ink |
| `--color-fg-muted-on-dark` | `text-fg-muted-on-dark` | #A9A39C | — | Stone on Ink |
| `--color-border` | `border-border` | #E4DFD8 | Line | Dividers, empty progress |
| `--color-border-field` | `border-border-field` | #D8D3CC | — | Inputs, pills, swatch outlines |
| `--color-border-dashed` | `border-border-dashed` | #BDB6AD | — | Upload zones, clear-space guides |
| `--color-action-hover` | `bg-action-hover` | #2E2B28 | — | Primary button hover/active |
| `--color-danger` | `text-danger` | #B3261E | Signal | Errors, destructive, urgent status (6.3:1 on Paper) |
| `--color-scrim` | `bg-scrim` | rgba(17,17,17,.24) | — | Behind drawers and modals |

No accent colour. Paint colours (guide plates, palettes, diagrams) are **content** stored in the database, never tokens.

## Type

JetBrains Mono 400 and 500 only. Sentence case. No italic, no uppercase, no letter-spaced labels. Headings weight 500, tracking −2%.

| Token | Tailwind | Size / line | Weight | Use |
| --- | --- | --- | --- | --- |
| xs | `text-xs` | 12 / 20 | 400 | Default for everything: body, UI, buttons, labels |
| sm | `text-sm` | 14 / 22 | 400 | Phone step text, emphasis |
| md | `text-md` | 22 / 30 | 500 | Desktop reader step text, phone page titles, mobile menu |
| lg | `text-lg` | 28 / 34 | 500 | Page and section titles, KPI values |
| xl | `text-xl` | 40 / 46 | 500 | Hero lines |
| 2xl | `text-2xl` | 96 / 96 | 500 | Drying timer digits (tabular) |
| admin-title | `text-admin-title` | 20 / 24 | 500 | Admin page title only |

Emphasis = weight 500 or Ink vs Stone. Links are underlined with offset 3–4 px only where the board underlines them.

## Space

Tailwind spacing unit is **1 px** (`--spacing: 1px`), so utilities read in pixels: `p-16`, `gap-24`, `mt-40`. Allowed steps: 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32, 40, 48, 56, 64, 72, 80.

| Pattern | Value |
| --- | --- |
| Page padding | 16 phone · 32 desktop (store header 8 × 32) |
| Section rhythm | 48 phone · 72 desktop |
| Shop grid | 5 × 208 px columns, 40 px column gap, 64 px row gap (1200 px) |
| Admin | sidebar 232, top bar 14 × 32, main 24 32 40, gaps 16/24 |
| Form | label → field 6, field → field 14–20 |

## Shape, elevation, layers

| Group | Value |
| --- | --- |
| Radius | 0 everywhere · `rounded-bar` 3 px on chart bar data ends · `rounded-full` status dots |
| Border | 1 px · focus ring 1 px Ink, offset 2–3 px (`outline-offset-3` on buttons) |
| Shadows | `shadow-pop` 0 16 40 rgba(17,17,17,.16) menus/popovers · `shadow-modal` 0 20 48 rgba(17,17,17,.18) · nothing else (no card shadows, no image shadows) |
| Z-index | base 0 · sticky 10 · popover 20 · drawer 30 · modal 40 · toast 50 (`z-sticky`…`z-toast`) |
| Hit targets | 44 px min · 48 px primary · 32 px dense admin |

## Icons

20 icons in `src/components/brand/Icon.tsx`, drawn on a 12 px grid with the stroke weight of JetBrains Mono at 12 px: 1.1 px, butt caps, miter joins, `currentColor`. Sizes 12 (UI), 16, 24, 48. Never mix with another icon set; draw new icons on the same grid.

## Breakpoints

| Name | Range | Designed at |
| --- | --- | --- |
| phone (default) | 0–767 | 390 × 844 (M* boards) |
| `md` | 768–1199 | interpolate: 8 columns, shop 3 columns |
| `lg` | ≥ 1200 | 1440 × 900 (desktop boards) |
