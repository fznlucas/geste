# Cart & checkout

## Cart drawer

- **Boards:** Cart (drawer over the page), MCart (full screen).
- **Content:** "Cart (2)" + Close · CartLine per item ("N°03 — Guide · $19 · 60×80 · Intermediate · Original · + shopping list · Remove"; "N°07 — Print · $45 · A3 · Cotton paper · Edition 12/50 · Signed, with certificate · Remove") · cross-sell line ("Paint N°07 yourself instead? Guide from $12. See it") · Subtotal · Shipping "from $4, next step" · Estimated total · primary "Checkout   $68" · "Guides unlock instantly in your library. Prints ship in 3–5 days."
- **Empty:** "Your cart is empty. Browse the shop."
- **Acceptance:** opening moves focus into the drawer; Escape closes and returns focus; totals match the checkout.

## Checkout — `/checkout`

- **Boards:** Checkout (1440 × 1500, tweak `paymentOutcome`: success / declined / 3ds / soldout), MCheckout (tweak `sampleData`).
- **Layout desktop:** breadcrumb "Cart / Checkout" · CheckoutStepper "01 Contact — 02 Shipping — 03 Payment — 04 Confirmation" · left column the current step · right column "Order summary" (CartLines compact, "Gift card or promo code" + Apply, CartSummary "Including VAT $10.67", reassurance lines: "Secure payment · 3D Secure", "Guides unlock instantly", "Free returns on prints within 14 days", "Questions? hello@geste.studio").
- **Step 01 Contact:** ExpressPay block · "Contact" + "Have an account? Log in" · Email ("Email — where your guides are sent"), First name, Last name, Phone ("for the carrier, optional", only with prints) · "Your library" explainer: "We create it with this email. Log in later with a code sent by email, or choose a password below." · optional password · newsletter checkbox ("Send me new works and methods. About twice a month, unsubscribe anytime.") · "Continue to shipping →".
- **Step 02 Shipping** (skipped when the cart has no print): address (country select first), carrier options with price and delay, "Continue to payment →".
- **Step 03 Payment:** Stripe Payment Element; withdrawal-waiver checkbox when a guide is in the cart; "Pay $64 →".
- **Step 04 Confirmation:** summary column disappears; "Thank you, Camille." · guide ready → "Open your guide" · print → "We'll email the tracking link" · receipt sent to {email}. Steps are no longer clickable.
- **Errors:** field errors inline in Signal; steps with errors show a Signal dot in the stepper; declined → Modal; sold-out edition → message with the next number or refund.
- **Server:** `createPaymentIntent` recomputes everything; the client never sends prices.
- **Events:** `begin_checkout`, `checkout_step`, (server) `purchase`.
- **Acceptance:** guest can pay without an account; completed steps are clickable; every outcome of the tweak is reproducible with Stripe test cards (4000 0000 0000 0002 declined, 4000 0027 6000 3184 3DS); a double click on Pay cannot create two charges.
