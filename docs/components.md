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
| Primitives | `Checkbox` | `src/components/primitives/Checkbox.tsx` | Checkout, Login, Register, Settings, Admin |
| Primitives | `RadioRows` | `src/components/primitives/RadioRows.tsx` | Checkout, MCheckout (delivery, payment method) |
| Primitives | `Field` | `src/components/primitives/Field.tsx` | Checkout, Login, Register, Settings |
| Primitives | `IconButton` | `src/components/primitives/IconButton.tsx` | headers |
| Primitives | `Input` | `src/components/primitives/Input.tsx` | Checkout, Admin |
| Primitives | `OtpInput` | `src/components/primitives/OtpInput.tsx` | Login (code), AdminLogin |
| Primitives | `PasswordInput` | `src/components/primitives/PasswordInput.tsx` | (eye icon variant, not used by the account boards) |
| Primitives | `PasswordField`, `PasswordRules`, `OrDivider` | `src/components/primitives/PasswordField.tsx` | Login, MLogin, Register, MRegister |
| Primitives | `Pill` | `src/components/primitives/Pill.tsx` | Admin filters |
| Primitives | `ProgressBar` | `src/components/primitives/ProgressBar.tsx` | Account library, AdminEditions |
| Primitives | `Segmented` | `src/components/primitives/Segmented.tsx` | Product (format, level), Shop filters |
| Primitives | `StatusChip` | `src/components/primitives/StatusChip.tsx` | Orders, Admin |
| Primitives | `Switch` | `src/components/primitives/Switch.tsx` | Settings, AdminMAlerts |
| Primitives | `Tabs` | `src/components/primitives/Tabs.tsx` | Account, Admin |
| Layout | `AccountNav` | `src/components/layout/AccountNav.tsx` | Account, Orders, Settings, MAccount, MOrders, MSettings |
| Layout | `InfoSideNav`, `InfoSection`, `InfoNote` | `src/components/layout/InfoPage.tsx` | Help, Legal |
| Layout | `CookieSettings` | `src/components/layout/CookieSettings.tsx` | Legal, MLegal |
| Commerce | `LibraryRow` | `src/components/commerce/LibraryRow.tsx` | Account, MAccount |
| Commerce | `AccountOrderRow` | `src/components/commerce/AccountOrderRow.tsx` | Orders, MOrders |
| Commerce | `TrackingSteps` | `src/components/commerce/TrackingSteps.tsx` | Tracking, MTracking |
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
| Guide reader | `GuideBooklet` / `GuideSheet` | `src/components/reader/GuideBooklet.tsx` | Guide01–08 |
| Guide reader | `PrintSheet` | `src/components/reader/PrintSheet.tsx` | AppPrint |
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

`src/components/primitives/Accordion.tsx` · used on Product details, Method, Help and Legal (phone)

**Accordion** — Rows of 44 px with a Line rule; plus → minus; panel height animates 240 ms (off under reduced motion). `variant="product"` (default; Product, MProduct): 44 / 48 px rows rules included, 16 px under an open panel. `variant="faq"` (MMethod, MHelp, MLegal): 48 px rows plus their rule, 12 px under an open panel. `value` / `onValueChange` make a single accordion controlled, so the URL opens a row (`/help#faq`, `/legal/terms`). The Radix header is an h3: the row labels keep the body weight and tracking, as every board draws them (the product rows were 500 before, docs/decisions.md "Accordion rows").

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
  variant?: "product" | "faq";
}
```


## Badge

`src/components/primitives/Badge.tsx` · used on Admin sidebar

**Badge** — Count in a 1 px box (admin sidebar). Inverts with its row when the row is active.


## Button

`src/components/primitives/Button.tsx` · used on all CTAs — Product, Checkout, Admin

**LoadingDots** — Three dots pulsing in sequence; replaces the trailing arrow while loading.

Variants: `primary`, `ghost`, `text`, `danger` (Signal outline), `danger-solid` (filled Signal laid out like primary, for the confirmation of a deletion: Settings "Yes, delete   →").

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

**Checkbox** — 14 px square, 1 px Ink border, Ink fill + Paper check when on. Whole row is the hit area: 44 px tall by default; `layout="inline"` (checkout, register) is the label's height, box top-aligned, text 23 px from the left edge as drawn; `layout="setting"` (Settings, Login "Keep me logged in") is a 32 px row (36 on phones), text where the boards' native boxes put it (`gap` = board gap + 2 px); `layout="end"` (Legal cookie rows) puts the text left and the box right, 16 px from the edge like the boards' native box, the row height coming from `className`.

```ts
export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
  invalid?: boolean;
  layout?: "row" | "inline" | "setting" | "end";
  /** setting only, default "gap-12". */
  gap?: string;
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
  /** line = the Library's 2 px Line track with a square Ink fill (Account, MAccount). */
  variant?: "bar" | "line";
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

**StatusChip** — Dot + word. Never colour alone. The dot is 10 px (the boards' 8 px + 1 px border). done = filled Ink dot · todo = hollow dot · issue = Signal dot and Signal word · off = Line-grey dot, Stone word.

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

Admin: `placement="admin"` puts the scrim and the panel over the content area right of the 257 px sidebar (≥ 768 px), as the admin boards draw dialogs; `width` accepts 508 (refund dialog).


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


## InfoPage

`src/components/layout/InfoPage.tsx` · used on Help, Legal

**InfoSideNav** — Desktop side column (3 of 12 columns): eyebrow in Stone, the 28 px h1 16 px above the topics, 32 px topic rows 4 px apart; the current one underlined (offset 4), the others Stone. Items with `href` are links in a `nav` (`aria-current="page"`, Legal); without, buttons in a group (`aria-pressed`, Help).
**InfoSection** — A topic or document: 500 title (h2) 12 px above the rows; each row is a `dt` label and a Stone `dd`, 14 px above and below, Line rule on top. Children go after the rows (gift card button, contact form, cookie rows).
**InfoNote** — Mist line above a Legal document ("Template — …"); the page sets its padding (14 px desktop, 12 px phone).

```ts
export interface InfoSideNavProps { eyebrow: string; title: string; label: string; items: { key: string; label: string; href?: string }[]; current: string; onPick?: (key: string) => void }
export interface InfoSectionProps { title: string; rows?: { label: string; text: ReactNode }[]; children?: ReactNode; className?: string }
```


## CookieSettings

`src/components/layout/CookieSettings.tsx` · used on Legal (`/legal/cookies`), MLegal (every legal page)

**CookieSettings** — "Essential · cart, login  Always on", "Audience measurement" and "Social media and ads" checkboxes (`Checkbox layout="end"`), then "Save my choices →", which reads "Saved" until the next change. Desktop: 57 px ruled rows (the board's 56 px content-box plus the rule; 58 px for the last, ruled below too), 320 px button 16 px below. Phone: "Essential", "Audience", "Ads" in 44 px rows 20 px apart, full-width button. Stateless: the page keeps the choice (`useCookieConsent`, `saveCookieConsent`).

```ts
export interface CookieSettingsProps { value: { audience: boolean; ads: boolean }; onChange: (next: CookieChoice) => void; saved: boolean; onSave: () => void; variant?: "desktop" | "phone" }
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
  /** Replaces the default sizing "h-auto max-w-full" (the desktop reader uses "h-full max-h-640 w-auto"). */
  className?: string;
}
```


## DryingTimer

`src/components/reader/DryingTimer.tsx` · used on GuideReader timer, AppTimer

**DryingTimer** — Drying view, drawn from the boards: "Layer 02 is drying" (phone "Layer 2"), the digits (96 px desktop, 64 px phone, tabular, −0.04em, no animation), a 2 px bar filling up (280 / 200 px), the touch test in Stone, and on desktop the ghost "Pause" / "Start timer" (disabled at 00:00). Presentational: the page keeps the end date in `progress.drying` (so a reload or a locked phone keeps the right time) and re-renders every second. The phone page places its own buttons ("Pause" / "Start timer", "It is dry, go to layer 3"). No notification permission is asked in the mock.

```ts
export interface DryingTimerProps {
  left: number;      // seconds left
  total: number;     // full drying time: the bar's 100 %
  layer: string;     // "02" desktop, "2" phone
  running: boolean;
  onToggle?: () => void; // desktop button
  variant?: "desktop" | "phone";
}
```


## GuideBooklet

`src/components/reader/GuideBooklet.tsx` · used on Guide01–08 (`/learn/[id]/print`)

**GuideBooklet** — The printed guide from the guide's content and its printed copy (`guide.print`): cover, before you start (the box list follows the format: canvas size, tube size), palette & mixes, the plan, one page per layer (layer diagram with earlier layers faded, plate, the printed wording of the steps, tip in Mist), avoid mud & sign. **GuideSheet** is one A4 page: 794 × 1123 px on screen, 210 × 297 mm printed (`@page` A4, no margin, paint colours kept), running head "geste — N°03 · Guide" / "01 / 08", and the licence watermark in the bottom margin of every page: "Licensed to Camille M. · camille.martin@mail.com" / "order #GS-2041". `guidePageCount(guide)` = 5 + layers; `layerPage(n)` = 4 + n.

```ts
export interface GuideBookletProps {
  guide: Guide;
  license: GuideLicense; // { name: "Camille M.", email, orderNumber: "GS-2041" }
  paletteName: string;
  only?: number[];       // pages to render, 1-based ("Current layer only")
}
```


## PlateSwatch

`src/components/reader/PlateSwatch.tsx` · used on GuideReader

**PlateSwatch** — 20 px square of paint with a 1 px Line-field inset outline (so white paint shows), 8 px, the colour name. **Plate**: "On the plate" in Stone, then the swatches in rows 10 px apart, 18 px between colours.


## PrintSheet

`src/components/reader/PrintSheet.tsx` · used on AppPrint (and centred on desktop)

**PrintSheet** — "Print this guide" / "Close"; prints as three 2 px segments 6 px apart (used ones Ink); "2 of 3 prints left" (at 0: "No prints left. Ask us for more." → /help, everything disabled); "8 pages, A4. Each page carries your name and order number: Camille M. · #GS-2041."; radios "Full guide · 8 pages" / "Current layer only · 1 page" (native, Ink accent); "Prepare PDF   →" (loading "Preparing your PDF…"). Radix dialog: focus goes to the sheet, stays inside, Escape and Close leave. `sheet` is pinned to the bottom of the phone (the page draws the 0.28 scrim under the half-faded diagram, as on the board); `panel` is 440 px, centred, with the scrim.

```ts
export interface PrintSheetProps {
  open: boolean; onClose: () => void;
  printsLeft: number; printsTotal?: number; pages: number;
  name: string; orderNumber: string;
  scope: "full" | "layer"; onScope: (s: "full" | "layer") => void;
  onPrepare: () => void; preparing?: boolean;
  variant?: "sheet" | "panel"; scrim?: boolean;
}
```


## StepCard

`src/components/reader/StepCard.tsx` · used on GuideReader, AppStep

**StepCard** — The step being painted. Desktop (GuideReader): "Step c of e" (500) with the layer's brushes in Stone on the right, the instruction at 22 / 34 (−0.01em, pretty wrap), `Plate`, "Tip · …" in Stone, 28 px apart. Phone (AppStep): the same first line with this step's brush ("Round n°6"), the instruction at 14 / 22, 10 px apart. The instruction is `aria-live="polite"`, so a step change is read out. The reader keys it by step and slides it 8 px in the direction of travel (320 ms, `duration.step`).

```ts
export interface StepCardProps {
  id: string; lastLetter: string; brush: string; text: string;
  plate?: PlateColour[]; tip?: string;   // desktop
  variant?: "desktop" | "phone"; className?: string;
}
```


## StepProgress

`src/components/reader/StepProgress.tsx` · used on GuideReader, AppStep

**StepProgress** — As drawn: 2 px segments, 4 px apart, Ink up to and including the current step, Line after (hover: Line-field). Desktop shows every layer (12 px between layers); the phone shows the current layer's segments only. The bar is one `role="slider"` ("Steps", value text "Layer 02, step c · 7 of 15"): a click goes to the nearest segment, ← → ↑ ↓ move one step, Page Up / Page Down one layer, Home / End the first and last step (the reader's own ← → listener skips the keys the bar handled). One 24 px-tall target whatever the width, drawn as its 2 px bars with negative margins (desktop 20 px in the layout, phone 2 px), so axe's target size passes even when 15 segments share 358 px (docs/decisions.md "Reader step bar"). The reader's ← → keys and swipes move one step.

```ts
export interface StepProgressProps {
  layers: string[][]; // [["1a",…,"1e"], ["2a",…], …]
  current: string;    // "2c"
  onGo: (id: string) => void;
  variant?: "desktop" | "phone";
}
```


## AdminShell

`src/components/admin/AdminShell.tsx` · used on every Admin board (composed by `src/app/(admin)/admin/_admin/AdminFrame.tsx` and `AdminPage.tsx`)

**AdminSidebar** — 257 px (232 px content, 12 px padding, 1 px rule, as the boards measure it): logo + "admin", grouped nav (`ADMIN_NAV`) with counts (`Badge`, 30 px), active row inverted to Ink (`activeNavHref(path)`: order detail lights Orders, guide pages light Guide editor), then View the store ↗, "Lucas · Owner  2FA on" (a link to Settings for the owner), Log out. Items the role cannot use are not rendered.
**AdminTopBar** — breadcrumb "Sales /" + 20 px title, then search · "Demo data" · Alerts · page actions. **AdminMain** — 24 32 40 padding, 24 px gaps. **AdminShell** composes the three (kit).
**AdminPhoneHeader** — 60 px: "geste.studio admin" + "Desktop ↗" (AdminM* boards). **AdminTabBar** — Today · Orders · Alerts, 56 px, current underlined; part of the flow (not sticky) under a scrolling main.

```ts
export interface AdminSidebarProps {
  role: StaffRole;
  userName: string;
  activeHref: string | null;
  counts: Partial<Record<"orders" | "fulfilment" | "editions" | "ai" | "support" | "reviews", number>>;
  onLogOut?: () => void;
}
export interface AdminTopBarProps { breadcrumbs: Crumb[]; title: ReactNode; search?: ReactNode; demo?: ReactNode; alerts?: ReactNode; actions?: ReactNode }
```


## AdminUI

`src/components/admin/AdminUI.tsx` · the pieces every admin board repeats (board class in brackets)

- **AdminBox** [.box] — white, Line border, 20 px padding, 14 px gap; `as="a"` for a linked tile.
- **AdminHeadRow** [.th] / **AdminRow** [.row] — grid rows with the board's `cols` template; 36 / 44 px + 1 px rule (content-box: 37 / 45 px as measured); header Stone on an Ink rule; `href` makes the whole row a link (hover #F4F1ED).
- **PillButton** / **PillLink** [.pillb] — 34 px outline pill (32 + borders), Line-field border, `pressed` = Ink border (aria-pressed), `inverse` on the Ink selection bar.
- **AdminTabs** [.tab] — 40 px Stone labels 20 px apart on a Line rule; selected Ink with a 2 px underline; buttons with aria-pressed (filters).
- **AdminTitle** (box title, 500, no heading tracking) · **UnderLink** (underlined text link).


## DemoRoleMenu · AlertsPopover · AdminSearch

`src/components/admin/DemoRoleMenu.tsx`, `AlertsPopover.tsx`, `AdminSearch.tsx` · top bar of every admin board

**DemoRoleMenu** — the boards' "Demo data" chip (Mist, Stone). Mock: a Radix menu "View the admin as" with Owner / Support / Fulfilment / Content (radio items with what each sees) and "Reset demo data". **AlertsPopover** — "Alerts · n" (unread) pill; a 380 px panel pinned 64 px from the top and 32 px from the right of the content column, 53 px rows linking to their module, read ones in Stone, Close; Escape and outside click close, focus returns. **AdminSearch** — 300 × 36 px field with a hidden label; Enter → order, customer, work or the orders list.


## BarChart

`src/components/admin/BarChart.tsx` · used on AdminDashboard

**BarChart** — Single-series vertical bars (dataviz rules): one axis, Stone bars, the hovered or focused bar turns Ink, 2 px gap, 3 px rounded data end, baseline 1 px Ink, tooltip above the bar in a 28 px band. Hit area = full column height. `height` is the plot area (default 240); label row 14 px under the baseline: first label · `note` · last label. A visually hidden table carries the same values for screen readers.

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

**HBar** — Horizontal bars for rankings and funnels (AdminAnalytics): 170 px label · 10 px Mist track with Ink fill, 3 px data end · value right in 70 px. Rows 30 px, 14 px apart; lengths relative to the largest row; `highlight` turns a row Signal (label too, never colour alone); `display` overrides the value text.


## KanbanBoard

`src/components/admin/KanbanBoard.tsx` · used on AdminFulfilment

**KanbanBoard** — Fulfilment board (AdminFulfilment): 4 columns on #F4F1ED (12 px padding, 560 px tall at least), white cards. Moving is by buttons (34 px "←" pill and the Ink "Next step →"), not drag, so it works on a phone and with a keyboard. `onMove(cardId, toColumn)` is `moveCopy` (print_copies.fulfilment); `busy` disables a card while it saves. Cards carry `label` (order number) apart from `id` (copy id).

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

**KpiTile** — White box, 20 px padding: label (Stone) · 28 px value · delta or context (Stone). With `href` the whole tile links to its module (only modules the role can open). `size="sm"`: 14 px padding, 24 px `text-stat` value (AdminMToday).


## PermissionMatrix

`src/components/admin/PermissionMatrix.tsx` · used on AdminSettings

**PermissionMatrix** — Read-only matrix of Settings › Team as drawn: 6 rows (Orders & refunds, Fulfilment, Catalog & guides, Customers & support, Finance, Settings & team) × Owner / Support / Fulfilment / Content editor, ✓ or Stone "—" with hidden "allowed / not allowed". The source of truth for RLS is supabase (has_role); keep both in sync.


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


## OrderStatusChip · RefundModal

`src/components/admin/OrderStatus.tsx`, `RefundModal.tsx` · AdminOrders, AdminOrderDetail, AdminM*

**OrderStatusChip** — StatusChip with the admin wording: Signal for what needs a hand (To ship, Refund asked, Print to ship), filled for finished (Delivered, Shipped, Refunded, Sent), hollow in between (Printed, Packed, Pending, Partly refunded), off for Cancelled / Returned / Revoked. `fulfilmentLabel(kind, fulfilment, revoked)` words an order line.
**RefundModal** — `Modal placement="admin"` (scrim and panel over the content area, 508 px): the applicable choices (Print only, Guide only, Full order) as 40 px outline rows with the amount right, the reason sent to the customer, restock, Cancel + Signal "Refund $51  →". Above the role's limit the confirm is disabled and says why.


## ThreadListItem · MessageList · ReviewCard

`src/components/admin/SupportParts.tsx` · AdminSupport, AdminReviews

**ThreadListItem** — inbox row, 97 px: name + time, subject, preview (Stone); selected #F4F1ED; new threads carry a hidden " · new". **MessageList** — customer messages on Mist at the left, staff replies on Ink at the right, 80 % wide at most. **ReviewCard** — 4:5 photo, name · work and stars, the quote, actions (Approve / Feature / Hide) or the verdict, then "Reply privately".


## AiCandidateCard · AdminMeter

`src/components/admin/AiCandidateCard.tsx` · AdminAIPipeline (AdminMeter also on AdminEditions)

**AdminMeter** — 8 px Mist track, Ink fill with a 3 px rounded end, role=progressbar with its value (job progress, GPU budget). **AiCandidateCard** — 4:5 image, id + similarity, strokes · layers, note, Approve (Ink, 32 px) + ✕ pill; once decided the verdict ("✓ Approved → Works (draft)", "✕ Rejected", card at 40 %).


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


## PasswordField

`src/components/primitives/PasswordField.tsx` · used on Login, MLogin, Register, MRegister

**PasswordField** — Label row with "Show" / "Hide" in text at its end (the button stretches to the 26 px label row, so its word sits 3 px lower, as drawn), then the field and its error. Props: `label`, `error`, plus the Input props.

**PasswordRules** — The three rules ("· At least 8 characters" in Stone, "✓ …" in Ink once met), `aria-live="polite"`. `passwordRules(pw, email)` computes them, `passwordOk(pw, email)` is true when all are met.

**OrDivider** — "—— or ——" between the main action and the other ways in.

## AccountNav

`src/components/layout/AccountNav.tsx` · used on Account, Orders, Settings (+ M*)

**AccountNav** — "Hi Camille" (the page's h1) and Library / Orders / Settings / Log out. Desktop: a column, current link underlined, 28 px rows, "Log out" in Stone 12 px below. Phone: 28 px title over a row of 44 px tabs, current underlined (offset 6), others Stone, "Log out" pushed right. Props: `current`, `firstName`, `onLogOut`, `variant`.

## LibraryRow

`src/components/commerce/LibraryRow.tsx` · used on Account, MAccount

**LibraryRow** — One guide of the Library. Desktop: 144×180 picture, number + "Available offline", detail, 2 px progress line + status, "Continue →" (160 px), "Shopping list", "Print · n left". Phone: 96×120, status under the line, text links Continue / List / Print (24 px targets). All three are links: the reader (`openHref`), the shopping list, the print sheet (`printHref`, which says "No prints left" at 0). Props: `imageUrl`, `number`, `detail`, `progress` (0–1), `status`, `action`, `openHref`, `listHref`, `printsLeft`, `printHref`, `variant`.

## AccountOrderRow

`src/components/commerce/AccountOrderRow.tsx` · used on Orders, MOrders

**AccountOrderRow** — A 56 px row (number, date, status, total, + / −; columns 140 · 140 · 1fr · 100 · 24) that opens the receipt lines and ghost actions. Phone: 64 px, "#GS-2041 · $70" over "date · status", actions share the width. `aria-expanded` + `aria-controls`. Props: `number`, `date`, `status`, `total`, `lines`, `open`, `onToggle`, `actions`, `variant`.

## TrackingSteps

`src/components/commerce/TrackingSteps.tsx` · used on Tracking, MTracking

**TrackingSteps** — Parcel timeline: 10 px dots (filled Ink once reached, hollow after), thread Ink when the next step is reached, Line-grey otherwise; the last step reached is 500 and `aria-current="step"`, steps to come are Stone with "to come" for screen readers. Desktop 56 px rows with the time in a 160 px right column; phone 52 px rows with the time under the label. Props: `steps: { label, time, done, current }[]`, `variant`.
