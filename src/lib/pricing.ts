/**
 * Every price of the store. The SAME functions run on the server in createPaymentIntent: the client
 * price is display only. Admin can override a work's guide price per format (work_formats) and a
 * print price per edition (print_editions); the values here are the defaults.
 */

export type Orientation = "portrait" | "landscape";

/**
 * Canvas formats, named portrait (width × height). A landscape work sells the same four formats
 * turned (40×30, 50×40, 80×60, 100×80): same guide, same price. The guide price depends on the format
 * only, level included (docs/decisions.md "Prices by format").
 */
export const FORMATS = {
  "30x40": { label: "30×40", landscapeLabel: "40×30", name: "Small", guideCents: 1500, defaultLevel: "beginner", baseMinutes: 60, canvasUsd: 6, tubeUsd: 2.5, tubeMl: "20 ml", brushUsd: 4 },
  "40x50": { label: "40×50", landscapeLabel: "50×40", name: "Medium", guideCents: 1900, defaultLevel: "beginner", baseMinutes: 90, canvasUsd: 9, tubeUsd: 3.5, tubeMl: "40 ml", brushUsd: 4 },
  "60x80": { label: "60×80", landscapeLabel: "80×60", name: "Large", guideCents: 2500, defaultLevel: "intermediate", baseMinutes: 150, canvasUsd: 16, tubeUsd: 4.5, tubeMl: "60 ml", brushUsd: 7 },
  "80x100": { label: "80×100", landscapeLabel: "100×80", name: "Extra large", guideCents: 2900, defaultLevel: "advanced", baseMinutes: 210, canvasUsd: 24, tubeUsd: 7.5, tubeMl: "120 ml", brushUsd: 7 },
} as const;

/** Levels change the layers and the time, never the price ("Custom" is free). */
export const LEVELS = {
  beginner: { label: "Beginner", layers: 2, timeFactor: 1 },
  intermediate: { label: "Intermediate", layers: 3, timeFactor: 1.4 },
  advanced: { label: "Advanced", layers: 5, timeFactor: 2 },
} as const;

/** "Signature" works (works.signature): every format of their guide costs this much more. */
export const SIGNATURE_CENTS = 600;

/** Guide and print of the same work in one cart: this percentage off both lines. */
export const BUNDLE_DISCOUNT_PCT = 15;

/**
 * Limited print sizes, named portrait (width × height in cm); a landscape work's print is turned.
 * Price and edition size are the defaults of a new edition; admin can change them per edition.
 */
export const PRINT_SIZES = {
  S: { paper: "A3", cm: [30, 42], editionSize: 100, priceCents: 5500 },
  M: { paper: "A2", cm: [42, 59], editionSize: 50, priceCents: 9500 },
  L: { paper: "50×70", cm: [50, 70], editionSize: 25, priceCents: 14500 },
} as const;
export type PrintSize = keyof typeof PRINT_SIZES;
export const PRINT_SIZE_ORDER: PrintSize[] = ["S", "M", "L"];
/** The print sold with a guide on the work page ("Guide + list + print"). */
export const PRINT_WITH_GUIDE: PrintSize = "S";

/** Print shipping. Relay and home are on the Cart ("from $4") and AdminOrderDetail boards, express on Checkout; international is a mock value. */
export const SHIPPING = {
  mondial_relay: { label: "Mondial Relay", cents: 400 },
  colissimo: { label: "Colissimo — home", cents: 600 },
  international: { label: "Colissimo — international", cents: 1200 },
  chronopost_express: { label: "Chronopost — express", cents: 1400 }, // Checkout board: next working day
} as const;
export type ShippingMethod = keyof typeof SHIPPING;

export type FormatKey = keyof typeof FORMATS;
export type LevelKey = keyof typeof LEVELS;

export interface GuideConfig {
  format: FormatKey;
  /** "match" = the format's default level (the validated default). Otherwise a chosen level ("Custom"). */
  level: LevelKey | "match";
  palette: string;
  withPrint?: boolean;
}

/** A format and a level, with or without the rest of a configuration. */
type FormatLevel = Pick<GuideConfig, "format" | "level"> & Partial<GuideConfig>;

/** What makes one work's guide price differ from the defaults. */
export interface WorkPricing {
  signature?: boolean;
  /** work_formats.guide_price_cents, when the admin changed it. */
  formatCents?: Partial<Record<FormatKey, number>>;
}

export function resolveLevel(c: FormatLevel): LevelKey {
  return c.level === "match" ? FORMATS[c.format].defaultLevel : c.level;
}

/**
 * Width / height of a work's image (works.preview_width / preview_height), for grids that give every
 * work the same height. Unknown size (a draft without its image yet): 4:5, or 5:4 when landscape.
 */
export function imageRatio(w: { previewWidth?: number | null; previewHeight?: number | null; orientation?: Orientation }): number {
  if (w.previewWidth && w.previewHeight) return w.previewWidth / w.previewHeight;
  return w.orientation === "landscape" ? 5 / 4 : 4 / 5;
}

/** "60×80", or "80×60" for a landscape work. */
export function formatLabel(format: FormatKey, orientation: Orientation = "portrait"): string {
  return orientation === "landscape" ? FORMATS[format].landscapeLabel : FORMATS[format].label;
}

/** "60 × 80 cm", turned for a landscape work (shopping list, printed guide). */
export function formatCm(format: FormatKey, orientation: Orientation = "portrait"): string {
  return `${formatLabel(format, orientation).replace("×", " × ")} cm`;
}

/** Guide price before the Signature supplement: the work's own price for the format, or the default. */
export function guideBaseCents(format: FormatKey, work?: WorkPricing): number {
  return work?.formatCents?.[format] ?? FORMATS[format].guideCents;
}

/** Guide price of a work in a format, level included. */
export function guidePriceCents(format: FormatKey, work?: WorkPricing): number {
  return guideBaseCents(format, work) + (work?.signature ? SIGNATURE_CENTS : 0);
}

/** Bundle discount on one line (guide or print of a work that has both in the cart), rounded to the cent. */
export function bundleDiscountCents(lineCents: number): number {
  return Math.round((lineCents * BUNDLE_DISCOUNT_PCT) / 100);
}

/** A guide alone, or a guide and a print of the same work with the bundle discount on both. */
export function bundleTotalCents(guideCents: number, printCents: number | null): number {
  if (printCents === null) return guideCents;
  return guideCents - bundleDiscountCents(guideCents) + printCents - bundleDiscountCents(printCents);
}

/** Work page total: the guide, plus the S print with the bundle discount on both when "Guide + list + print". */
export function totalCents(c: GuideConfig, work?: WorkPricing, printCents: number = PRINT_SIZES[PRINT_WITH_GUIDE].priceCents): number {
  return bundleTotalCents(guidePriceCents(c.format, work), c.withPrint ? printCents : null);
}

/** "30 × 42 cm", turned for a landscape work. */
export function printCm(size: PrintSize, orientation: Orientation = "portrait"): string {
  const [w, h] = PRINT_SIZES[size].cm;
  return orientation === "landscape" ? `${h} × ${w} cm` : `${w} × ${h} cm`;
}

/** "3h30" — rounded to 10 minutes. */
export function estimatedTime(c: FormatLevel): string {
  const mins = Math.round((FORMATS[c.format].baseMinutes * LEVELS[resolveLevel(c)].timeFactor) / 10) * 10;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m ? String(m).padStart(2, "0") : ""}`;
}

/** Materials estimate shown next to the shopping list ("~$41 at partner stores"). */
export function materialsEstimateUsd(c: FormatLevel): number {
  const f = FORMATS[c.format];
  const lvl = resolveLevel(c);
  const base = f.canvasUsd + f.tubeUsd * 5 + f.brushUsd + (lvl === "advanced" ? 8 : 0);
  return Math.round(base * 1.6);
}

/** Works that have both a guide and a print among the lines: those lines get the bundle discount. */
export function bundledWorks(lines: ReadonlyArray<{ kind: string; workId: string | null | undefined }>): Set<string> {
  const guides = new Set(lines.filter((l) => l.kind === "guide" && l.workId).map((l) => l.workId!));
  return new Set(lines.filter((l) => l.kind === "print" && l.workId && guides.has(l.workId)).map((l) => l.workId!));
}
