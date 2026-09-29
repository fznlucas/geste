/**
 * The 15 works of the canvas, on the 15 images of public/mock. Default formats come from the
 * Product01–15 boards; prices, levels and times are never written here: they come from
 * src/lib/pricing.ts. N°03 is supabase/seed.sql (ids included).
 */
import { FORMATS, LEVELS, formatCm, guidePriceCents, type FormatKey, type Orientation } from "@/lib/pricing";
import type { PaletteKey, PaletteRow, ShoppingItemRow, Swatch, WorkFormatRow, WorkRow } from "./types";

const DEFAULT_FORMATS: FormatKey[] = [
  "40x50", "30x40", "60x80", "60x80", "40x50",
  "60x80", "30x40", "80x100", "30x40", "40x50",
  "60x80", "30x40", "80x100", "40x50", "30x40",
];

/** Pixel size of public/mock/work-01 … 15.jpg (works.preview_width / preview_height). */
const PREVIEW_SIZE: Array<[number, number]> = [
  [2360, 1760], [818, 720], [1064, 1200], [1001, 1200], [960, 1102],
  [1796, 2400], [2260, 1775], [2048, 2272], [960, 1200], [845, 1050],
  [900, 1204], [992, 1200], [938, 1128], [917, 1046], [960, 1200],
];

/** Wider than tall: sold in the turned formats (40×30 … 100×80) and shown landscape everywhere. */
const LANDSCAPE = new Set([1, 2, 7]);
/** "Signature" works: SIGNATURE_CENTS more on every format of the guide. */
const SIGNATURE = new Set([6, 1, 8]);

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

/** One line of each work, for the work page and the SEO description. */
const DESCRIPTIONS: string[] = [
  "A blue scaffold of wide strokes over a pale ground, dark weight at the bottom.",
  "Loose yellow loops and grey-blue lines over a sage and cream underlayer.",
  "Turquoise masses, a dark line and warm yellow over a peach ground.",
  "Olive and lemon strokes dragged down a warm ochre field.",
  "Pale veils of ochre and grey, with orange and green running down.",
  "A violet field under an orange sky, dotted with red.",
  "Dark green gestures and red marks over a buff ground, sky blue below.",
  "A pale cascade through ultramarine and deep blue, orange sparks.",
  "Thick patches of orange, green and pale pink against dark umber.",
  "An ultramarine knot, an orange cloud and yellow loops on cream.",
  "Red hatching in one diagonal field, a single dark vertical.",
  "Burnt umber crossings on sky blue, one pale curve.",
  "Blue on blue in curling strokes, threaded with olive yellow.",
  "Pink, lilac and orange columns, splashed with white.",
  "Orange flames over deep turquoise, rose in between.",
];

const pad = (n: number) => String(n).padStart(2, "0");
export const workId = (n: number) => `00000000-0000-0000-0000-0000000000${pad(n)}`;

export const works: WorkRow[] = DEFAULT_FORMATS.map((defaultFormat, i) => {
  const n = i + 1;
  const level = FORMATS[defaultFormat].defaultLevel;
  const article = level === "intermediate" || level === "advanced" ? "An" : "A";
  const signature = SIGNATURE.has(n);
  // Cheapest format of the work, as on the cards' "from" price.
  const from = guidePriceCents("30x40", { signature }) / 100;
  return {
    id: workId(n),
    number: `N°${pad(n)}`,
    slug: `n${pad(n)}`,
    status: "live",
    publishAt: null,
    defaultFormat,
    orientation: (LANDSCAPE.has(n) ? "landscape" : "portrait") as Orientation,
    signature,
    description: DESCRIPTIONS[i]!,
    previewPath: `mock/work-${pad(n)}.jpg`,
    previewWidth: PREVIEW_SIZE[i]![0],
    previewHeight: PREVIEW_SIZE[i]![1],
    // No real result photos yet: the work page shows the board's dashed placeholder.
    resultPhotoPath: null,
    studioTested: !NOT_TESTED.has(n),
    seoTitle: `N°${pad(n)} — paint it yourself · Geste`,
    seoDescription: `${article} ${level} abstract painting in ${LEVELS[level].layers} layers. Guide, shopping list, from $${from}.`,
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
      guidePriceCents: f.guideCents,
      estMinutes: Math.round((f.baseMinutes * LEVELS[f.defaultLevel].timeFactor) / 10) * 10,
      active: true,
    };
  }),
);

type Sw = [hex: string, name: string];
const sw = (list: Sw[]): Swatch[] => list.map(([hex, name]) => ({ hex, name }));

/**
 * Original palette of each work, read from its image: the first two colours are the gestures, the
 * last two the underlayer (the guide outline words them that way). N°03 is the seed's.
 */
const ORIGINAL: Record<number, Sw[]> = {
  1: [["#2A67A0", "Cobalt blue"], ["#13263A", "Prussian blue"], ["#8A9FA7", "Blue grey"], ["#E6D8BD", "Unbleached titanium"]],
  2: [["#F1C93F", "Cadmium yellow"], ["#618295", "Cerulean grey"], ["#A6B8AF", "Sage green"], ["#E8D39A", "Naples yellow"]],
  3: [["#22A6C9", "Turquoise"], ["#1F2433", "Payne’s grey"], ["#F2B632", "Cadmium yellow"], ["#E8862E", "Orange"]],
  4: [["#7D7A2A", "Olive green"], ["#D2C23E", "Lemon yellow"], ["#B08F2E", "Yellow ochre"], ["#5A5236", "Raw umber"]],
  5: [["#E4935A", "Orange"], ["#6F7F6A", "Green earth"], ["#C9A868", "Yellow ochre"], ["#C4C1AC", "Warm grey"]],
  6: [["#D84B1E", "Cadmium red"], ["#5E3F72", "Dioxazine violet"], ["#836EAB", "Lavender"], ["#EC6A24", "Cadmium orange"]],
  7: [["#2F5040", "Hooker’s green"], ["#C9503A", "Cadmium red"], ["#DEBE99", "Buff"], ["#6A99AE", "Sky blue"]],
  8: [["#2E4BD9", "Ultramarine"], ["#1C2A69", "Phthalo blue"], ["#746C9D", "Blue violet"], ["#E8DCC8", "Unbleached titanium"]],
  9: [["#E07A28", "Cadmium orange"], ["#6E7A2E", "Sap green"], ["#1E7FC0", "Cerulean blue"], ["#3A2A22", "Burnt umber"]],
  10: [["#F48A4E", "Cadmium orange"], ["#0D4688", "Ultramarine"], ["#E0A21A", "Cadmium yellow deep"], ["#EADCC8", "Unbleached titanium"]],
  11: [["#C93127", "Cadmium red"], ["#3E4A55", "Payne’s grey"], ["#D7796A", "Coral"], ["#E6DCC6", "Unbleached titanium"]],
  12: [["#5B382F", "Burnt umber"], ["#E4C3A3", "Flesh tint"], ["#85B7CD", "Sky blue"], ["#818688", "Neutral grey"]],
  13: [["#16439C", "Phthalo blue"], ["#9A9F4D", "Olive yellow"], ["#6F91DC", "Cornflower blue"], ["#A7BCEB", "Pale blue"]],
  14: [["#D86D2F", "Cadmium orange"], ["#D59289", "Salmon pink"], ["#9D9EBC", "Lilac"], ["#EDE6E4", "Warm white"]],
  15: [["#D7451D", "Vermilion"], ["#136578", "Phthalo turquoise"], ["#EE7A22", "Cadmium orange"], ["#D95870", "Rose"]],
};

/** The fifth tube of each work's list (N°03: ultramarine, in its guide). */
const EXTRA_TUBE: Record<number, Sw> = {
  1: ["#D9A441", "Yellow ochre"], 2: ["#E6A6A0", "Rose"], 3: ["#2B4DA8", "Ultramarine"], 4: ["#6E8B3D", "Sap green"],
  5: ["#3B4A52", "Payne’s grey"], 6: ["#3A2416", "Burnt umber"], 7: ["#969576", "Olive green"], 8: ["#E8672A", "Cadmium orange"],
  9: ["#E9C3B8", "Light portrait pink"], 10: ["#E35A2E", "Vermilion"], 11: ["#DB8C8B", "Rose madder"], 12: ["#3E2620", "Van Dyke brown"],
  13: ["#8C83C9", "Lavender"], 14: ["#9A8594", "Mauve"], 15: ["#2D3A48", "Payne’s grey"],
};

/** Works whose texture is scraped: the list adds a palette knife. */
const KNIFE = new Set([4, 5, 9, 14]);

/**
 * Warm, Cool and Earth of each work: its Original seen through the palette's preview filter (the
 * same CSS filter the work page applies to the image), each colour named after the nearest paint.
 * N°03 keeps the seed's palettes.
 */
const ALTERNATES: Record<number, Partial<Record<Exclude<PaletteKey, "original">, Sw[]>>> = {
  1: { warm: [["#2C6F8E", "Cobalt blue"], ["#142934", "Payne’s grey"], ["#9AA69F", "Blue grey"], ["#FFDFBD", "Cream"]], cool: [["#A44C42", "Burnt sienna"], ["#3A1E19", "Burnt umber"], ["#AE969A", "Mauve"], ["#C2DEE9", "Pale blue"]], earth: [["#5E6C71", "Blue grey"], ["#25292A", "Payne’s grey"], ["#B5AE9E", "Warm grey"], ["#FFF1D0", "Cream"]] },
  3: {
    warm: [["#E8735A", "Coral"], ["#E88A3A", "Orange"], ["#D9A441", "Yellow ochre"], ["#F0A596", "Rose"]],
    cool: [["#2F5FB3", "Ultramarine"], ["#2E9C8F", "Teal"], ["#A9A3D9", "Lilac"], ["#F2DC5A", "Lemon"]],
    earth: [["#A0522D", "Burnt sienna"], ["#8A8F3C", "Olive"], ["#6F5A45", "Raw umber"], ["#C9A27E", "Sand"]],
  },
  2: { warm: [["#FFC74C", "Cadmium yellow"], ["#6C898B", "Blue grey"], ["#BCBFA8", "Warm grey"], ["#FFD89E", "Naples yellow"]], cool: [["#6ADAF9", "Bright aqua"], ["#9D7375", "Mauve"], ["#BCB0BD", "Blue grey"], ["#A9DCF7", "Pale blue"]], earth: [["#FFD99C", "Naples yellow"], ["#8C8C83", "Blue grey"], ["#D4C8B1", "Warm grey"], ["#FFE9C1", "Cream"]] },
  4: { warm: [["#96792E", "Olive"], ["#FBC047", "Cadmium yellow"], ["#CF8E38", "Yellow ochre"], ["#685338", "Raw umber"]], cool: [["#4D7BAC", "Cobalt blue"], ["#72C9F8", "Bright aqua"], ["#4A9ECC", "Turquoise"], ["#3F5664", "Hooker’s green"]], earth: [["#8F7F5B", "Raw umber"], ["#EACD91", "Naples yellow"], ["#B99B70", "Sand"], ["#665A49", "Green earth"]] },
  5: { warm: [["#FF966A", "Coral"], ["#808266", "Raw umber"], ["#E6AB6F", "Sand"], ["#DDC8AA", "Buff"]], cool: [["#4CB7B8", "Teal"], ["#7B788C", "Mauve"], ["#75B7D0", "Sky blue"], ["#B4C2CE", "Pale blue"]], earth: [["#DDAF8F", "Sand"], ["#8F8874", "Raw umber"], ["#DABB97", "Buff"], ["#EAD6BA", "Unbleached titanium"]] },
  6: { warm: [["#EB4E3A", "Cadmium red"], ["#5F4772", "Violet"], ["#8778A8", "Purple"], ["#FF6C3F", "Coral"]], cool: [["#0B8A6B", "Teal"], ["#4B4D20", "Green earth"], ["#857749", "Raw umber"], ["#0DA499", "Turquoise"]], earth: [["#A96D59", "Raw sienna"], ["#62535B", "Raw umber"], ["#96878C", "Mauve"], ["#C68B6C", "Sand"]] },
  7: { warm: [["#395139", "Hooker’s green"], ["#D95450", "Coral"], ["#FAC49D", "Peach"], ["#77A0A0", "Blue grey"]], cool: [["#584159", "Violet"], ["#0A8661", "Teal"], ["#9ACCD6", "Pale blue"], ["#BC848B", "Mauve"]], earth: [["#4D5042", "Green earth"], ["#A57163", "Raw sienna"], ["#F6D7B7", "Buff"], ["#A0A398", "Blue grey"]] },
  8: { warm: [["#215AC7", "Ultramarine"], ["#173161", "Phthalo blue"], ["#7A7598", "Cobalt blue"], ["#FFE4C7", "Cream"]], cool: [["#A73E08", "Burnt sienna"], ["#532404", "Oxide red"], ["#83704E", "Raw umber"], ["#CBE1E9", "Pale blue"]], earth: [["#555E7E", "Cobalt blue"], ["#303341", "Payne’s grey"], ["#8B8082", "Mauve"], ["#FFF6D6", "Cream"]] },
  9: { warm: [["#FC7B3E", "Orange"], ["#86792F", "Olive"], ["#2088A6", "Turquoise"], ["#402C25", "Burnt umber"]], cool: [["#1BA7AF", "Teal"], ["#5675A9", "Cobalt blue"], ["#D35454", "Coral"], ["#1E312F", "Payne’s grey"]], earth: [["#C99571", "Sand"], ["#877D59", "Raw umber"], ["#678084", "Blue grey"], ["#3C312B", "Burnt umber"]] },
  10: { warm: [["#FF8D63", "Coral"], ["#0A4D77", "Cobalt blue"], ["#FF9F2C", "Orange"], ["#FFE4C7", "Cream"]], cool: [["#35B9B2", "Teal"], ["#862D1C", "Oxide red"], ["#39BDF6", "Turquoise"], ["#CAE2E9", "Pale blue"]], earth: [["#E0AA8B", "Sand"], ["#394A54", "Payne’s grey"], ["#DEB27A", "Naples yellow"], ["#FFF6D6", "Cream"]] },
  11: { warm: [["#D43643", "Cadmium red"], ["#444E50", "Hooker’s green"], ["#EA7F7A", "Coral"], ["#FFE4C5", "Cream"]], cool: [["#09753C", "Olive green"], ["#564543", "Burnt umber"], ["#42A385", "Teal"], ["#CBE0EA", "Pale blue"]], earth: [["#935750", "Oxide red"], ["#54514C", "Raw umber"], ["#C89A89", "Sand"], ["#FFF5D5", "Cream"]] },
  12: { warm: [["#643A35", "Oxide red"], ["#FFCAA7", "Peach"], ["#95C0BE", "Blue grey"], ["#908C84", "Mauve"]], cool: [["#22483E", "Hooker’s green"], ["#A1D2D8", "Pale blue"], ["#DCA1A8", "Rose"], ["#8A8485", "Mauve"]], earth: [["#57453D", "Raw umber"], ["#FDDDBF", "Cream"], ["#C3C4B6", "Warm grey"], ["#A09586", "Blue grey"]] },
  13: { warm: [["#104C8B", "Ultramarine"], ["#B89F4F", "Olive"], ["#749DCD", "Cobalt blue"], ["#B5C8DF", "Pale blue"]], cool: [["#8A2F0B", "Burnt sienna"], ["#759DD2", "Cobalt blue"], ["#CB8262", "Terracotta"], ["#E0B39E", "Peach"]], earth: [["#3E4C5D", "Payne’s grey"], ["#B7A77E", "Sand"], ["#A2A3A8", "Blue grey"], ["#DBD3CB", "Warm grey"]] },
  14: { warm: [["#F06F45", "Coral"], ["#E99993", "Rose"], ["#ABA7B6", "Blue grey"], ["#FFF0E0", "Cream"]], cool: [["#169C96", "Teal"], ["#6CB099", "Blue grey"], ["#AF9E8B", "Warm grey"], ["#E1E9E7", "Pale blue"]], earth: [["#BD8A6D", "Raw sienna"], ["#D7B19F", "Peach"], ["#C1B4AB", "Warm grey"], ["#FFFDE4", "Cream"]] },
  15: { warm: [["#E94839", "Cadmium red"], ["#196965", "Hooker’s green"], ["#FF7A3B", "Orange"], ["#E36184", "Coral"]], cool: [["#0B8762", "Teal"], ["#984157", "Oxide red"], ["#10ADB3", "Turquoise"], ["#25914C", "Olive green"]], earth: [["#A56857", "Raw sienna"], ["#4C615B", "Hooker’s green"], ["#D09772", "Sand"], ["#B78180", "Mauve"]] },
};

const PALETTE_NAMES: Record<PaletteKey, string> = { original: "Original", warm: "Warm", cool: "Cool", earth: "Earth" };
/** palettes.preview_filter: how the work page tints the image for a palette. */
export const PREVIEW_FILTERS: Record<PaletteKey, string | null> = {
  original: null,
  warm: "sepia(0.25) saturate(1.25) hue-rotate(-12deg)",
  cool: "hue-rotate(150deg) saturate(0.9)",
  earth: "sepia(0.6) saturate(0.8) hue-rotate(-8deg)",
};

export const palettes: PaletteRow[] = works.flatMap((w, i) => {
  const n = i + 1;
  return (["original", ...EXTRA_PALETTES[i]!] as PaletteKey[]).map((key) => ({
    workId: w.id,
    key,
    name: PALETTE_NAMES[key],
    swatches: sw(key === "original" ? ORIGINAL[n]! : ALTERNATES[n]![key]!),
    previewFilter: PREVIEW_FILTERS[key],
    active: true,
  }));
});

const TUBE_RULE = { "30x40": "20 ml", "40x50": "40 ml", "60x80": "60 ml", "80x100": "120 ml" } as const;
const WHITE_RULE = { "30x40": "40 ml", "40x50": "80 ml", "60x80": "120 ml", "80x100": "250 ml" } as const;
const canvasRule = (orientation: Orientation) =>
  Object.fromEntries((Object.keys(FORMATS) as FormatKey[]).map((f) => [f, formatCm(f, orientation)])) as Record<FormatKey, string>;
const STD_URL = "https://partner.example/std?ref=geste";
const BUDGET_URL = "https://partner.example/budget?ref=geste";

type ListRow = [name: string, standard: string, budget: string, stdCents: number, budgetCents: number, rule: Record<FormatKey, string> | null];

/**
 * Shopping list of a work (ShoppingList board, prices as drawn): the canvas in the work's
 * orientation, its five tubes (the Original palette and one more), white, the brushes.
 */
function listOf(n: number, orientation: Orientation): ListRow[] {
  const tubes: Sw[] = n === 3
    // N°03: the order of its guide's tubes (seed).
    ? [["#F2B632", "Cadmium yellow"], ["#E8862E", "Orange"], ["#22A6C9", "Turquoise"], EXTRA_TUBE[3]!, ["#1F2433", "Payne’s grey"]]
    : [...ORIGINAL[n]!, EXTRA_TUBE[n]!];
  return [
    ["Canvas", "Primed cotton canvas {q}, stretched", "Unprimed roll + 4 stretcher bars", 2400, 1400, canvasRule(orientation)],
    ...tubes.map(([, name]): ListRow => [name, "Acrylic, {q}", "Student range, 75 ml", 700, 350, TUBE_RULE]),
    ["Titanium white", "Acrylic, {q}", "Student range, 120 ml", 900, 450, WHITE_RULE],
    ["Flat brush 50 mm", "Synthetic, long handle", "Decorating brush 50 mm", 800, 300, null],
    ["Flat brush 25 mm", "Synthetic, long handle", "Decorating brush 25 mm", 600, 250, null],
    ["Round brush n°6", "Synthetic", "Round n°6, any range", 400, 200, null],
    ...(KNIFE.has(n) ? [["Palette knife", "Steel, 8 cm trowel blade", "Plastic knife set", 700, 300, null] as ListRow] : []),
  ];
}

export const shoppingItems: ShoppingItemRow[] = works.flatMap((w, i) =>
  listOf(i + 1, w.orientation).map(([name, standardLabel, budgetLabel, standardCents, budgetCents, quantityRule], position) => ({
    workId: w.id, position, name, standardLabel, budgetLabel, standardCents, budgetCents, standardUrl: STD_URL, budgetUrl: BUDGET_URL, quantityRule,
  })),
);

/** site_settings.home.hero_work */
export const HOME_HERO_WORK = "n06";
