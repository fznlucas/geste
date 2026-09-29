/**
 * What the API returns. Pages depend on these types only, never on `src/data`: when the API moves
 * to Supabase, these stay and the pages do not change. Images are ready-to-use URLs.
 */
import type { FormatKey, LevelKey, PrintSize, ShippingMethod } from "@/lib/pricing";
import type { DiagramStroke } from "@/components/reader/CanvasDiagram";
import type { CartTotals } from "@/components/commerce/CartSummary";
import type { CartItem, StaffRole } from "@/lib/types";

export type { FormatKey, LevelKey, PrintSize, ShippingMethod, DiagramStroke, CartTotals, StaffRole };

export type WorkStatus = "draft" | "scheduled" | "live" | "archived";
export type PaletteKey = "original" | "warm" | "cool" | "earth";
export type OrderStatus = "pending" | "paid" | "partially_refunded" | "refunded" | "cancelled";
export type ItemKind = "guide" | "print" | "gift_card";
export type FulfilmentStatus = "not_required" | "to_print" | "printed" | "packed" | "shipped" | "delivered" | "returned";
export type ReviewStatus = "pending" | "published" | "featured" | "hidden";
export type ThreadStatus = "open" | "done";

export interface Swatch {
  hex: string; // paint colour: content, not a UI token
  name: string;
}

export interface Address {
  name: string;
  line1: string;
  /** "Apartment, building, floor — optional" (Checkout). */
  line2?: string;
  postalCode: string;
  city: string;
  country: string; // ISO 3166-1 alpha-2
}

// ── Catalog ────────────────────────────────────────────────────────────────

export interface WorkFormat {
  format: FormatKey;
  label: string; // "60×80"
  defaultLevel: LevelKey;
  levelLabel: string; // "Intermediate"
  layers: number;
  priceCents: number; // at the default level
  duration: string; // "3h30"
  active: boolean;
}

export interface WorkPalette {
  key: PaletteKey;
  name: string;
  swatches: Swatch[];
  previewFilter: string | null;
}

export interface CatalogWork {
  id: string;
  number: string; // "N°03"
  slug: string; // "n03"
  status: WorkStatus;
  publishAt: string | null;
  description: string;
  imageUrl: string;
  imageAlt: string;
  resultPhotoUrl: string | null;
  studioTested: boolean;
  seoTitle: string;
  seoDescription: string;
  sortOrder: number;
  defaultFormat: FormatKey;
  formats: WorkFormat[];
  palettes: WorkPalette[];
  /** Card line (Home/Shop): the default format at its default level. */
  fromPriceCents: number;
  /** Cheapest guide of the work (any active format, Beginner): "Start with N°03   from $12". */
  minPriceCents: number;
  levelLabel: string;
  duration: string;
  soldCount: number;
}

export interface WorksQuery {
  /** Default "live" (the store). The admin passes "all". */
  status?: WorkStatus | "all";
  /** Level of the card (default format's level). */
  level?: LevelKey;
  /** Works that offer this palette. */
  palette?: Exclude<PaletteKey, "original">;
}

export interface ShoppingListLine {
  position: number;
  name: string;
  /** "What to look for", already scaled to the format: "Acrylic, 60 ml". */
  standard: { label: string; priceCents: number; url: string };
  budget: { label: string; priceCents: number; url: string };
}

/** "The guide · 4 steps" on the work page: one line per layer, then "Stop… Sign." (Product / MProduct boards). */
export interface GuideOutlineStep {
  n: string; // "01"
  text: string; // desktop wording
  short: string; // phone wording
}

// ── Journal ────────────────────────────────────────────────────────────────

export type ArticleCategory = "Method" | "Stories" | "Studio";

export interface ArticleBlock {
  kind: "p" | "h2";
  text: string;
  /** Phone wording when the board shortens it (MArticle). */
  short?: string;
}

export interface Article {
  slug: string;
  title: string;
  category: ArticleCategory;
  readMinutes: number;
  excerpt: string;
  coverUrl: string;
  coverAlt: string;
  publishedAt: string;
}

export interface ArticleDetail extends Article {
  body: ArticleBlock[];
  /** "Try it on a Beginner work, about an hour.   See N°01" */
  cta: { text: string; work: { number: string; slug: string; duration: string } } | null;
}

// ── Guides ─────────────────────────────────────────────────────────────────

export interface GuideStepData {
  id: string; // "2c"
  position: number; // 1…5
  text: string;
  /** The brush of this step (AppStep); falls back to the layer's. */
  brush: string;
}

export interface GuideLayerData {
  position: number;
  name: string;
  brush: string;
  plate: Swatch[];
  tip: string;
  /** Painting time, "45 min" in "45 min, then dry 45 min". */
  minutes: number;
  drySeconds: number;
  diagram: DiagramStroke[];
  steps: GuideStepData[];
}

export interface Guide {
  id: string;
  workId: string;
  workNumber: string;
  workSlug: string;
  imageUrl: string;
  format: FormatKey;
  formatLabel: string;
  level: LevelKey;
  levelLabel: string;
  version: number;
  /** Mock only: true when the guide shows N°03's content because its own is not written yet. */
  isStandIn: boolean;
  layers: GuideLayerData[];
  stepCount: number;
  /** "3h30" (estimatedTime of the format and level): the printed cover's "~3h30 · 3 layers". */
  duration: string;
  /** What the printed guide adds to the steps; null when the guide has no printed version. */
  print: GuidePrintContent | null;
}

/** The printed guide's own copy (Guide01–08 boards). Paint colours are content. */
export interface GuidePrintContent {
  /** "Flat brush 50 mm": the tools line of "In the box" (after the canvas and the tubes). */
  boxTools: string[];
  kitchen: string[];
  rules: string[];
  /** "Your six tubes" (Guide03); also the tubes of "In the box". */
  tubes: Swatch[];
  mixes: Array<{ name: string; hex: string; parts: Swatch[] }>;
  mixNote: string;
  /** "The plan" (Guide04). */
  plan: string;
  brushes: Array<{ name: string; use: string }>;
  /** Per layer, in order: the longer printed wording (Guide05–07). */
  layers: Array<{ summary: string; brush: string; tip: string; steps: string[]; colour: string }>;
  /** "Avoid mud" (Guide08). */
  mud: { first: string; second: string; mixed: string; clean: string; muddy: string };
  fixes: Array<{ problem: string; fix: string }>;
  sign: string[];
}

/** Who a printed guide is licensed to: the watermark of every page ("Licensed to … · order #GS-2041"). */
export interface GuideLicense {
  /** "Camille M." */
  name: string;
  email: string;
  /** "GS-2041" */
  orderNumber: string;
}

// ── Prints ─────────────────────────────────────────────────────────────────

export interface PrintEdition {
  id: string;
  workId: string;
  workNumber: string;
  workSlug: string;
  imageUrl: string;
  size: PrintSize;
  editionSize: number;
  priceCents: number;
  open: boolean;
  sold: number;
  reserved: number;
  left: number;
  soldOut: boolean;
  /** Number the next buyer gets ("Edition 12/50"); null when sold out. */
  nextNumber: number | null;
}

export interface PrintCopy {
  id: string;
  editionId: string;
  number: number;
  label: string; // "12/50"
  certificateNo: string | null;
  fulfilment: FulfilmentStatus;
  printedAt: string | null;
  workNumber: string;
  size: PrintSize;
  imageUrl: string;
  orderNumber: string | null;
  customerName: string | null;
  city: string | null;
}

// ── Cart ───────────────────────────────────────────────────────────────────

/** What "Add to cart" sends: choices only, never a price. */
export type CartLineInput =
  | { kind: "guide"; workId: string; format: FormatKey; level: LevelKey | "match"; palette: PaletteKey }
  | { kind: "print"; editionId: string; quantity: number }
  | { kind: "gift_card"; amountCents: number; recipientEmail?: string; recipientName?: string; message?: string; sendOn?: string };

/** A cart line as stored (browser in the mock, `carts.items` later). */
export type StoredCartLine = CartLineInput & { id: string; addedAt: string };

export interface PricedCartLine extends CartItem {
  /** Checkout summary: "60×80 · Intermediate", "A3 · Edition 12/50". */
  shortDetail: string;
  /** Receipt and phone summary: "N°03 — Guide, 60×80", "N°07 — Print A3, 12/50". */
  receiptTitle: string;
  /** Prints: the edition and the first number this line gets. */
  edition?: { id: string; size: string; editionSize: number; firstNumber: number; left: number };
  /** Second line under the detail: "+ shopping list", "Signed, with certificate". */
  note: string | null;
  /** Where the title links (the work page with the same config), null when unknown. */
  href: string | null;
  /** Stepper limit: 1 for guides and gift cards, copies left for prints. */
  maxQuantity: number;
  /** Not counted in the totals: the work was unpublished, the edition sold out, or the amount is invalid. */
  unavailable: "unknown" | "sold_out" | "invalid" | null;
}

export interface PricedCart {
  lines: PricedCartLine[];
  /** "Cart (2)": number of payable items. */
  count: number;
  hasPhysical: boolean;
  /** A guide is in the cart → withdrawal-waiver checkbox at payment. */
  hasGuide: boolean;
  totals: CartTotals;
  crossSell: { workNumber: string; href: string; fromPriceCents: number } | null;
}

// ── Orders ─────────────────────────────────────────────────────────────────

export type OrderDisplayStatus =
  | "Pending" | "To ship" | "Printed" | "Packed" | "Shipped" | "Delivered"
  | "Refund asked" | "Partly refunded" | "Refunded" | "Cancelled";

export type OrdersTab = "all" | "to_ship" | "issues" | "done";

export interface OrdersQuery {
  tab?: OrdersTab;
  kind?: ItemKind;
  customerId?: string;
  /** Matches order number, customer name or email. */
  search?: string;
}

export interface OrderItem {
  id: string;
  kind: ItemKind;
  workId: string | null;
  workSlug: string | null;
  /** "N°03" */
  workNumber: string | null;
  guideId: string | null;
  editionId: string | null;
  config: { format?: FormatKey; level?: LevelKey; palette?: PaletteKey };
  title: string; // "Guide N°03"
  detail: string; // "60×80 · Intermediate · Original"
  imageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
  fulfilment: FulfilmentStatus;
  certificateNo: string | null;
  /** Prints: the numbered copies of this line (12 in 12/50), lowest first. */
  copyNumbers: number[];
  /** Prints: "A3", 50. */
  edition: { size: string; editionSize: number } | null;
  /** Prints: when the copy was printed and signed (Tracking board). */
  printedAt: string | null;
}

export interface Refund {
  id: string;
  amountCents: number;
  reason: string;
  restock: boolean;
  revokeAccess: boolean;
  createdAt: string;
}

export interface Shipment {
  id: string;
  carrier: "colissimo" | "mondial_relay" | "chronopost";
  trackingNo: string;
  parcel: string;
  status: "label_created" | "in_transit" | "delivered";
  shippedAt: string | null;
  inTransitAt: string | null;
  outForDeliveryAt: string | null;
  deliveredAt: string | null;
}

/** One row of the Tracking board's timeline. `current` is the last step reached (drawn 500). */
export interface TrackingStep {
  key: "ordered" | "printed" | "handed" | "in_transit" | "out_for_delivery" | "delivered";
  label: string; // "Handed to Colissimo"
  at: string | null;
  done: boolean;
  current: boolean;
}

/** /track: where a parcel is (Tracking, MTracking). */
export interface OrderTracking {
  number: string;
  shippingMethod: ShippingMethod | null;
  carrier: { name: string; url: string };
  /** "6A 123 456 789 01", null until the label exists. */
  trackingNo: string | null;
  steps: TrackingStep[];
  /** Delivery date once delivered, else the end of the carrier's window. */
  delivered: boolean;
  deliveryDate: string;
  prints: OrderItem[];
  shippingAddress: Address | null;
  /** First guide of the order ("Meanwhile, keep painting N°03"). */
  guide: { workNumber: string } | null;
}

export interface Order {
  id: string;
  number: string; // "GS-2041"
  status: OrderStatus;
  displayStatus: OrderDisplayStatus;
  customer: { id: string; fullName: string; email: string };
  /** "Guide N°03 · Print N°07 A3" (AdminOrders "Items" column). */
  summary: string;
  items: OrderItem[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  shippingMethod: ShippingMethod | null;
  taxCents: number;
  totalCents: number;
  shippingAddress: Address | null;
  cardLast4: string;
  paymentIntent: string;
  risk: "low" | "medium" | "high";
  paidAt: string;
  createdAt: string;
  refunds: Refund[];
  shipment: Shipment | null;
}

export interface OrderEvent {
  at: string;
  label: string;
}

export interface OrderDetail extends Order {
  timeline: OrderEvent[];
  customerOrdersCount: number;
  customerLifetimeCents: number;
  supportThreads: SupportThread[];
}

// ── People ─────────────────────────────────────────────────────────────────

export type CustomerSegment = "all" | "repeat" | "newsletter" | "abroad";

export interface CustomerSummary {
  id: string;
  fullName: string;
  email: string;
  locale: "en" | "fr";
  newsletter: boolean;
  country: string;
  city: string;
  ordersCount: number;
  spentCents: number;
  lastOrderAt: string | null;
  createdAt: string;
}

export interface CustomerDetail extends CustomerSummary {
  phone: string | null;
  address: Address;
  orders: Order[];
  library: LibraryItem[];
  reviews: Review[];
}

export interface LibraryItem {
  entitlementId: string;
  /** Every step id of the guide in reading order ("1a" … "3e"): progress = position of `step`. */
  stepIds: string[];
  guideId: string;
  work: { id: string; number: string; slug: string; imageUrl: string };
  format: FormatKey;
  level: LevelKey;
  paletteKey: PaletteKey;
  paletteName: string;
  /** "60×80 · Intermediate · Original palette" (Account board). */
  detail: string;
  printsLeft: number;
  step: string; // "2a"
  currentLayer: number;
  layerCount: number;
  state: "not_started" | "in_progress" | "finished";
  openedAt: string | null;
  completedAt: string | null;
  revoked: boolean;
  createdAt: string;
}

export interface Passkey {
  id: string;
  /** "iPhone" */
  device: string;
  addedAt: string;
}

/** Settings › Password and Passkeys. */
export interface AccountSecurity {
  passwordChangedAt: string;
  passkeys: Passkey[];
}

export interface StaffMember {
  id: string;
  email: string;
  fullName: string;
  role: StaffRole;
  totpEnabled: boolean;
}

export interface Review {
  id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  body: string;
  photoUrl: string | null;
  status: ReviewStatus;
  createdAt: string;
  customer: { id: string; fullName: string };
  work: { id: string; number: string; slug: string };
}

export interface ReviewsQuery {
  status?: ReviewStatus | ReviewStatus[];
  workId?: string;
}

export interface SupportThread {
  id: string;
  subject: string;
  email: string;
  customerId: string | null;
  customerName: string | null;
  orderNumber: string | null;
  category: "refund" | "question" | "problem";
  status: ThreadStatus;
  createdAt: string;
  updatedAt: string;
}
