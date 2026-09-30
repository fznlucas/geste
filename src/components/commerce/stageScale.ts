import type { CSSProperties } from "react";

/**
 * The work and print pages draw the canvas (or the sheet) in real centimetres on a scale common to the
 * whole catalog, inside a ground of fixed size (`@container-[size]`): the largest size of the catalog
 * fills the inner zone (80 % of the ground), every other size is reduced in the same proportion, so two
 * works in the same size are exactly the same size on screen. Nothing is ever less than 35 % of the
 * ground's height: a smaller size is raised to it, keeping its own ratio (docs/decisions.md
 * "Product pictures to scale").
 */
export const STAGE = { inner: 80, minHeight: 35 } as const;

/**
 * Size of a thing `cm` = [width, height] on the stage, where `largestCm` is the longest side of the
 * largest size (either orientation fits the inner zone). Height from the scale, width from the ratio.
 */
export function stageStyle([w, h]: readonly [number, number], largestCm: number): CSSProperties {
  return {
    aspectRatio: `${w} / ${h}`,
    height: `max(${h} * min(${STAGE.inner}cqw, ${STAGE.inner}cqh) / ${largestCm}, ${STAGE.minHeight}cqh)`,
  };
}
