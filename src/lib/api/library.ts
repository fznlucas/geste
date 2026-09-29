/** A customer's guides (Account › Library) and the entitlement the reader opens. */
import { asset } from "@/lib/asset";
import { FORMATS, LEVELS } from "@/lib/pricing";
import { guides } from "@/data/guides";
import type { EntitlementRow } from "@/data/types";
import { palettes, works } from "@/data/works";
import { clone } from "./clone";
import { allEntitlements } from "./local";
import { mapGuide } from "./guides";
import type { Guide, LibraryItem } from "./types";

export function mapLibraryItem(row: EntitlementRow): LibraryItem {
  const guideRow = guides.find((g) => g.id === row.guideId)!;
  const guide = mapGuide(guideRow);
  const work = works.find((w) => w.id === guideRow.workId)!;
  const paletteName = palettes.find((p) => p.workId === work.id && p.key === row.paletteKey)?.name ?? "Original";
  const completedAt = row.progress.completedAt ?? null;
  return {
    entitlementId: row.id,
    guideId: row.guideId,
    work: { id: work.id, number: work.number, slug: work.slug, imageUrl: asset(work.previewPath) },
    format: guideRow.format,
    level: guideRow.level,
    paletteKey: row.paletteKey,
    paletteName,
    detail: `${FORMATS[guideRow.format].label} · ${LEVELS[guideRow.level].label} · ${paletteName} palette`,
    printsLeft: row.printsLeft,
    step: row.progress.step,
    currentLayer: Number.parseInt(row.progress.step, 10) || 1,
    layerCount: guide.layers.length,
    state: completedAt ? "finished" : row.openedAt ? "in_progress" : "not_started",
    openedAt: row.openedAt,
    completedAt,
    revoked: row.revokedAt !== null,
    createdAt: row.createdAt,
  };
}

/** Guides the customer can open, newest first. Revoked ones (refunded) are left out. */
export async function getLibrary(customerId: string): Promise<LibraryItem[]> {
  return clone(
    allEntitlements()
      .filter((e) => e.userId === customerId && e.revokedAt === null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(mapLibraryItem),
  );
}

/**
 * What /learn/[entitlementId] needs. `customerId` is the signed-in customer: an entitlement of
 * someone else, or a revoked one, returns null (RLS does this on Supabase).
 */
export async function getEntitlement(id: string, customerId: string): Promise<{ item: LibraryItem; guide: Guide } | null> {
  const row = allEntitlements().find((e) => e.id === id && e.userId === customerId && e.revokedAt === null);
  if (!row) return null;
  return clone({ item: mapLibraryItem(row), guide: mapGuide(guides.find((g) => g.id === row.guideId)!) });
}
