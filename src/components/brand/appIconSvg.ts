import tokens from "../../../tokens/tokens.json" with { type: "json" };
import { GESTE_GLYPHS } from "./logoPaths.ts";

/**
 * The favicon and app icon (BrandFavicon): a lowercase "g" of JetBrains Mono 500 in Paper on Ink,
 * square (the home screen rounds it). The board sets the letter at 9 / 19 / 39 / 79 px in 16 / 32 /
 * 64 / 128 px boxes, i.e. size × 5/8 − 1, centred as a 1-line-high box: the baseline sits 0.86 em
 * below the box's top (JetBrains Mono ascent 1.02 em, descent 0.30 em) and the 0.56 em advance
 * (0.6 em − 0.04 em tracking) is centred. Generated into files by scripts/brand-icons.ts.
 */
export const APP_ICON_INK = tokens.brand.ink.$value;
export const APP_ICON_PAPER = tokens.brand.paper.$value;

const G = GESTE_GLYPHS[0]!;

export function appIconGeometry(size: number) {
  const font = Math.round((size * 5) / 8 - 1);
  return { font, x: (size - 0.56 * font) / 2, baseline: (size - font) / 2 + 0.86 * font };
}

/** A standalone SVG document of the icon at `size` px. */
export function appIconSvg(size: number): string {
  const { font, x, baseline } = appIconGeometry(size);
  const r = (n: number) => Math.round(n * 1000) / 1000;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
    `<rect width="${size}" height="${size}" fill="${APP_ICON_INK}"/>`,
    `<path transform="translate(${r(x)} ${r(baseline)}) scale(${r(font / 1000)})" fill="${APP_ICON_PAPER}" d="${G}"/>`,
    `</svg>`,
  ].join("");
}
