# Voice, copy & emails

Exact screen copy: `reference/copy/<Board>.txt`. Use it verbatim; new copy follows the rules below.

## Voice (board BrandVoice)

Geste talks like a calm studio assistant standing next to you: short, concrete, a bit dry, never cheering.

| Rule | Do | Don't |
| --- | --- | --- |
| Concrete | "Four wide strokes of turquoise, bottom left." | "Unleash your inner artist!" |
| Calm | "Stop earlier than you think." | "Amazing!! You're crushing it!!" |
| Honest | "Yours will not look like the preview." | "Get a gallery painting guaranteed." |

- Sentence case everywhere. No exclamation marks. Numbers as digits ("3 layers", "45 min").
- Works are named "N°03". Formats "60×80" (× sign), turned for a landscape work ("80×60"); print sizes "S", "M", "L" with their dimensions ("30 × 42 cm · A3"). "Signature" for the Signature works.
- Prices "$19", "from $12". Durations "3h30", "1h".
- Errors say what to do: "Check your postcode", "Enter your postcode".
- Buttons are verbs: "Add to cart", "Continue to shipping", "Open my library", "Next step".

## Emails (board BrandEmails)

600 px wide, same type, black button, one goal per email. React Email templates in `src/emails/`. Footer "Geste Studio · Lyon" + "Help · Unsubscribe" (unsubscribe only on marketing).

| Template | Subject | Trigger | Content |
| --- | --- | --- | --- |
| `receipt` | "Your guide is ready — N°03" | payment succeeded | "Thank you, Camille. N°03 is in your library." · lines · Paid · "Open my library →" (magic link) · print line "Your print ships within 48h. Order #GS-2041." |
| `login-code` | "Your Geste login code" | OTP request | "Here is your code to open your library:" · 6 digits · "expires in 10 minutes" · "Did not ask for it? Ignore this email, nothing will happen." |
| `password-reset` | "Choose a new password" | reset request | link valid 30 minutes; "If it was not you, ignore this email. Your password stays the same." |
| `shipped` | "N°07 is on its way" | mark shipped | carrier, tracking, estimated date, "Track the parcel →", unrolling advice |
| `gift-card` | "A Geste gift card from {sender}" | send_at | amount, code, message, "Choose a work →" |
| `new-device` | "New sign-in to your library" | 4th device | device, time, "Not you? Secure my account" |
| `support-reply` | "Re: {subject}" | staff reply | reply body, thread link |
| `review-request` | "How did N°03 turn out?" | 7 days after `guide_completed` | ask for a photo, "Share my result →" |
| `edition-apology` | "About your print of N°07" | edition sold out during payment | what happened, refund done or next size offered |
| `newsletter` | campaign subject | campaign | markdown body, work cards |
| `staff-invite` | "Join Geste admin" | invite | role, accept link (expires 7 days) |

## Localisation

`messages/en.json` and `messages/fr.json` (next-intl). Keys by screen (`shop.filters.level`). French keeps the same voice; "N°" stays; prices stay in USD with French formatting ("19 $US" is avoided: display "$19"). Legal texts are separate documents per locale.
