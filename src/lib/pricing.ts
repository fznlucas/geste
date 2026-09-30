/**
 * Every price of the store. The SAME functions run on the server in createPaymentIntent: the client
 * price is display only. Admin can override a work's guide price per format (work_formats) and a
 * print price per edition (print_editions); the values here are the defaults.
 */

export type Orientation = "portrait" | "landscape";

/** Proportion family of a work (works.proportion): its three canvases keep the work's own ratio. */
export type Proportion = "3:4" | "4:5" | "5:6";
/** Size of a canvas within its family. */
export type SizeKey = "small" | "medium" | "large";
export type LevelKey = "beginner" | "intermediate" | "advanced";

/**
 * Sizes: the guide price (any level, "Custom" free) and the default level, one step below the work's
 * base level on the small canvas and one above on the large one (docs/decisions.md "Formats by work").
 */
export const SIZES = {
  small: { label: "Small", guideCents: 1500, levelStep: -1 },
  medium: { label: "Medium", guideCents: 1900, levelStep: 0 },
  large: { label: "Large", guideCents: 2500, levelStep: 1 },
} as const satisfies Record<SizeKey, { label: string; guideCents: number; levelStep: number }>;
export const SIZE_ORDER: SizeKey[] = ["small", "medium", "large"];

interface Canvas {
  /** Width × height in cm, portrait. A landscape work sells it turned (40×30 …): same guide, same price. */
  cm: readonly [number, number];
  proportion: Proportion;
  size: SizeKey;
  guideCents: number;
}
const canvas = (w: number, h: number, proportion: Proportion, size: SizeKey, guideCents: number = SIZES[size].guideCents): Canvas => ({ cm: [w, h], proportion, size, guideCents });

/**
 * Stock canvases, named portrait (width × height). Each work sells the three of its proportion
 * family; 80×100 is the largest of the catalog and costs $29 instead of the Large $25.
 */
export const CANVASES = {
  "30x40": canvas(30, 40, "3:4", "small"),
  "46x61": canvas(46, 61, "3:4", "medium"),
  "60x80": canvas(60, 80, "3:4", "large"),
  "24x30": canvas(24, 30, "4:5", "small"),
  "40x50": canvas(40, 50, "4:5", "medium"),
  "80x100": canvas(80, 100, "4:5", "large", 2900),
  "38x46": canvas(38, 46, "5:6", "small"),
  "50x60": canvas(50, 60, "5:6", "medium"),
  "60x73": canvas(60, 73, "5:6", "large"),
} satisfies Record<string, Canvas>;
export type FormatKey = keyof typeof CANVASES;

/** The three canvases of each family, small → large. */
export const PROPORTIONS: Record<Proportion, { ratio: number; formats: readonly [FormatKey, FormatKey, FormatKey] }> = {
  "3:4": { ratio: 3 / 4, formats: ["30x40", "46x61", "60x80"] },
  "4:5": { ratio: 4 / 5, formats: ["24x30", "40x50", "80x100"] },
  "5:6": { ratio: 5 / 6, formats: ["38x46", "50x60", "60x73"] },
};
export const PROPORTION_ORDER: Proportion[] = ["3:4", "4:5", "5:6"];

/** The largest canvas of the catalog (80×100): the work page's preview scale is set on it. */
export const LARGEST_CANVAS_CM = Math.max(...Object.values(CANVASES).map((c) => c.cm[1]));

export function isFormatKey(v: unknown): v is FormatKey {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(CANVASES, v);
}

/** The formats a work sells, small → large. */
export function formatsOf(proportion: Proportion): FormatKey[] {
  return [...PROPORTIONS[proportion].formats];
}

/** The medium canvas: the work page's default and the cards' price. */
export function mediumFormat(proportion: Proportion): FormatKey {
  return PROPORTIONS[proportion].formats[1];
}

/** Levels change the layers and the time, never the price ("Custom" is free). */
export const LEVELS = {
  beginner: { label: "Beginner", layers: 2, timeFactor: 1 },
  intermediate: { label: "Intermediate", layers: 3, timeFactor: 1.4 },
  advanced: { label: "Advanced", layers: 5, timeFactor: 2 },
} as const satisfies Record<LevelKey, { label: string; layers: number; timeFactor: number }>;
export const LEVEL_ORDER: LevelKey[] = ["beginner", "intermediate", "advanced"];

/** Shown under the level and on the cart line when the level is below the work's base level. */
export const SIMPLIFIED_LABEL = "Simplified version";

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

export interface GuideConfig {
  format: FormatKey;
  /** "match" = the default level of the format for this work (the validated default). Otherwise a chosen level ("Custom"). */
  level: LevelKey | "match";
  palette: string;
  withPrint?: boolean;
}

/** What makes one work's guide price differ from the defaults. */
export interface WorkPricing {
  signature?: boolean;
  /** work_formats.guide_price_cents, when the admin changed it. */
  formatCents?: Partial<Record<FormatKey, number>>;
}

/**
 * Default level of a format for a work: its base level on the medium canvas, one step below on the
 * small one, one above on the large one, never below Beginner nor above Advanced.
 */
export function defaultLevel(format: FormatKey, baseLevel: LevelKey): LevelKey {
  const i = LEVEL_ORDER.indexOf(baseLevel) + SIZES[CANVASES[format].size].levelStep;
  return LEVEL_ORDER[Math.min(LEVEL_ORDER.length - 1, Math.max(0, i))]!;
}

/** The level a configuration paints at: its chosen level, or the format's default for the work. */
export function resolveLevel(c: { format: FormatKey; level: LevelKey | "match" }, baseLevel: LevelKey): LevelKey {
  return c.level === "match" ? defaultLevel(c.format, baseLevel) : c.level;
}

/** Below the work's base level, the guide is a simplified version: fewer layers, gestures grouped, a rawer finish. */
export function isSimplified(level: LevelKey, baseLevel: LevelKey): boolean {
  return LEVEL_ORDER.indexOf(level) < LEVEL_ORDER.indexOf(baseLevel);
}

/**
 * Width / height of a work's image (works.preview_width / preview_height), for grids that give every
 * work the same height. Unknown size (a draft without its image yet): 4:5, or 5:4 when landscape.
 */
export function imageRatio(w: { previewWidth?: number | null; previewHeight?: number | null; orientation?: Orientation }): number {
  if (w.previewWidth && w.previewHeight) return w.previewWidth / w.previewHeight;
  return w.orientation === "landscape" ? 5 / 4 : 4 / 5;
}

/** [width, height] of the canvas in cm, turned for a landscape work. */
export function canvasCm(format: FormatKey, orientation: Orientation = "portrait"): [number, number] {
  const [w, h] = CANVASES[format].cm;
  return orientation === "landscape" ? [h, w] : [w, h];
}

/** Painted surface in cm²: the shopping list's quantities and the time follow it. */
export function canvasArea(format: FormatKey): number {
  const [w, h] = CANVASES[format].cm;
  return w * h;
}

/** "60×80", or "80×60" for a landscape work. */
export function formatLabel(format: FormatKey, orientation: Orientation = "portrait"): string {
  return canvasCm(format, orientation).join("×");
}

/** "60 × 80 cm", turned for a landscape work (shopping list, printed guide). */
export function formatCm(format: FormatKey, orientation: Orientation = "portrait"): string {
  return `${canvasCm(format, orientation).join(" × ")} cm`;
}

/** Guide price before the Signature supplement: the work's own price for the format, or the default. */
export function guideBaseCents(format: FormatKey, work?: WorkPricing): number {
  return work?.formatCents?.[format] ?? CANVASES[format].guideCents;
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

/**
 * Painting time at Beginner, in minutes: 60 min on 30×40 (1,200 cm²), growing with the surface to the
 * power 2/3 (a wider brush covers more per stroke), so 80×100 (8,000 cm²) takes 3h30.
 */
function baseMinutes(format: FormatKey): number {
  return 60 * (canvasArea(format) / 1200) ** (2 / 3);
}

/** Painting time of a format at a level, rounded to 10 minutes (work_formats.est_minutes at the default level). */
export function estimatedMinutes(format: FormatKey, level: LevelKey): number {
  return Math.round((baseMinutes(format) * LEVELS[level].timeFactor) / 10) * 10;
}

/** "3h30", "40 min" under an hour — rounded to 10 minutes. */
export function estimatedTime(format: FormatKey, level: LevelKey): string {
  const mins = estimatedMinutes(format, level);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m ? String(m).padStart(2, "0") : ""}`;
}

/** Stock tube sizes, with a partner-store price: a list line takes the smallest tube that holds what the surface needs. */
const TUBES: Array<[ml: number, usd: number]> = [[20, 2.5], [40, 3.5], [60, 4.5], [75, 5], [120, 7.5], [200, 11], [250, 13], [500, 22]];
/** Paint used per cm² of canvas: one colour, and the white (it goes in most mixes). */
const COLOUR_ML_PER_CM2 = 0.015;
const WHITE_ML_PER_CM2 = 0.03;

function tubeFor(ml: number, smallest = 20): [number, number] {
  return TUBES.find(([size]) => size >= smallest && size >= ml) ?? TUBES[TUBES.length - 1]!;
}

/** One colour's tube for the canvas: "20 ml" on 30×40, "120 ml" on 80×100. */
export function tubeMl(format: FormatKey): string {
  return `${tubeFor(canvasArea(format) * COLOUR_ML_PER_CM2)[0]} ml`;
}

/** The white's tube (40 ml at least). */
export function whiteMl(format: FormatKey): string {
  return `${tubeFor(canvasArea(format) * WHITE_ML_PER_CM2, 40)[0]} ml`;
}

/** What a shopping list line scales with (shopping_items.quantity_kind): the canvas itself, a colour, the white. */
export type QuantityKind = "canvas" | "tube" | "white";

/** "{q}" of a shopping list line: "60 × 80 cm", "60 ml". */
export function quantityLabel(kind: QuantityKind, format: FormatKey, orientation: Orientation = "portrait"): string {
  return kind === "canvas" ? formatCm(format, orientation) : kind === "tube" ? tubeMl(format) : whiteMl(format);
}

/** Materials estimate shown next to the shopping list ("~$41 at partner stores"): canvas, five tubes, white, brushes, by surface. */
export function materialsEstimateUsd(format: FormatKey, level: LevelKey): number {
  const area = canvasArea(format);
  const canvasUsd = 3 + area * 0.00265;
  const tubes = tubeFor(area * COLOUR_ML_PER_CM2)[1] * 5 + tubeFor(area * WHITE_ML_PER_CM2, 40)[1];
  const brushUsd = area < 3000 ? 4 : 7;
  return Math.round((canvasUsd + tubes + brushUsd + (level === "advanced" ? 8 : 0)) * 1.6);
}

/** Works that have both a guide and a print among the lines: those lines get the bundle discount. */
export function bundledWorks(lines: ReadonlyArray<{ kind: string; workId: string | null | undefined }>): Set<string> {
  const guides = new Set(lines.filter((l) => l.kind === "guide" && l.workId).map((l) => l.workId!));
  return new Set(lines.filter((l) => l.kind === "print" && l.workId && guides.has(l.workId)).map((l) => l.workId!));
}
