import { APP_ICON_INK, APP_ICON_PAPER, appIconGeometry } from "./appIconSvg";
import { GESTE_GLYPHS, PEN_STROKES } from "./logoPaths";
import { FAVICON, PEN_OVERLAP, ease } from "@/lib/motion";

/**
 * The favicon loop as a list of images (docs/decisions.md "Animated favicon"). One image is the drawn
 * share of the "g"'s two pen strokes, [bowl, tail], 0 → 1. The "g" is drawn as the logo draws it on
 * hover (same strokes, same ease.pen, same 20 ms overlap, stretched to FAVICON.draw), held whole,
 * erased backwards (the tail from its end, then the bowl), then the empty Ink square rests.
 */
export type FaviconFrame = readonly [bowl: number, tail: number];

/** cubic-bezier(x1, y1, x2, y2) as a function of time 0 → 1 (bisection on x, exact to 1e-5). */
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const at = (a: number, b: number, t: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t ** 2 * (1 - t) + t ** 3;
  return (x: number) => {
    if (x <= 0 || x >= 1) return Math.min(1, Math.max(0, x));
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (at(x1, x2, mid) < x) lo = mid;
      else hi = mid;
    }
    return at(y1, y2, (lo + hi) / 2);
  };
}
const pen = cubicBezier(...(ease.pen.match(/[\d.]+/g)!.map(Number) as [number, number, number, number]));

/** The "g"'s strokes of the hover animation: bowl, then tail starting PEN_OVERLAP ms before the bowl ends. */
const [BOWL, TAIL] = [PEN_STROKES[0], PEN_STROKES[1]];
const HOVER_G = BOWL.duration + TAIL.duration - PEN_OVERLAP;

/** Drawn share of each stroke `t` ms into the drawing. */
function drawnAt(t: number): FaviconFrame {
  const k = FAVICON.draw / HOVER_G;
  const share = (start: number, duration: number) => pen(Math.min(1, Math.max(0, (t - start * k) / (duration * k))));
  return [share(0, BOWL.duration), share(BOWL.duration - PEN_OVERLAP, TAIL.duration)];
}

/** Every image of one loop, in order, at FAVICON.fps. Each image shows the state at its end. */
export function faviconLoop(): FaviconFrame[] {
  const ms = 1000 / FAVICON.fps;
  const count = (d: number) => Math.max(1, Math.round(d / ms));
  const [draw, hold, erase, pause] = [count(FAVICON.draw), count(FAVICON.hold), count(FAVICON.erase), count(FAVICON.pause)];
  return [
    ...Array.from({ length: draw }, (_, i) => drawnAt(((i + 1) / draw) * FAVICON.draw)),
    ...Array.from({ length: hold }, (): FaviconFrame => [1, 1]),
    // Backwards: the same drawing played in reverse, so the last stroke drawn is the first erased.
    ...Array.from({ length: erase }, (_, i) => drawnAt(FAVICON.draw - ((i + 1) / erase) * FAVICON.draw)),
    ...Array.from({ length: pause }, (): FaviconFrame => [0, 0]),
  ];
}

/** Same key → same image: the loop has far fewer distinct images than frames. */
export const frameKey = ([a, b]: FaviconFrame) => `${a.toFixed(4)}:${b.toFixed(4)}`;

/**
 * One image as an SVG document at `size` px (16 or 32), on the geometry of the static favicon
 * (appIconSvg): the "g" in Paper on Ink, seen through a mask of the drawn part of each stroke
 * (stroke 150 units, round caps, as the Logo's mask). Whole: exactly the static favicon.
 */
export function faviconFrameSvg(size: number, [bowl, tail]: FaviconFrame): string {
  const { font, x, baseline } = appIconGeometry(size);
  const r = (n: number) => Math.round(n * 1000) / 1000;
  const whole = bowl >= 1 && tail >= 1;
  const strokes = [
    [BOWL, bowl],
    [TAIL, tail],
  ] as const;
  const mask = strokes
    // Nothing drawn yet: no path at all (a round cap would leave a dot at the stroke's start).
    .filter(([, share]) => share > 0)
    .map(([s, share]) => `<path d="${s.d}" transform="translate(${s.x},0) scale(1,-1)" pathLength="1" fill="none" stroke="#fff" stroke-width="150" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1 2" stroke-dashoffset="${r(1 - share)}"/>`)
    .join("");
  const glyph = `<path fill="${APP_ICON_PAPER}" d="${GESTE_GLYPHS[0]}"/>`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
    whole ? "" : `<defs><mask id="p" maskUnits="userSpaceOnUse" x="-200" y="-1000" width="1400" height="1400"><rect x="-200" y="-1000" width="1400" height="1400" fill="#000"/>${mask}</mask></defs>`,
    `<rect width="${size}" height="${size}" fill="${APP_ICON_INK}"/>`,
    bowl > 0 || tail > 0 ? `<g transform="translate(${r(x)} ${r(baseline)}) scale(${r(font / 1000)})">${whole ? glyph : `<g mask="url(#p)">${glyph}</g>`}</g>` : "",
    `</svg>`,
  ].join("");
}

export const svgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
