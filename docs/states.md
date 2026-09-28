# States & interactions

Every interactive element implements these states. The `/kit` page shows them; the canvas board "Dev — design system" draws them.

| Component | Default | Hover | Focus-visible | Active / selected | Disabled | Error | Loading |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Button primary | Ink fill, Paper text, label left, trailing (→, price, +) right, 48 px | #2E2B28 | 1 px Ink ring, offset 3 | #2E2B28 | 40% opacity, not-allowed | — | label kept, trailing → 3 pulsing squares, `aria-busy` |
| Button ghost | 1 px Ink border, centred, 44 px | Mist fill | ring | Mist | 40% | — | same |
| Button danger | Signal border + text | Mist fill | ring | — | 40% | — | same |
| Text button / link | Ink | Stone; links underline | ring offset 2 | underline, `aria-pressed` | Stone | — | — |
| Icon button | icon (+count) | Stone | ring | — | — | — | — |
| Input / textarea / select | White, 1 px #D8D3CC, 44 px, Stone placeholder | — | Ink border | — | Mist fill, Stone text | Signal border + message below (`role=alert`, `aria-invalid`, `aria-describedby`) | — |
| OTP | 6 × 44 px boxes | — | Ink border on the box | — | — | Signal borders | auto-submit on 6th digit |
| Checkbox | 14 px, Ink border | — | ring | Ink fill, Paper check | 40% | Signal border | — |
| Switch | 28 × 16 track, Ink border, knob left | — | ring | Ink track, Paper knob right | 40% | — | — |
| Segmented | Stone words | Ink | ring | Ink + underline offset 4, `aria-checked` | line-through, 40% | — | — |
| Tabs | Stone | Ink | ring | Ink + 2 px Ink bar | — | — | — |
| Accordion row | title + plus | Stone | ring | minus, panel open (240 ms) | — | — | — |
| Work card | image, meta hidden | meta + price morph in (380 ms) | same as hover, ring offset 8 | — | Sold out: image 60%, "Sold out" | — | Mist 4:5 block |
| Palette chip | 3 swatches + name (Stone) | outline #D8D3CC | ring | 1 px Ink outline, name Ink | — | — | — |
| Cart count | "(n)" | Stone | ring | cross-fade 150 ms on change | — | — | — |
| Checkout step | Stone upcoming | underline if completed | ring | current: Ink + underline | upcoming not clickable | Signal word + dot | — |
| Table row | 44 px, Line rule | #F4F1ED | ring | checkbox + Ink bulk bar | — | Signal status chip | 6 Mist skeleton rows |
| Status chip | dot + word | — | — | — | off: grey dot, Stone | issue: Signal dot + word | — |

## Screen states (every route)

| State | Pattern |
| --- | --- |
| Empty | One Stone sentence + one action. "No guides yet. Browse the shop." |
| Loading | Keep the layout; Mist blocks where content goes. No spinners, no shimmer. |
| Error (field) | Signal message under the field, focus moves to the first error on submit. |
| Error (page) | NotFound layout with a sentence and "Try again". Sentry captures. |
| Signed out | Account and reader routes redirect to `/login?next=…`. |
| Offline (reader) | Banner "Offline — your guides are saved on this device". Buying disabled. |
| Guest | Checkout works without an account; the receipt explains how to log in with a code. |

## Checkout outcomes (board Checkout, tweak `paymentOutcome`)

| Outcome | What the user sees |
| --- | --- |
| success | Step 04 Confirmation, summary hidden, "Your guide is in your library" + button, receipt sent |
| declined | Modal "Payment declined. No money was taken." — "Use another card" / "Try again" |
| 3ds | Bank challenge in place (Stripe), then success or declined |
| soldout | The A3 edition sold out during payment: "12/50 went a second ago — you have 13/50" (next number assigned) or, if none left, refund offered |

## Forms

- Validate on blur, re-validate on input once a field has an error, validate all on submit.
- Messages are specific: "Enter your postcode", "Check your postcode", never "Invalid".
- Email field label on checkout: "Email — where your guides are sent".
