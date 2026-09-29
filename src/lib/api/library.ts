/** A customer's guides (Account › Library) and the entitlement the reader opens. */
import { asset } from "@/lib/asset";
import { LEVELS, formatLabel } from "@/lib/pricing";
import { guides } from "@/data/guides";
import type { EntitlementRow } from "@/data/types";
import { palettes, works } from "@/data/works";
import { clone } from "./clone";
import { customers } from "@/data/customers";
import { allEntitlements, allOrders } from "./local";
import { flattenSteps, mapGuide } from "./guides";
import type { Guide, GuideLicense, LibraryItem } from "./types";

export function mapLibraryItem(row: EntitlementRow): LibraryItem {
  const guideRow = guides.find((g) => g.id === row.guideId)!;
  const guide = mapGuide(guideRow);
  const work = works.find((w) => w.id === guideRow.workId)!;
  const paletteName = palettes.find((p) => p.workId === work.id && p.key === row.paletteKey)?.name ?? "Original";
  const completedAt = row.progress.completedAt ?? null;
  return {
    entitlementId: row.id,
    stepIds: flattenSteps(guide).map((s) => s.id),
    guideId: row.guideId,
    work: { id: work.id, number: work.number, slug: work.slug, imageUrl: asset(work.previewPath), orientation: work.orientation },
    format: guideRow.format,
    level: guideRow.level,
    paletteKey: row.paletteKey,
    paletteName,
    detail: `${formatLabel(guideRow.format, work.orientation)} · ${LEVELS[guideRow.level].label} · ${paletteName} palette`,
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

/** Share of the guide done, 0–1: the steps before the current one (1 once finished, 0 before the first open). */
export function libraryProgress(item: Pick<LibraryItem, "state" | "step" | "stepIds">): number {
  if (item.state === "finished") return 1;
  if (item.state === "not_started") return 0;
  return Math.max(0, item.stepIds.indexOf(item.step)) / Math.max(1, item.stepIds.length);
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
export async function getEntitlement(id: string, customerId: string): Promise<{ item: LibraryItem; guide: Guide; license: GuideLicense } | null> {
  const row = allEntitlements().find((e) => e.id === id && e.userId === customerId && e.revokedAt === null);
  if (!row) return null;
  const order = allOrders().find((o) => o.items.some((i) => i.id === row.orderItemId));
  const customer = customers.find((c) => c.id === row.userId);
  const [first = "", last = ""] = (customer?.fullName ?? "").split(" ");
  const license = { name: last ? `${first} ${last[0]}.` : first, email: order?.email ?? customer?.email ?? "", orderNumber: order?.number ?? "" };
  return clone({ item: mapLibraryItem(row), guide: mapGuide(guides.find((g) => g.id === row.guideId)!), license });
}

/** Every entitlement id the reader can open: the mock ones and `local-<guideId>` for each published guide (static export params). */
export async function getEntitlementIds(): Promise<string[]> {
  return [...allEntitlements().map((e) => e.id), ...guides.filter((g) => g.currentVersion > 0).map((g) => `local-${g.id}`)];
}
