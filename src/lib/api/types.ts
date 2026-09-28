/**
 * What the API returns. Pages depend on these types only, never on `src/data`: when the API moves
 * to Supabase, these stay and the pages do not change. Images are ready-to-use URLs.
 */
import type { FormatKey, LevelKey, PrintSize, ShippingMethod } from "@/lib/pricing";
import type { DiagramStroke } from "@/components/reader/CanvasDiagram";

export type { FormatKey, LevelKey, PrintSize, ShippingMethod, DiagramStroke };

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
  quantity: string; // "60 ml", scaled to the format
  standard: { label: string; priceCents: number; url: string };
  budget: { label: string; priceCents: number; url: string };
}

// ── Guides ─────────────────────────────────────────────────────────────────

export interface GuideStepData {
  id: string; // "2c"
  position: number; // 1…5
  text: string;
}

export interface GuideLayerData {
  position: number;
  name: string;
  brush: string;
  plate: Swatch[];
  tip: string;
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
  deliveredAt: string | null;
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
