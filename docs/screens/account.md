# Account screens

## Log in — `/login`

- **Boards:** Login (states: password, code, forgot, reset), MLogin.
- **Layout:** "Log in" · Email · Password (Show) · "Keep me logged in" · "Forgot password?" · primary "Log in →" · "or" · ghost "Use a passkey (Face ID, Touch ID)" · ghost "Email me a login code" · "No account yet? Create one, or buy a guide: your library is created with your first purchase."
- **Code state:** OtpInput 6 digits, "Resend code" after 30 s, auto-submit.
- **Forgot / reset:** email → link → new password with strength meter.
- **Security:** rate limited; generic error "Email or password is incorrect".
- **Acceptance:** all three methods work; `next` param honoured.

## Register — `/register`

- **Boards:** Register, MRegister. Email, name, optional password (strength meter), newsletter checkbox, terms line. After first login, offer to add a passkey.

## Library — `/account`

- **Boards:** Account, MAccount.
- **Layout:** "Hi Camille" · tabs Library / Orders / Settings / Log out · "Library · 3 guides" · one row per entitlement: thumbnail, N°, "Available offline", "60×80 · Intermediate · Original palette", progress ("Layer 2 of 3" / "Not started" / "Finished · signed 12 Sept"), primary Continue/Start/Open →, links "Shopping list", "Print · 2 left" · banner "Finished N°07? Show us. Upload a photo and get feedback from the studio." + Upload (creates a pending review with photo).
- **Empty:** "No guides yet. Browse the shop."
- **Acceptance:** progress matches the reader; "Print · n left" matches `prints_left`.

## Orders — `/account/orders`

- **Boards:** Orders, MOrders. List of orders with number, date, items, total, status chip; invoice PDF; tracking link for prints.

## Settings — `/account/settings`

- **Boards:** Settings (1440 × 1700), MSettings. Sections: profile (name, email with re-verification), sign-in (password, passkeys list, devices with "Sign out"), language EN/FR, newsletter, reader (timer sound), privacy ("Download my data", "Delete my account" with confirmation — 30-day grace).
