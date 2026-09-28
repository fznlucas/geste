/**
 * The 15 works of the canvas. Default formats come from the Product01–15 boards; prices, levels
 * and times are never written here: they come from src/lib/pricing.ts.
 * N°03 is supabase/seed.sql (ids included).
 */
import { FORMATS, LEVELS, type FormatKey } from "@/lib/pricing";
import type { PaletteKey, PaletteRow, ShoppingItemRow, WorkFormatRow, WorkRow } from "./types";

const DEFAULT_FORMATS: FormatKey[] = [
  "40x50", "30x40", "60x80", "60x80", "40x50",
  "60x80", "30x40", "80x100", "30x40", "40x50",
  "60x80", "30x40", "80x100", "40x50", "30x40",
];

/** Palettes offered besides Original (drives the Shop "Palette" filter). N°03 offers all three, as in the seed. */
const EXTRA_PALETTES: PaletteKey[][] = [
  ["warm", "earth"], ["cool"], ["warm", "cool", "earth"], ["cool", "earth"], ["warm"],
  ["warm", "cool"], ["earth"], ["cool", "earth"], ["warm"], ["cool"],
  ["warm", "earth"], ["earth"], ["warm", "cool"], ["cool"], ["warm", "earth"],
];

/** Not painted in the studio yet (AdminCatalog: N°06 and N°09 "Not painted"). */
const NOT_TESTED = new Set([6, 9]);

/** Guides sold before the mock orders (AdminCatalog "48 sold"…; N°11–15 are not on the board). */
export const HISTORICAL_SALES: Record<string, number> = {
  n01: 48, n02: 22, n03: 62, n04: 11, n05: 14, n06: 8, n07: 31, n08: 9,
  n09: 0, n10: 0, n11: 6, n12: 17, n13: 3, n14: 12, n15: 5,
};

const pad = (n: number) => String(n).padStart(2, "0");
export const workId = (n: number) => `00000000-0000-0000-0000-0000000000${pad(n)}`;

export const works: WorkRow[] = DEFAULT_FORMATS.map((defaultFormat, i) => {
  const n = i + 1;
  const level = FORMATS[defaultFormat].defaultLevel;
  const article = level === "intermediate" || level === "advanced" ? "An" : "A";
  return {
    id: workId(n),
    number: `N°${pad(n)}`,
    slug: `n${pad(n)}`,
    status: "live",
    publishAt: null,
    defaultFormat,
    description: "Gestural abstraction. Wide strokes over a thin underlayer, dark marks on top.",
    previewPath: `mock/work-${pad(n)}.jpg`,
    // No real result photos yet: the work page shows the board's dashed placeholder.
    resultPhotoPath: null,
    studioTested: !NOT_TESTED.has(n),
    seoTitle: `N°${pad(n)} — paint it yourself · Geste`,
    seoDescription: `${article} ${level} abstract painting in ${LEVELS[level].layers} layers. Guide, shopping list, from $12.`,
    sortOrder: n,
  };
});

/** Every work sells the four formats at the pricing.ts defaults (seed: est_minutes at the default level). */
export const workFormats: WorkFormatRow[] = works.flatMap((w) =>
  (Object.keys(FORMATS) as FormatKey[]).map((format) => {
    const f = FORMATS[format];
    return {
      workId: w.id,
      format,
      defaultLevel: f.defaultLevel,
      guidePriceCents: f.guideBase,
      estMinutes: Math.round((f.baseMinutes * LEVELS[f.defaultLevel].timeFactor) / 10) * 10,
      active: true,
    };
  }),
);

/** The four palettes of the seed. Mock: every work reuses N°03's swatches until its own are entered in the admin. */
const PALETTE_TEMPLATES: Record<PaletteKey, Omit<PaletteRow, "workId" | "active">> = {
  original: {
    key: "original", name: "Original", previewFilter: null,
    swatches: [{ hex: "#22A6C9", name: "Turquoise" }, { hex: "#1F2433", name: "Payne’s grey" }, { hex: "#F2B632", name: "Cadmium yellow" }, { hex: "#E8862E", name: "Orange" }],
  },
  warm: {
    key: "warm", name: "Warm", previewFilter: "sepia(0.25) saturate(1.25) hue-rotate(-12deg)",
    swatches: [{ hex: "#E8735A", name: "Coral" }, { hex: "#E88A3A", name: "Orange" }, { hex: "#D9A441", name: "Yellow ochre" }, { hex: "#F0A596", name: "Rose" }],
  },
  cool: {
    key: "cool", name: "Cool", previewFilter: "hue-rotate(150deg) saturate(0.9)",
    swatches: [{ hex: "#2F5FB3", name: "Ultramarine" }, { hex: "#2E9C8F", name: "Teal" }, { hex: "#A9A3D9", name: "Lilac" }, { hex: "#F2DC5A", name: "Lemon" }],
  },
  earth: {
    key: "earth", name: "Earth", previewFilter: "sepia(0.6) saturate(0.8) hue-rotate(-8deg)",
    swatches: [{ hex: "#A0522D", name: "Burnt sienna" }, { hex: "#8A8F3C", name: "Olive" }, { hex: "#6F5A45", name: "Raw umber" }, { hex: "#C9A27E", name: "Sand" }],
  },
};

export const palettes: PaletteRow[] = works.flatMap((w, i) =>
  (["original", ...EXTRA_PALETTES[i]!] as PaletteKey[]).map((key) => ({ ...PALETTE_TEMPLATES[key], workId: w.id, active: true })),
);

const TUBE_RULE = { "30x40": "20 ml", "40x50": "40 ml", "60x80": "60 ml", "80x100": "120 ml" } as const;
const ONE = { "30x40": "1", "40x50": "1", "60x80": "1", "80x100": "1" } as const;
const CANVAS_RULE = { "30x40": "30×40 cm", "40x50": "40×50 cm", "60x80": "60×80 cm", "80x100": "80×100 cm" } as const;
const STD_URL = "https://partner.example/std?ref=geste";
const BUDGET_URL = "https://partner.example/budget?ref=geste";

/** Shopping list of the seed (canvas, two tubes, flat brush), used for every work in the mock. */
export const shoppingItems: ShoppingItemRow[] = works.flatMap((w) => [
  { workId: w.id, position: 0, name: "Canvas", standardLabel: "Primed cotton, stretched", budgetLabel: "Roll + stretcher bars", standardCents: 2400, budgetCents: 1400, standardUrl: STD_URL, budgetUrl: BUDGET_URL, quantityRule: CANVAS_RULE },
  { workId: w.id, position: 1, name: "Turquoise", standardLabel: "Artist range", budgetLabel: "Student range", standardCents: 700, budgetCents: 350, standardUrl: STD_URL, budgetUrl: BUDGET_URL, quantityRule: TUBE_RULE },
  { workId: w.id, position: 2, name: "Payne’s grey", standardLabel: "Artist range", budgetLabel: "Student range", standardCents: 700, budgetCents: 350, standardUrl: STD_URL, budgetUrl: BUDGET_URL, quantityRule: TUBE_RULE },
  { workId: w.id, position: 3, name: "Flat brush 50 mm", standardLabel: "Synthetic artist brush", budgetLabel: "Decorating brush", standardCents: 800, budgetCents: 300, standardUrl: STD_URL, budgetUrl: BUDGET_URL, quantityRule: ONE },
]);

/** site_settings.home.hero_work */
export const HOME_HERO_WORK = "n03";
