/**
 * Mock tables. Each type mirrors one table of supabase/migrations/0001_init.sql, in camelCase,
 * with storage paths (not URLs). Only `src/lib/api` reads these files; pages never import them.
 */
import type { Orientation } from "@/lib/pricing";
import type {
  Address, DiagramStroke, FormatKey, FulfilmentStatus, ItemKind, LevelKey, OrderStatus, PaletteKey, PrintSize,
  ReviewStatus, ShippingMethod, Swatch, ThreadStatus, WorkStatus, GuidePrintContent,
} from "@/lib/api/types";

export type { ArticleRow } from "./articles";
export type { Orientation };
export type { GuidePrintContent, Address, FulfilmentStatus, ItemKind, OrderStatus, PaletteKey, ReviewStatus, Swatch, ThreadStatus, WorkStatus };
export type CopyStatus = "available" | "reserved" | "sold" | "void";

export interface WorkRow {
  id: string;
  number: string; // "N°03"
  slug: string; // "n03"
  status: WorkStatus;
  publishAt: string | null;
  defaultFormat: FormatKey;
  /** `works.orientation` (0003): a landscape work sells its formats turned and is shown landscape. */
  orientation: Orientation;
  /** `works.signature` (0003): the guide costs SIGNATURE_CENTS more, "Signature" on the card and page. */
  signature: boolean;
  description: string;
  previewPath: string; // "mock/work-03.jpg"
  /** `works.preview_width/height` (0003): pixel size of the preview, read at upload. Grids size the work by its real ratio. */
  previewWidth: number;
  previewHeight: number;
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
  guidePriceCents: number; // any level; the Signature supplement is added by pricing.ts
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
    /** `guide_layers.minutes` (0002): painting time of the layer, "45 min, then dry 45 min". */
    minutes: number;
    drySeconds: number;
    diagram: DiagramStroke[];
    /** `guide_steps.brush` (0002): the brush of this step on the phone (AppStep); the layer's brush when absent, "—" for none. */
    steps: Array<{ position: number; text: string; brush?: string }>;
  }>;
  /** `guide_print.content` (0002), published with the version: what the printed guide adds to the steps (Guide01–08). */
  print?: GuidePrintContent;
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
  /** "Acrylic, {q}": {q} is replaced by quantityRule[format] (the canvas size, the tube). */
  standardLabel: string;
  budgetLabel: string;
  standardCents: number;
  budgetCents: number;
  standardUrl: string;
  budgetUrl: string;
  quantityRule: Record<FormatKey, string> | null;
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
  number: number; // 12 in 12/100
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
  /** Mock-only (admin overlay): set by the GDPR deletion, `profiles.deletion_scheduled_at` later. */
  deletionScheduledAt?: string | null;
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
  /** `order_items.discount_cents` (0003): the guide + print bundle discount on this line, all copies. */
  discountCents: number;
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
  /** When the label was bought (admin "Create shipping label"); absent on the mock rows. */
  labelCreatedAt?: string | null;
  shippedAt: string | null;
  /** Mock-only: the carrier's scans (Boxtal tracking webhook), not columns yet (docs/decisions.md "Mock-only fields"). */
  inTransitAt: string | null;
  outForDeliveryAt: string | null;
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
  /** Mock only (no column yet): when staff last opened the thread; null = new ("2 new support messages"). */
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** `support_messages`: one message of a thread, from the customer (inbound email) or from staff. */
export interface SupportMessageRow {
  id: string;
  threadId: string;
  from: "customer" | "staff";
  body: string;
  /** Staff author ("Lucas"); null for the customer. */
  staffName: string | null;
  createdAt: string;
}

/** `site_settings` "support.saved_replies": `{name}` is replaced by the customer's first name. */
export interface SavedReplyRow {
  id: string;
  name: string;
  body: string;
}

/** `ai_jobs` (AdminAIPipeline): one generation run. Progress is the pipeline's, stored by the worker. */
export interface AiJobRow {
  id: string; // "job-118"
  number: number; // 118
  params: {
    style: "gestural" | "colour_field" | "drips_veils";
    format: FormatKey;
    medium: "acrylic" | "gouache";
    palette: PaletteKey;
    maxStrokes: number;
    layers: number;
    candidates: number;
  };
  /** "Gestural · coral & blue · 60×80" */
  label: string;
  status: "queued" | "running" | "done" | "failed";
  progress: number; // 0–100
  costCents: number;
  createdAt: string;
}

/** `ai_candidates`: one stroke plan to approve (→ draft work + guide) or reject. */
export interface AiCandidateRow {
  id: string; // "C-114-a"
  jobNumber: number;
  imagePath: string;
  similarity: number; // %
  strokes: number;
  layers: number;
  /** "Beginner-friendly", "Too many strokes for level" (Signal when it warns) */
  note: string;
  status: "pending" | "approved" | "rejected";
  /** Draft work created on approval. */
  workSlug: string | null;
  createdAt: string;
}
