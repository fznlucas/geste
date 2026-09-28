/** Guide queries (published versions only: what buyers read). */
import { asset } from "@/lib/asset";
import { FORMATS, LEVELS, type FormatKey, type LevelKey } from "@/lib/pricing";
import type { GuideStep } from "@/lib/types";
import { N03_GUIDE_ID, guideVersions, guides } from "@/data/guides";
import type { GuideRow, GuideVersionContent } from "@/data/types";
import { works } from "@/data/works";
import { clone } from "./clone";
import type { Guide } from "./types";

const STEP_LETTERS = "abcdefghij";

function publishedContent(row: GuideRow): { content: GuideVersionContent; isStandIn: boolean } {
  const own = guideVersions.find((v) => v.guideId === row.id && v.version === row.currentVersion);
  if (own) return { content: own.content, isStandIn: false };
  // Mock: N°03's layers, cut to the number of layers of the level.
  const n03 = guideVersions.find((v) => v.guideId === N03_GUIDE_ID)!.content;
  return { content: { layers: n03.layers.slice(0, LEVELS[row.level].layers) }, isStandIn: true };
}

export function mapGuide(row: GuideRow): Guide {
  const work = works.find((w) => w.id === row.workId)!;
  const { content, isStandIn } = publishedContent(row);
  const layers = content.layers.map((l) => ({
    ...l,
    steps: l.steps.map((s) => ({ id: `${l.position}${STEP_LETTERS[s.position - 1]}`, position: s.position, text: s.text })),
  }));
  return {
    id: row.id,
    workId: work.id,
    workNumber: work.number,
    workSlug: work.slug,
    imageUrl: asset(work.previewPath),
    format: row.format,
    formatLabel: FORMATS[row.format].label,
    level: row.level,
    levelLabel: LEVELS[row.level].label,
    version: row.currentVersion,
    isStandIn,
    layers,
    stepCount: layers.reduce((n, l) => n + l.steps.length, 0),
  };
}

export async function getGuide(id: string): Promise<Guide | null> {
  const row = guides.find((g) => g.id === id && g.currentVersion > 0);
  return row ? clone(mapGuide(row)) : null;
}

export async function findGuide(workId: string, format: FormatKey, level: LevelKey): Promise<Guide | null> {
  const row = guides.find((g) => g.workId === workId && g.format === format && g.level === level && g.currentVersion > 0);
  return row ? clone(mapGuide(row)) : null;
}

/** Flat list of steps for <StepCard> / <StepProgress>. The drying time sits on the last step of its layer. */
export function flattenSteps(guide: Guide): GuideStep[] {
  return guide.layers.flatMap((l) =>
    l.steps.map((s, i) => ({
      id: s.id,
      layer: l.position,
      layerName: l.name,
      text: s.text,
      brush: l.brush,
      plate: l.plate,
      tip: l.tip,
      drySeconds: i === l.steps.length - 1 && l.drySeconds > 0 ? l.drySeconds : undefined,
    })),
  );
}
