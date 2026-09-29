/** Reading order and wording shared by the reader views (GuideReader, AppStep, AppTimer). */
import type { Guide, GuideLayerData, GuideStepData } from "@/lib/api";

export interface FlatStep extends GuideStepData {
  layer: GuideLayerData;
  /** Last step of its layer (the drying timer starts after it). */
  endOfLayer: boolean;
}

export const flatSteps = (guide: Guide): FlatStep[] =>
  guide.layers.flatMap((layer) => layer.steps.map((s, k) => ({ ...s, layer, endOfLayer: k === layer.steps.length - 1 })));

export const pad = (n: number) => String(n).padStart(2, "0");

/** "45 min, then dry 45 min", "30 min, then stop" (GuideReader). */
export const layerTime = (l: GuideLayerData) => `${l.minutes} min, ${l.drySeconds > 0 ? `then dry ${Math.round(l.drySeconds / 60)} min` : "then stop"}`;

/** "Step 8 of 15 · 45 min, then dry 45 min" */
export const progressLine = (steps: FlatStep[], index: number) => `Step ${index + 1} of ${steps.length} · ${layerTime(steps[index]!.layer)}`;

export const lastLetter = (l: GuideLayerData) => l.steps.at(-1)!.id.slice(-1);

/** Strokes of every layer: CanvasDiagram draws up to a layer and fades the earlier ones. */
export const allStrokes = (guide: Guide) => guide.layers.flatMap((l) => l.diagram);

export const listHref = (item: { work: { slug: string }; format: string; level: string; paletteKey: string }) =>
  `/works/${item.work.slug}/list?format=${item.format}&level=${item.level}&palette=${item.paletteKey}`;
