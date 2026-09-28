/**
 * Mock tables. Each type mirrors one table of supabase/migrations/0001_init.sql, in camelCase,
 * with storage paths (not URLs). Only `src/lib/api` reads these files; pages never import them.
 */
import type {
  Address, DiagramStroke, FormatKey, FulfilmentStatus, ItemKind, LevelKey, OrderStatus, PaletteKey, PrintSize,
  ReviewStatus, ShippingMethod, Swatch, ThreadStatus, WorkStatus,
} from "@/lib/api/types";

export type { Address, FulfilmentStatus, ItemKind, OrderStatus, PaletteKey, ReviewStatus, Swatch, ThreadStatus, WorkStatus };
export type CopyStatus = "available" | "reserved" | "sold" | "void";

export interface WorkRow {
  id: string;
  number: string; // "N°03"
  slug: string; // "n03"
  status: WorkStatus;
  publishAt: string | null;
  defaultFormat: FormatKey;
  description: string;
  previewPath: string; // "mock/work-03.jpg"
  resultPhotoPath: string | null;
  studioTested: boolean;
  seoTitle: string;
  seoDescription: string;
  sortOrder: number;
}

export interface WorkFormatRow {
  workId: string;
  format: FormatKey;
  defaultLevel: LevelKey;
  guidePriceCents: number; // base, level surcharge added by pricing.ts
  estMinutes: number;
  active: boolean;
}

export interface PaletteRow {
  workId: string;
  key: PaletteKey;
  name: string;
  swatches: Swatch[];
  previewFilter: string | null; // CSS filter applied to the preview image
  active: boolean;
}

export interface GuideRow {
  id: string;
  workId: string;
  format: FormatKey;
  level: LevelKey;
  currentVersion: number; // 0 = never published
}

export interface GuideVersionContent {
  layers: Array<{
    position: number;
    name: string;
    brush: string;
    plate: Swatch[];
    tip: string;
    drySeconds: number;
    diagram: DiagramStroke[];
    steps: Array<{ position: number; text: string }>;
  }>;
}

export interface GuideVersionRow {
  guideId: string;
  version: number;
  content: GuideVersionContent;
  publishedAt: string;
}

export interface ShoppingItemRow {
  workId: string;
  position: number;
  name: string;
  standardLabel: string;
  budgetLabel: string;
  standardCents: number;
  budgetCents: number;
  standardUrl: string;
  budgetUrl: string;
  quantityRule: Record<FormatKey, string>;
}

export interface PrintEditionRow {
  id: string;
  workId: string;
  size: PrintSize;
  editionSize: number;
  priceCents: number;
  open: boolean;
  /** Mock only: in the database these two are counted from print_copies. */
  soldCount: number;
  reservedCount: number;
}

export interface PrintCopyRow {
  id: string;
  editionId: string;
  number: number; // 12 in 12/50
  status: CopyStatus;
  orderItemId: string | null;
  fulfilment: FulfilmentStatus;
  certificateNo: string | null; // "C-07-012"
  printedAt: string | null;
}

export interface ProfileRow {
  id: string;
  email: string;
  fullName: string;
  locale: "en" | "fr";
  newsletter: boolean;
  phone: string | null;
  defaultAddress: Address;
  createdAt: string;
}

export interface OrderItemRow {
  id: string;
  kind: ItemKind;
  workId: string | null;
  guideId: string | null;
  editionId: string | null;
  config: { format?: FormatKey; level?: LevelKey; palette?: PaletteKey };
  title: string; // "Guide N°03"
  detail: string; // "60×80 · Intermediate · Original"
  unitPriceCents: number;
  quantity: number;
  fulfilment: FulfilmentStatus;
}

export interface OrderRow {
  id: string;
  number: string; // "GS-2041"
  userId: string;
  email: string;
  status: OrderStatus;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  shippingMethod: ShippingMethod | null;
  taxCents: number; // VAT included in the total
  totalCents: number;
  shippingAddress: Address | null;
  stripePaymentIntent: string;
  cardLast4: string;
  risk: "low" | "medium" | "high";
  withdrawalWaived: boolean;
  paidAt: string;
  createdAt: string;
  items: OrderItemRow[];
}

export interface RefundRow {
  id: string;
  orderId: string;
  amountCents: number;
  reason: string;
  restock: boolean;
  revokeAccess: boolean;
  createdAt: string;
}

export interface ShipmentRow {
  id: string;
  orderId: string;
  carrier: "colissimo" | "mondial_relay" | "chronopost";
  trackingNo: string;
  parcel: string; // "Tube 60 cm · 0.4 kg"
  status: "label_created" | "in_transit" | "delivered";
  shippedAt: string | null;
  deliveredAt: string | null;
}

export interface EntitlementRow {
  id: string;
  userId: string;
  guideId: string;
  orderItemId: string;
  paletteKey: PaletteKey;
  printsLeft: number;
  progress: { step: string; completedAt?: string };
  openedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface ReviewRow {
  id: string;
  userId: string;
  workId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  body: string;
  photoPath: string | null;
  status: ReviewStatus;
  createdAt: string;
}

export interface SupportThreadRow {
  id: string;
  userId: string | null;
  email: string;
  subject: string;
  orderId: string | null;
  /** Mock only (no column yet): drives the "Refund asked" order status on AdminOrders. */
  category: "refund" | "question" | "problem";
  status: ThreadStatus;
  createdAt: string;
  updatedAt: string;
}
