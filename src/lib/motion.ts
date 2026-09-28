/**
 * Motion tokens. Every animation in Geste reads from here.
 * Rules: nothing loops, nothing bounces, everything is off under prefers-reduced-motion.
 */
export const ease = {
  standard: "cubic-bezier(0.4, 0, 0.2, 1)",
  pen: "cubic-bezier(0.45, 0.05, 0.55, 0.95)",
} as const;

export const duration = {
  fast: 150, // hover colour, focus, cart count cross-fade
  base: 240, // accordion, tabs, modal in, toast in
  step: 320, // guide reader step change, segment fill
  morph: 380, // work card price morph (opacity, blur, translate)
  morphTracking: 440, // work card price morph (letter-spacing)
  panel: 420, // cart drawer, phone menu, sticky buy bar
  toastAdmin: 1600,
  toastStore: 4000,
  addedLabel: 1600, // "Added" on the add-to-cart button
} as const;

/** Logo pencil: 7 strokes, each starts 20 ms before the previous ends. Total 1480 ms. */
export const PEN_DURATIONS = [230, 190, 300, 300, 170, 110, 300] as const;
export const PEN_OVERLAP = 20;

export function penSchedule(durations: readonly number[] = PEN_DURATIONS, overlap = PEN_OVERLAP) {
  let t = 0;
  return durations.map((d) => {
    const item = { delay: t, duration: d };
    t += d - overlap;
    return item;
  });
}

/** Price morph states for WorkCard meta line. */
export const priceMorph = {
  hidden: { opacity: 0, blur: 4, letterSpacing: 0.25, y: 3 },
  shown: { opacity: 1, blur: 0, letterSpacing: 0, y: 0 },
  transition: `opacity ${duration.morph}ms ${ease.standard}, filter ${duration.morph}ms ${ease.standard}, letter-spacing ${duration.morphTracking}ms ${ease.standard}, transform ${duration.morph}ms ${ease.standard}`,
} as const;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
