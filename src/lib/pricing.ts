/**
 * Guide pricing, exactly as validated on the Product board. The SAME function runs on the
 * server in createPaymentIntent: the client price is display only.
 * Admin can override base prices per work in work_formats; these are the defaults.
 */
export const FORMATS = {
  "30x40": { label: "30×40", guideBase: 1200, defaultLevel: "beginner", baseMinutes: 60, canvasUsd: 6, tubeUsd: 2.5, tubeMl: "20 ml", brushUsd: 4 },
  "40x50": { label: "40×50", guideBase: 1300, defaultLevel: "beginner", baseMinutes: 90, canvasUsd: 9, tubeUsd: 3.5, tubeMl: "40 ml", brushUsd: 4 },
  "60x80": { label: "60×80", guideBase: 1700, defaultLevel: "intermediate", baseMinutes: 150, canvasUsd: 16, tubeUsd: 4.5, tubeMl: "60 ml", brushUsd: 7 },
  "80x100": { label: "80×100", guideBase: 2100, defaultLevel: "advanced", baseMinutes: 210, canvasUsd: 24, tubeUsd: 7.5, tubeMl: "120 ml", brushUsd: 7 },
} as const;

export const LEVELS = {
  beginner: { label: "Beginner", layers: 2, timeFactor: 1, surcharge: 0 },
  intermediate: { label: "Intermediate", layers: 3, timeFactor: 1.4, surcharge: 200 },
  advanced: { label: "Advanced", layers: 5, timeFactor: 2, surcharge: 400 },
} as const;

/** Limited print sizes (Print board: A3 $45, A2 $75, 50×70 $95). Admin can override per edition. */
export const PRINT_PRICES = { A3: 4500, A2: 7500, "50×70": 9500 } as const;
export type PrintSize = keyof typeof PRINT_PRICES;
export const PRINT_A3_PRICE = PRINT_PRICES.A3;

/** Print shipping. Relay and home are on the Cart ("from $4") and AdminOrderDetail boards; international is a mock value. */
export const SHIPPING = {
  mondial_relay: { label: "Mondial Relay", cents: 400 },
  colissimo: { label: "Colissimo — home", cents: 600 },
  international: { label: "Colissimo — international", cents: 1200 },
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

export function resolveLevel(c: GuideConfig): LevelKey {
  return c.level === "match" ? FORMATS[c.format].defaultLevel : c.level;
}

export function guidePriceCents(c: GuideConfig): number {
  return FORMATS[c.format].guideBase + LEVELS[resolveLevel(c)].surcharge;
}

export function totalCents(c: GuideConfig): number {
  return guidePriceCents(c) + (c.withPrint ? PRINT_A3_PRICE : 0);
}

/** "3h30" — rounded to 10 minutes. */
export function estimatedTime(c: GuideConfig): string {
  const mins = Math.round((FORMATS[c.format].baseMinutes * LEVELS[resolveLevel(c)].timeFactor) / 10) * 10;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m ? String(m).padStart(2, "0") : ""}`;
}

/** Materials estimate shown next to the shopping list ("~$41 at partner stores"). */
export function materialsEstimateUsd(c: GuideConfig): number {
  const f = FORMATS[c.format];
  const lvl = resolveLevel(c);
  const base = f.canvasUsd + f.tubeUsd * 5 + f.brushUsd + (lvl === "advanced" ? 8 : 0);
  return Math.round(base * 1.6);
}

/**
 * Price shown on work cards ("from $19"): the work's featured format at its default level
 * (works.default_format). "from" because other formats and levels change the price.
 * Validated on Home/Shop: N°03 (60×80, Intermediate) shows from $19, N°01 (40×50) from $13…
 */
export function cardPriceCents(defaultFormat: FormatKey): number {
  return guidePriceCents({ format: defaultFormat, level: "match", palette: "original" });
}
