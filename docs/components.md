# Components

Every component lives in `src/components/<layer>/<Name>.tsx`, is exported from `@/components`, and is shown in every state at `/kit` (`src/app/(dev)/kit/page.tsx`). Props below are extracted from the code; the code is the reference.

Rules: components own their colour, type and spacing; pages pass only layout classes (`className` for margins and grid placement). New variants are added here first, then drawn on the canvas board "Dev — design system".

| Layer | Component | File | Canvas boards |
| --- | --- | --- | --- |
| Brand | `Icon` | `src/components/brand/Icon.tsx` | BrandIcons |
| Brand | `Logo` | `src/components/brand/Logo.tsx` | BrandLogo, every header |
| Primitives | `Accordion` | `src/components/primitives/Accordion.tsx` | Product details, Help |
| Primitives | `Badge` | `src/components/primitives/Badge.tsx` | Admin sidebar |
| Primitives | `Button` | `src/components/primitives/Button.tsx` | all CTAs — Product, Checkout, Admin |
| Primitives | `Checkbox` | `src/components/primitives/Checkbox.tsx` | Checkout, Admin |
| Primitives | `RadioRows` | `src/components/primitives/RadioRows.tsx` | Checkout, MCheckout (delivery, payment method) |
| Primitives | `Field` | `src/components/primitives/Field.tsx` | Checkout, Login, Register, Settings |
| Primitives | `IconButton` | `src/components/primitives/IconButton.tsx` | headers |
| Primitives | `Input` | `src/components/primitives/Input.tsx` | Checkout, Admin |
| Primitives | `OtpInput` | `src/components/primitives/OtpInput.tsx` | Login (code), AdminLogin |
| Primitives | `PasswordInput` | `src/components/primitives/PasswordInput.tsx` | Login, Register, Settings |
| Primitives | `Pill` | `src/components/primitives/Pill.tsx` | Admin filters |
| Primitives | `ProgressBar` | `src/components/primitives/ProgressBar.tsx` | Account library, AdminEditions |
| Primitives | `Segmented` | `src/components/primitives/Segmented.tsx` | Product (format, level), Shop filters |
| Primitives | `StatusChip` | `src/components/primitives/StatusChip.tsx` | Orders, Admin |
| Primitives | `Switch` | `src/components/primitives/Switch.tsx` | Settings, AdminMAlerts |
| Primitives | `Tabs` | `src/components/primitives/Tabs.tsx` | Help, Account, Admin |
| Overlays | `Drawer` | `src/components/overlay/Drawer.tsx` | Cart, MMenu |
| Overlays | `Menu` | `src/components/overlay/Menu.tsx` | Account shortcuts |
| Overlays | `Modal` | `src/components/overlay/Modal.tsx` | Checkout errors, AdminOrderDetail refund |
| Overlays | `Popover` | `src/components/overlay/Popover.tsx` | Admin alerts |
| Overlays | `Toast` | `src/components/overlay/Toast.tsx` | Add to cart, admin saves |
| Overlays | `Tooltip` | `src/components/overlay/Tooltip.tsx` | Admin charts |
| Layout | `MobileHeader` | `src/components/layout/MobileHeader.tsx` | all phone pages |
| Layout | `MobileMenu` | `src/components/layout/MobileMenu.tsx` | MMenu |
| Layout | `SiteFooter` | `src/components/layout/SiteFooter.tsx` | all store pages |
| Layout | `SiteHeader` | `src/components/layout/SiteHeader.tsx` | all desktop pages |
| Layout | `Structure` | `src/components/layout/Structure.tsx` | all pages |
| Commerce | `CartLine` | `src/components/commerce/CartLine.tsx` | Cart, MCart, Checkout |
| Commerce | `CartSummary` | `src/components/commerce/CartSummary.tsx` | Checkout |
| Commerce | `CartPanel` | `src/components/commerce/CartPanel.tsx` | Cart (drawer), MCart (/cart) |
| Commerce | `ShoppingListTable` | `src/components/commerce/ShoppingListTable.tsx` | ShoppingList, MShoppingList |
| Commerce | `PrintMat` | `src/components/commerce/PrintMat.tsx` | Print, MPrint |
| Commerce | `PrintCard` | `src/components/commerce/PrintCard.tsx` | Print ("Other editions") |
| Commerce | `GiftCardPreview` | `src/components/commerce/GiftCardPreview.tsx` | GiftCard, MGiftCard |
| Layout | `ArticleCard` | `src/components/layout/ArticleCard.tsx` | Journal, MJournal, Article ("Keep reading") |
| Commerce | `CheckoutStepper` | `src/components/commerce/CheckoutStepper.tsx` | Checkout, MCheckout |
| Commerce | `EditionCounter` | `src/components/commerce/EditionCounter.tsx` | Print |
| Commerce | `ExpressPay` | `src/components/commerce/ExpressPay.tsx` | Checkout, MCheckout |
| Commerce | `OrderSummary`, `OrderSummaryToggle` | `src/components/commerce/OrderSummary.tsx` | Checkout, MCheckout |
| Commerce | `GuideConfigurator` | `src/components/commerce/GuideConfigurator.tsx` | Product, MProduct |
| Commerce | `PriceMorph` | `src/components/commerce/PriceMorph.tsx` | Shop, Home |
| Commerce | `ProductGallery` | `src/components/commerce/ProductGallery.tsx` | Product |
| Commerce | `ShoppingListItem` | `src/components/commerce/ShoppingListItem.tsx` | ShoppingList |
| Commerce | `StickyBuyBar` | `src/components/commerce/StickyBuyBar.tsx` | MProduct |
| Commerce | `WorkCard` | `src/components/commerce/WorkCard.tsx` | Shop, Home |
| Guide reader | `CanvasDiagram` | `src/components/reader/CanvasDiagram.tsx` | GuideReader, Guide01–08, AdminGuideEditor |
| Guide reader | `DryingTimer` | `src/components/reader/DryingTimer.tsx` | GuideReader timer, AppTimer |
| Guide reader | `PlateSwatch` | `src/components/reader/PlateSwatch.tsx` | GuideReader, AppStep |
| Guide reader | `StepCard` | `src/components/reader/StepCard.tsx` | GuideReader, AppStep |
| Guide reader | `StepProgress` | `src/components/reader/StepProgress.tsx` | GuideReader, AppStep |
| Admin | `AdminShell` | `src/components/admin/AdminShell.tsx` | every Admin board |
| Admin | `BarChart` | `src/components/admin/BarChart.tsx` | AdminDashboard |
| Admin | `DataTable` | `src/components/admin/DataTable.tsx` | AdminOrders, AdminCustomers |
| Admin | `HBar` | `src/components/admin/HBar.tsx` | AdminAnalytics, AdminDashboard |
| Admin | `KanbanBoard` | `src/components/admin/KanbanBoard.tsx` | AdminFulfilment |
| Admin | `KpiTile` | `src/components/admin/KpiTile.tsx` | AdminDashboard, AdminFinance |
| Admin | `PermissionMatrix` | `src/components/admin/PermissionMatrix.tsx` | AdminSettings |
| Admin | `Timeline` | `src/components/admin/Timeline.tsx` | AdminOrderDetail |

## Icon

`src/components/brand/Icon.tsx` · used on BrandIcons

```ts
export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: 12 | 16 | 24 | 48;
  /** Accessible name. Omit when the icon sits next to visible text (it is then aria-hidden). */
  label?: string;
}
```


## Logo

`src/components/brand/Logo.tsx` · used on BrandLogo, every header

**Logo** — The wordmark is typed, never redrawn: filled glyphs of JetBrains Mono 500. The pencil animation reveals "geste" through a mask of 7 centre-line strokes (stroke-dashoffset 1 -> 0 on pathLength=1). ".studio" never moves.

```ts
export interface LogoProps {
  /** Rendered height in px (cap box). Minimum 12. Header uses 12, footer 12, emails 24. */
  size?: number;
  /** "full" = geste.studio, "short" = geste (avatars, stamps, small spaces). */
  variant?: "full" | "short";
  /** "ink" on light grounds, "paper" on Ink. */
  tone?: "ink" | "paper";
  /** Draw the letters stroke by stroke on hover/focus of the closest link or button. Desktop only. */
  animateOnHover?: boolean;
  className?: string;
}
```


## Accordion

`src/components/primitives/Accordion.tsx` · used on Product details, Help

**Accordion** — Rows of 44 px with a Line rule; plus → minus; panel height animates 240 ms (off under reduced motion).

```ts
export interface AccordionItem {
  value: string;
  title: string;
  content: ReactNode;
}
```

```ts
export interface AccordionProps {
  items: AccordionItem[];
  /** Product page: "single" so the Buy button stays above the fold. FAQ: "multiple". */
  type?: "single" | "multiple";
  defaultValue?: string[];
}
```


## Badge

`src/components/primitives/Badge.tsx` · used on Admin sidebar

**Badge** — Count in a 1 px box (admin sidebar). Inverts with its row when the row is active.


## Button

`src/components/primitives/Button.tsx` · used on all CTAs — Product, Checkout, Admin

**LoadingDots** — Three dots pulsing in sequence; replaces the trailing arrow while loading.

**ButtonLink** — A `next/link` that looks like a Button ("Checkout   $68", "Browse works   →"). Same `variant`, `size`, `trailing`, `fullWidth`; takes `href` instead of `onClick`/`loading`.

```ts
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** md = 48 px primary / 44 px ghost. sm = 32 px dense (admin). */
  size?: "md" | "sm";
  /** Right-hand content on primary buttons: an arrow "→", a price "$19", "+". Label stays left. */
  trailing?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}
```


## Checkbox

`src/components/primitives/Checkbox.tsx` · used on Checkout, Admin

**Checkbox** — 14 px square, 1 px Ink border, Ink fill + Paper check when on. Whole row is the hit area: 44 px tall by default; `layout="inline"` (checkout) is the label's height, box top-aligned, text 23 px from the left edge as drawn.

```ts
export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
  invalid?: boolean;
  layout?: "row" | "inline";
}
```


## RadioRows

`src/components/primitives/RadioRows.tsx` · used on Checkout, MCheckout

**RadioRows** — Stacked white rows sharing their borders (delivery: 56 px with a Stone second line and the price; payment method: 52 px with a Stone note). 10 px ring, filled Ink when selected; the selected row's border is Ink. Heights are inside the 1 px borders, as on the boards. Native radios underneath (arrow keys), focus ring on the row, disabled rows at 40 %. `dense` = MCheckout (22 px dot column, 12 px padding, 16 px lines).

```ts
export interface RadioRowsProps<T extends string> {
  name: string;
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: ReactNode; sub?: ReactNode; aside?: ReactNode; asideMuted?: boolean; disabled?: boolean }>;
  rowHeight?: 52 | 56;
  dense?: boolean;
}
```


## Field

`src/components/primitives/Field.tsx` · used on Checkout, Login, Register, Settings

**Field** — Label (Stone, 6 px above) + control + hint or error (Signal) below. Wires ids and aria for you.

```ts
export interface FieldProps {
  label: string;
  /** Visually hide the label (it stays for screen readers). Use only when context makes it obvious. */
  hideLabel?: boolean;
  hint?: ReactNode;
  /** Error message: turns the control's border Signal and is announced. */
  error?: string;
  /** Exactly one control: Input, Select, Textarea, OtpInput, PasswordInput. */
  children: ReactElement<{ id?: string; "aria-invalid"?: boolean; "aria-describedby"?: string; invalid?: boolean }>;
  className?: string;
}
```


## IconButton

`src/components/primitives/IconButton.tsx` · used on headers

**IconButton** — 44×44 hit area, icon 12 px, optional count in the same 12 px mono. Hover: Stone.

```ts
export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  /** Required accessible name, e.g. "Cart, 2 items". */
  label: string;
  /** Optional visible count next to the icon (cart). */
  count?: number;
}
```


## Input

`src/components/primitives/Input.tsx` · used on Checkout, Admin

**fieldClass** — White field, 1 px #D8D3CC border, 44 px, 12 px padding. Focus: Ink border. Error: Signal border.

**Select** — Native select for accessibility and mobile pickers; custom chevron drawn with the icon grid.

```ts
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}
```

```ts
export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}
```

```ts
export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}
```


## OtpInput

`src/components/primitives/OtpInput.tsx` · used on Login (code), AdminLogin

**OtpInput** — 6 boxes, 44 px, digits only, paste fills all, backspace goes back. autocomplete=one-time-code on the first box.

```ts
export interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  invalid?: boolean;
  id?: string;
  "aria-describedby"?: string;
}
```


## PasswordInput

`src/components/primitives/PasswordInput.tsx` · used on Login, Register, Settings

```ts
export interface PasswordInputProps extends Omit<InputProps, "type"> {
  /** Show the 4-segment strength meter under the field (register, reset). */
  showStrength?: boolean;
}
```


## Pill

`src/components/primitives/Pill.tsx` · used on Admin filters

**Pill** — Dense 32 px filter/range button for the admin. Border #D8D3CC, Ink when selected.

```ts
export interface PillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}
```


## ProgressBar

`src/components/primitives/ProgressBar.tsx` · used on Account library, AdminEditions

**ProgressBar** — 8 px Mist track, Ink fill, 3 px rounded data end. Used for guide progress, editions, budgets.

```ts
export interface ProgressBarProps {
  value: number;
  max?: number;
  label: string;
  /** Mark the bar as needing attention (e.g. edition almost sold out): Signal fill. */
  tone?: "default" | "danger";
  className?: string;
}
```


## Segmented

`src/components/primitives/Segmented.tsx` · used on Product (format, level), Shop filters

**Segmented** — Text choices in a row (format, level, palette, filters). Unselected: Stone. Hover: Ink. Selected: Ink + underline offset 4. 36 px tall on phones (.pill), 32 px on desktop (.tx). Implemented as a radiogroup for arrow-key support.

```ts
export interface SegmentedOption<V extends string> {
  value: V;
  label: ReactNode;            // text, or responsive text ("+ print" / "Guide + list + print")
  disabled?: boolean;
  /** Small Stone note after the label, e.g. "+$2" for Custom level. */
  note?: string;
}
```

```ts
export interface SegmentedProps<V extends string> {
  label: string;
  options: SegmentedOption<V>[];
  value: V;
  onChange: (value: V) => void;
  className?: string;
  gap?: string;                // space between choices, default "gap-x-14" (cn does not merge classes)
}
```


## StatusChip

`src/components/primitives/StatusChip.tsx` · used on Orders, Admin

**StatusChip** — Dot + word. Never colour alone. done = filled Ink dot · todo = hollow dot · issue = Signal dot and Signal word · off = Line-grey dot, Stone word.

```ts
export interface StatusChipProps {
  state: StatusState;
  label: string;
  className?: string;
}
```


## Switch

`src/components/primitives/Switch.tsx` · used on Settings, AdminMAlerts

**Switch** — Row switch used in settings and admin notifications: label left, 28×16 track right. No colour but Ink.

```ts
export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}
```


## Tabs

`src/components/primitives/Tabs.tsx` · used on Help, Account, Admin

```ts
export interface TabItem {
  value: string;
  label: string;
  content: ReactNode;
  count?: number;
}
```

```ts
export interface TabsProps {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  /** "underline" (store, admin) draws a 2 px Ink bar under the active tab over a 1 px Line rule. */
  className?: string;
  label: string;
}
```


## Drawer

`src/components/overlay/Drawer.tsx` · used on Cart, MMenu

**Drawer** — Slides 100% in from its side over 420 ms (ease-standard); scrim fades to rgba(17,17,17,.24). Escape and scrim click close; focus is trapped, then returns to the element that opened it (`useReturnFocus`, also used by Modal: both open from state, without a Radix Trigger). Header: title left, "Close" text right (underlined on the cart, plain on the menu).

```ts
export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible name. Shown in the header ("Cart (2)") unless `header` replaces it. */
  title: string;
  /** Visible header content instead of the title (the phone menu shows the logo). */
  header?: ReactNode;
  /** right = cart (desktop 440 px, phone full width). full = phone menu. */
  side?: "right" | "full";
  children: ReactNode;
  footer?: ReactNode;
}
```


## Menu

`src/components/overlay/Menu.tsx` · used on Account shortcuts

```ts
export interface MenuItem {
  label: string;
  onSelect?: () => void;
  href?: string;
  danger?: boolean;
}
```


## Modal

`src/components/overlay/Modal.tsx` · used on Checkout errors, AdminOrderDetail refund

**Modal** — Centred panel on Paper, shadow-modal, fades in and rises 8 px in 240 ms. Used for payment errors and admin confirms.

```ts
export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** danger = destructive confirm: title stays Ink, confirm button uses Signal fill.
   *  alert = something went wrong ("Step 01 · Contact is incomplete"): Signal title, alertdialog role. */
  tone?: "default" | "danger" | "alert";
  children?: ReactNode;
  actions: ReactNode;
  width?: 400 | 440 | 460 | 560;
  /** Where focus goes on close instead of the opener (the first invalid field). */
  focusOnClose?: () => HTMLElement | null | undefined;
}
```


## Popover

`src/components/overlay/Popover.tsx` · used on Admin alerts

**Popover** — White panel, shadow-pop, no border, 8 px from its trigger. Admin alerts, account shortcuts.

```ts
export interface PopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "center" | "end";
  width?: number;
}
```


## Toast

`src/components/overlay/Toast.tsx` · used on Add to cart, admin saves

**ToastProvider** — Ink block bottom-right (desktop) or bottom-centre above the tab bar (phone; above StickyBuyBar when it shows). role=status. Store: 4 s. Admin: 1.6 s. Danger tone: Signal block, role=alert, stays until dismissed. `show(text, { action: { label: "View", onClick } })` adds one underlined text button ("Added to cart · View").


## Tooltip

`src/components/overlay/Tooltip.tsx` · used on Admin charts

**Tooltip** — Ink box, Paper text, 3×8 padding, no arrow. Charts and icon-only controls. Delay 200 ms.


## MobileHeader

`src/components/layout/MobileHeader.tsx` · used on all phone pages

**MobileHeader** — Phone header (< 1200 px): logo left, account, cart (n), "Menu" text button. Padding 4 4 4 16.

```ts
export interface MobileHeaderProps {
  cartCount: number;
  signedIn: boolean;
  onCartClick: () => void;       // the store goes to /cart (board MCart)
  locale?: "en" | "fr";          // passed to the menu's EN/FR switch
  onLocaleChange?: (l: "en" | "fr") => void;
}
```


## MobileMenu

`src/components/layout/MobileMenu.tsx` · used on MMenu

**MobileMenu** — Full-screen menu (board MMenu): logo + "Close", 28 px links, then Log in (signed out) / My library / Gift cards / Help, and "USD $ · EN FR" pinned at the bottom.

```ts
export interface MobileMenuProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  signedIn: boolean;
  locale?: "en" | "fr";
  onLocaleChange?: (l: "en" | "fr") => void;
}
```


## SiteFooter

`src/components/layout/SiteFooter.tsx` · used on all store pages

**SiteFooter** — Desktop: 6-column grid (32 px gaps), newsletter spans 2 (340 px max, 10 px gaps), 72 px above the bottom row. Column titles in Stone, 6 px under each (desktop only); links stacked at 22 px, each with a 24 px hit area (1 px padding cancelled by a -1 px margin, in a flex column so the margins do not collapse). EN/FR are 32 px buttons. Phone (< 768 px, board MHome): "Letters from the studio.", 2×2 columns of three merged links, "© 2026 Geste Studio" and "USD $ EN FR". Padding 56 32 28 (phone 64 16 24).

```ts
export interface SiteFooterProps {
  locale: "en" | "fr";
  onLocaleChange: (l: "en" | "fr") => void;
  /** Server action that adds the email to newsletter_subscribers (double opt-in). */
  subscribe: (email: string) => Promise<void>;
}
```


## SiteHeader

`src/components/layout/SiteHeader.tsx` · used on all desktop pages

**SiteHeader** — Desktop header (≥ 1200 px): no bottom rule. Logo left (animates on hover), nav (Shop Prints Method Journal About, 24 px apart) sits 28 px from the icons on the right. Cart count cross-fades in 150 ms. Padding 8 × 32.

```ts
export interface SiteHeaderProps {
  /** Current section, underlined + aria-current. */
  active?: (typeof MAIN_NAV)[number]["label"];
  cartCount: number;
  signedIn: boolean;
  onCartClick: () => void;
}
```


## Structure

`src/components/layout/Structure.tsx` · used on all pages

**Container** — Max 1200 px content column, 16 px phone gutter, 32 px desktop padding.

**Section** — Vertical rhythm between page sections: 48 phone, 72 desktop.

**PageTitle** — Page title: 28 px (phone 22 px), weight 500, tracking -2%, optional Stone lead on the right (desktop).

**Grid** — 12-column desktop grid, 8 on tablet, 1 on phone. Children set their own col-span.


## CartLine

`src/components/commerce/CartLine.tsx` · used on Cart, MCart, Checkout

**CartLine** — Cart row (boards Cart, MCart): thumb, title link + price on one line, detail and note in Stone, "Remove" text button. Guides and gift cards have quantity 1; prints get a stepper up to the stock. A line that cannot be bought shows its reason in Signal text and a struck price.

```ts
export interface CartLineProps {
  item: CartItem;
  href?: string | null;          // title link: the work page with the same configuration
  note?: string | null;          // "+ shopping list", "Signed, with certificate" (not on size "lg")
  issue?: string | null;         // "Sold out, not counted"
  onRemove: () => void;
  onQuantity?: (q: number) => void;
  maxQuantity?: number;
  size?: "md" | "lg";            // md = drawer, 64×80 thumb · lg = /cart page, 72×90
  onNavigate?: () => void;       // closes the drawer when the title is followed
}
```


## CartPanel

`src/components/commerce/CartPanel.tsx` · used on Cart (drawer), MCart (/cart)

**CartPanel** — Cart content shared by the drawer and the /cart page: CartLines, cross-sell panel ("Paint N°07 yourself instead? Guide from $12. See it", drawer only), Subtotal, Shipping ("from $4, next step" / "from $4" / "Free, digital"), Estimated total, "Checkout   $98", reassurance line. Empty: layer-1 CanvasDiagram, "Your cart is empty.", "Start with a Beginner work, about an hour." (drawer), "Browse works →", and "Undo" after the last line was removed.

```ts
export interface CartPanelProps {
  cart: PricedCart;              // useCart({ shippingMethod: "mondial_relay" }): cheapest carrier for "from $4"
  variant: "drawer" | "page";
  onRemove: (lineId: string) => void;
  onQuantity?: (lineId: string, quantity: number) => void; // unused by the cart: no stepper is drawn on Cart / MCart
  onUndo?: () => void;
  onNavigate?: () => void;
}
```


## CartSummary

`src/components/commerce/CartSummary.tsx` · used on Cart, Checkout

**CartSummary** — Right-aligned totals block of the checkout summary. Hidden entirely on the Confirmation step (validated change). The cart drawer and /cart use CartPanel's own totals ("Estimated total"), as drawn on Cart / MCart.

```ts
export interface CartTotals {
  subtotalCents: number;
  discountCents?: number;
  discountLabel?: string;
  /** null = not computed yet (no address) → shows "Calculated at next step". 0 = "Free" (guides only). */
  shippingCents: number | null;
  taxIncludedCents?: number;
  totalCents: number;
}
```


## CheckoutStepper

`src/components/commerce/CheckoutStepper.tsx` · used on Checkout, MCheckout

**CheckoutStepper** — One column per step with a 2 px bar above its label (Checkout: "01 Contact … 04 Confirmation", 8 px gaps; MCheckout: "Contact … Done", 6 px gaps). Bar Ink up to the current step, Line after, Signal on a step with errors (desktop adds " — incomplete"). Text Ink for the current step, Stone otherwise. Reached steps and the next one are clickable (the next one validates first); nothing after confirmation.

```ts
export interface CheckoutStepperProps {
  steps: CheckoutStep[]; // shipping is dropped when the cart has no print
  current: CheckoutStep;
  clickable: CheckoutStep[];
  errors?: CheckoutStep[];
  onGo: (s: CheckoutStep) => void;
  variant?: "desktop" | "phone";
}
```


## EditionCounter

`src/components/commerce/EditionCounter.tsx` · used on Print

**EditionCounter** — "12 of 50 left" with a thin bar; ≤ 5 left turns the words Signal (urgency, stated honestly).


## ExpressPay

`src/components/commerce/ExpressPay.tsx` · used on Checkout

**ExpressPay** — Top of checkout step 1. "Express checkout" + one sentence explaining what it does (validated after user confusion): "One tap: your wallet fills in contact, address and payment", three ghost buttons (Apple Pay, Google Pay, PayPal) and the "or fill in step by step" divider. Phone: Stone title, no sentence, no divider. Mock: `onPay` runs the success path; later the Stripe Express Checkout Element replaces the buttons. `busy` shows "Processing…" on the chosen button and disables the others.

```ts
export interface ExpressPayProps {
  onPay: (method: "apple_pay" | "google_pay" | "paypal") => void;
  busy?: ExpressMethod | null;
  variant?: "desktop" | "phone";
}
```


## OrderSummary

`src/components/commerce/OrderSummary.tsx` · used on Checkout, MCheckout

**OrderSummary** — Checkout right column on #F4F1ED (`surface-hover`), 24 px padding, 16 px gaps: "Order summary", lines with 56×70 thumbs ("N°03 — Guide" / "60×80 · Intermediate" / "+ shopping list", price right), "Gift card or promo code" + Apply (turns "Invalid code"), Subtotal / Shipping ("Next step" until a carrier is chosen) / Total / "Including VAT $10.67", four reassurance lines. Hidden on the confirmation. **OrderSummaryToggle** (phone): "Show order summary   $64" opens the receipt lines ("N°03 — Guide, 60×80") and the shipping.


## GuideConfigurator

`src/components/commerce/GuideConfigurator.tsx` · used on Product, Product01–15, MProduct

**GuideConfigurator** — Work page choices, as drawn: Format (cm) "suggests Intermediate" → Level "set by format" (Match format | Custom, Custom reveals the three levels) → Palette (44 px buttons with a 22 px three-stripe swatch, ring when selected, name on the right) → What you get (Guide + list | Guide + list + print; "+ print" on phones) → "3 layers   ~3h30   5 colours   Intermediate" → "Add to cart   $19" (desktop only; phones use StickyBuyBar) → "Digital preview. A similar original sells from $600…". Desktop: label and note on one line above the choices; phones: "Format (cm) · suggests Intermediate". The page keeps the configuration in the URL (?format=&level=&palette=&print=1).

```ts
export interface GuideConfiguratorProps {
  value: GuideConfig;
  onChange: (next: GuideConfig) => void;
  palettes: Palette[];
  formats?: FormatKey[];       // formats the work sells (default: all four)
  printAvailable?: boolean;    // an A3 edition with copies left; false disables "+ print"
  onAdd: () => void;
  adding?: boolean;
  added?: boolean;             // "Added   ✓" for 1.6 s (docs/motion.md §5)
}
```

## PriceMorph

`src/components/commerce/PriceMorph.tsx` · used on Shop, Home

**PriceMorph** — The meta line under a work: "Intermediate · 3h30" left (Stone), "from $12" right (Ink). Hidden: opacity 0, blur 4 px, tracking .25em, 3 px down. Shown: all to 0. 380/440 ms standard ease. Reduced motion: switches instantly (durations are 0 via CSS vars).


## ProductGallery

`src/components/commerce/ProductGallery.tsx` · used on Product, MProduct

**ProductGallery** — Mist box with a "Digital preview" / "Real result" badge and the views "Preview · Real result" below (desktop adds the caption "Original palette, 60×80" on the right). Desktop: 720 px box; the render's height follows the format (440 / 520 / 580 / 660 px) and its CSS filter the palette, both animating 420 ms. Phone: full-width 358 × 440 crop. Without a result photo, the dashed placeholder of the boards: "[Photo of N°03 painted by a first-time painter, same guide]".

```ts
export interface ProductGalleryProps {
  workNumber: string;
  imageUrl: string;
  filter: string | null;       // palettes.preview_filter
  format: FormatKey;
  caption: string;
  resultPhotoUrl: string | null;
  priority?: boolean;
}
```

## ShoppingListItem

`src/components/commerce/ShoppingListItem.tsx` · used on ShoppingList

**ShoppingListItem** — One material with a standard and a budget option. Links open the partner store in a new tab with the affiliate ref, and fire `affiliate_click`. Disclosure sentence sits once above the list.

```ts
export interface ShoppingItem {
  name: string; // "Turquoise"
  quantity: string; // "60 ml" (scaled to the format)
  standard: { label: string; priceUsd: number; url: string };
  budget: { label: string; priceUsd: number; url: string };
}
```


## StickyBuyBar

`src/components/commerce/StickyBuyBar.tsx` · used on MProduct

**StickyBuyBar** — Phone work page (< 1200 px): bar pinned to the bottom, "N°03 · 60×80" / "Guide + list" on the left, primary "Add   $19" filling the rest (padding 12 16 24, Line rule on top). Always shown, as on MProduct; pass `watch` to slide it in (420 ms) only once that element leaves the viewport. While shown it sets `--sticky-bar-h` so toasts sit above it.

```ts
export interface StickyBuyBarProps {
  title: string;
  detail: string;
  price: string;
  onAdd: () => void;
  added?: boolean;
  watch?: RefObject<HTMLElement | null>;
}
```

## WorkCard

`src/components/commerce/WorkCard.tsx` · used on Shop, MShop, Home, MHome

**WorkCard** — Work tile: 4:5 crop (208 × 260 on desktop), no shadow, no image hover, the whole tile is one link. Desktop `shop`: only the meta line morphs in on hover or keyboard focus. Desktop `home`: "N°01   from $12" (number underlined on hover) then "Beginner · 1h30". Below 1200 px (no hover): one line "Beg. · 1h30   from $12", always visible. Sold out: image at 60%, "Sold out" replaces the price.

```ts
export interface WorkCardProps {
  work: Work;
  variant?: "shop" | "home";   // default "shop"
  alwaysShowMeta?: boolean;    // desktop shop card: keep the meta line visible
  priority?: boolean;
}
```

## CanvasDiagram

`src/components/reader/CanvasDiagram.tsx` · used on GuideReader, Guide01–08, AdminGuideEditor

**CanvasDiagram** — The plan of the canvas, drawn in a 600×800 viewBox (3:4 like 60×80 / 30×40) on white with a 2 px Ink frame. Same component in the reader, the PDF (server-rendered to SVG) and the admin guide editor.

```ts
export interface DiagramStroke {
  layer: number;
  kind: "rect" | "path";
  d?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  color: string; // paint colour: content, not a UI token
  width?: number;
  opacity: number;
}
```

```ts
export interface CanvasDiagramProps {
  strokes: DiagramStroke[];
  /** Draw layers 1..upTo. */
  upTo: number;
  /** Layer being painted: full strength. Earlier layers fade to 30% so the new strokes read. */
  current?: number;
  width?: number;
  className?: string;
}
```


## DryingTimer

`src/components/reader/DryingTimer.tsx` · used on GuideReader timer, AppTimer

**DryingTimer** — Full-width drying view: "Let layer 02 dry" · 96 px digits (tabular) · Pause/Resume ghost · "Skip, it's dry" text. Counts down every second with no animation. Keeps time with Date.now() so a locked phone stays right. At zero: one optional soft sound + a notification if the PWA has permission (asked on first timer, never before).

```ts
export interface DryingTimerProps {
  seconds: number;
  layerName: string;
  onDone?: () => void;
  onSkip: () => void;
}
```


## PlateSwatch

`src/components/reader/PlateSwatch.tsx` · used on GuideReader, AppStep

**PlateSwatch** — 14 px square of paint with a 1 px #D8D3CC inset outline (so white paint shows) + the colour name.


## StepCard

`src/components/reader/StepCard.tsx` · used on GuideReader, AppStep

**StepCard** — Right column of the reader (desktop) / body of AppStep (phone). "Layer 02 · Gestures — Step c": Stone. Instruction: 22 px desktop, 14 px phone, max 34 ch. Then brush, plate, and the tip in a Mist panel. The instruction is the only thing that must be read.


## StepProgress

`src/components/reader/StepProgress.tsx` · used on GuideReader, AppStep

**StepProgress** — 15 segments in one row, 2 px gaps, grouped by layer (6 px gap between layers). Done: Ink. Current: Ink, taller (6 px vs 4 px). Upcoming: Line. One 44 px-tall slider across the row (15 separate targets would be under 24 px on a phone): click a segment to jump to it, arrows / Home / End from the keyboard.

```ts
export interface StepProgressProps {
  /** Step ids in order, e.g. ["1a","1b",…,"3e"]. */
  steps: string[];
  current: number; // index
  onGo: (index: number) => void;
}
```


## AdminShell

`src/components/admin/AdminShell.tsx` · used on every Admin board

**AdminShell** — 232 px sidebar (grouped nav with counts, active row inverted to Ink) + top bar (breadcrumb, 20 px title, search, alerts, page actions) + main (24 32 40 padding, 24 px gaps). Items the role cannot use are not rendered.

```ts
export interface NavItem {
  label: string;
  href: string;
  count?: number;
  roles: StaffRole[];
}
```

```ts
export interface AdminShellProps {
  role: StaffRole;
  userName: string;
  currentHref: string;
  counts: Partial<Record<string, number>>; // keyed by href
  title: string;
  breadcrumbs: Array<{ label: string; href: string }>;
  actions?: ReactNode;
  alerts?: ReactNode; // <Popover> with the alerts list
  search?: ReactNode;
  children: ReactNode;
}
```


## BarChart

`src/components/admin/BarChart.tsx` · used on AdminDashboard

**BarChart** — Single-series vertical bars (dataviz rules): one axis, Stone bars, the hovered bar turns Ink, 2 px gap, 3 px rounded data end, baseline 1 px Ink, tooltip above the hovered bar. Hit area = full column height. A visually hidden table carries the same values for screen readers.

```ts
export interface BarDatum {
  label: string; // "Sep 22"
  value: number;
  /** Tooltip text, e.g. "Sep 22 · $310 · 14 orders". */
  tip: string;
}
```


## DataTable

`src/components/admin/DataTable.tsx` · used on AdminOrders, AdminCustomers

**DataTable** — Admin table in a white box: 36 px header row (Stone, Ink bottom rule), 44 px rows (Line rule), hover #F4F1ED. Loading: 6 Mist skeleton rows. Empty: one sentence + one action, centred. Built on CSS grid with role=table semantics so column widths match the canvas exactly.

```ts
export interface Column<T> {
  key: string;
  header: string;
  /** CSS grid track, e.g. "90px" or "1.4fr". */
  width: string;
  cell: (row: T) => ReactNode;
  align?: "left" | "right";
}
```

```ts
export interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  /** Whole-row link (orders → order detail). Cells with their own links stop propagation. */
  rowHref?: (row: T) => string;
  selectable?: boolean;
  selected?: Set<string>;
  onSelectedChange?: (s: Set<string>) => void;
  /** Ink bar shown above the table when ≥ 1 row is selected: "{n} selected" + actions + Clear. */
  bulkActions?: ReactNode;
  empty?: ReactNode;
  loading?: boolean;
  caption: string;
}
```


## HBar

`src/components/admin/HBar.tsx` · used on AdminAnalytics, AdminDashboard

**HBar** — Horizontal bars for rankings and funnels: 170 px label · 10 px Mist track with Ink fill, 3 px data end · value right.


## KanbanBoard

`src/components/admin/KanbanBoard.tsx` · used on AdminFulfilment

**KanbanBoard** — Fulfilment board: 4 columns on #F4F1ED, white cards. Moving is by buttons (← and "Next step →"), not drag, so it works on a phone and with a keyboard. onMove is a server action that updates print_copies.status.

```ts
export interface KanbanCard {
  id: string; // order number
  title: string; // "N°07 · A3 · 12/50"
  subtitle: string; // "Camille Martin · Lyon"
  imageUrl: string;
  href: string;
}
```

```ts
export interface KanbanColumn {
  key: string;
  title: string; // "To print"
  nextLabel?: string; // "Printed & signed"
  cards: KanbanCard[];
}
```


## KpiTile

`src/components/admin/KpiTile.tsx` · used on AdminDashboard, AdminFinance

**KpiTile** — White box, 20 px padding: label (Stone) · 28 px value · delta or context (Stone). The whole tile links to its module.


## PermissionMatrix

`src/components/admin/PermissionMatrix.tsx` · used on AdminSettings

**PermissionMatrix** — Read-only matrix shown in Settings › Team. The source of truth for RLS is supabase (has_role); keep both in sync.


## Timeline

`src/components/admin/Timeline.tsx` · used on AdminOrderDetail

**Timeline** — Order timeline: 120 px time (Stone) + event, 36 px rows; an internal note input at the bottom (never sent to the customer).

```ts
export interface TimelineEvent {
  at: string; // "Oct 1, 14:02"
  text: string;
  kind?: "system" | "note";
}
```


## ShoppingListTable

`src/components/commerce/ShoppingListTable.tsx` · used on ShoppingList, MShoppingList

**ShoppingListTable** — Materials of a guide. Desktop: table "Item · What to look for · Price · Where" (columns 32 px, 1.2fr, 1.6fr, 70 px, 110 px; 12 px gaps), rows 48 px + 1 px rule. Phone: checkbox, name over what to look for, price over "Find it". A ticked row ("I already have") turns Stone, its name struck through. "Find it" opens the partner shop in a new tab (`rel="noopener sponsored"`).

```ts
export interface ShoppingListTableProps {
  lines: ShoppingListLine[];
  tier: "standard" | "budget";
  have: ReadonlySet<number>;
  onToggle: (position: number) => void;
}
```


## PrintMat

`src/components/commerce/PrintMat.tsx` · used on Print, MPrint

**PrintMat** — A print on its white mat over Sand. Desktop: 760 px panel, mat padding 36 36 64, 400 × 500 picture, `shadow-mat`, caption "N°07 · 12/50 · Geste Studio". Phone: 36 px Sand padding, mat 16 16 32, 220 × 275, `shadow-mat-sm`, no caption.


## PrintCard

`src/components/commerce/PrintCard.tsx` · used on Print ("Other editions")

**PrintCard** — Sand mat with 24 px padding and a fixed 212 × 265 picture (as drawn, the mat is wider than the picture), title + price, edition number in Stone.


## GiftCardPreview

`src/components/commerce/GiftCardPreview.tsx` · used on GiftCard, MGiftCard

**GiftCardPreview** — The emailed card over Sand. Desktop: 640 px panel, 440 px card (`shadow-card`), 260 px picture, "geste.studio gift card", "For Léa, from Camille", message, "Code GESTE-XXXX-XXXX · valid 12 months". Phone: 24 px padding, `shadow-card-sm`, 160 px picture, "Gift card", no code line. Empty names show "…".


## ArticleCard

`src/components/layout/ArticleCard.tsx` · used on Journal, MJournal, Article

**ArticleCard** — Journal tile: picture (300 px, phone 200; `keep` variant 240 px), "Method · Sept 24" in Stone, title (medium, underlined on hover), excerpt (desktop only).

