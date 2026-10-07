"use client";

/**
 * Catalog actions of the admin (future `src/actions/admin/catalog.ts`: saveWork, saveFormats,
 * savePalettes, saveShoppingList, setWorkStatus). Mock: patches in the admin overlay + audit log.
 * The store pages are built at deploy time and do not show these edits (docs/mock-plan.md §6).
 */
import { formatRowId, getAdminWork, getAdminWorks, listRowId, paletteRowId, type AdminWorkDetail, type FormatKey, type LevelKey, type PaletteKey, type WorkStatus } from "@/lib/api";
import { formatsOf, mediumFormat, type Orientation, type Proportion } from "@/lib/pricing";
import { PALETTE_NAMES, PREVIEW_FILTERS } from "@/data/works";
import { adminNow, insertRow, patchRow, requireStaff } from "../admin";
import { readImage } from "./images";

export interface WorkDraft {
  description: string;
  /** Landscape: formats and prints sold turned, the work shown landscape (General). */
  orientation: Orientation;
  /** Signature work: SIGNATURE_CENTS more on every format (Formats & prices). */
  signature: boolean;
  seoTitle: string;
  seoDescription: string;
  /** Its three canvases (Formats & prices); the default level of each follows the base level. */
  proportion: Proportion;
  baseLevel: LevelKey;
  /** Reference canvas of the grids (General), one of the proportion's three. */
  originalSize: FormatKey;
  formats: Array<{ format: FormatKey; priceCents: number; active: boolean }>;
  allowCustom: boolean;
  palettes: Array<{ key: PaletteKey; active: boolean }>;
  shoppingList: Array<{ position: number; url: string }>;
}

export const STATUS_LABEL: Record<WorkStatus, string> = { live: "Live", draft: "Draft", scheduled: "Scheduled", archived: "Archived" };

/** Tabs whose fields differ from the saved work ("General", "Formats & prices"…), for the audit line. */
function changedTabs(before: AdminWorkDetail, d: WorkDraft): string[] {
  const tabs: string[] = [];
  if (d.description !== before.description || d.orientation !== before.orientation || d.originalSize !== before.originalSize) tabs.push("General");
  if (d.signature !== before.signature || d.proportion !== before.proportion || d.baseLevel !== before.baseLevel || d.allowCustom !== before.allowCustom || d.formats.some((f) => { const b = before.formats.find((x) => x.format === f.format); return !b || b.priceCents !== f.priceCents || b.active !== f.active; })) tabs.push("Formats & prices");
  if (d.palettes.some((p) => before.palettes.find((x) => x.key === p.key)?.active !== p.active)) tabs.push("Palettes");
  if (d.shoppingList.some((i) => before.shoppingList.find((x) => x.position === i.position)?.url !== i.url)) tabs.push("Shopping list");
  if (d.seoTitle !== before.seoTitle || d.seoDescription !== before.seoDescription) tabs.push("SEO");
  return tabs;
}

/** Save changes (every tab at once, as the board's single Publishing button). Returns the tabs saved. */
export async function saveWork(slug: string, draft: WorkDraft): Promise<string[]> {
  requireStaff("content");
  const before = await getAdminWork(slug);
  if (!before) throw new Error("This work no longer exists.");
  const errors: string[] = [];
  if (!draft.seoTitle.trim()) errors.push("Enter a page title.");
  for (const f of draft.formats) if (!Number.isFinite(f.priceCents) || f.priceCents <= 0) errors.push(`Enter a price for ${f.format.replace("x", "×")}.`);
  if (errors.length) throw new Error(errors[0]);

  const tabs = changedTabs(before, draft);
  if (!tabs.length) return [];
  const id = before.id;
  patchRow("works", id, { description: draft.description.trim(), orientation: draft.orientation, signature: draft.signature, allowCustom: draft.allowCustom, proportion: draft.proportion, baseLevel: draft.baseLevel, defaultFormat: mediumFormat(draft.proportion),
    // Another proportion: the reference canvas becomes its medium one unless one of the new three was chosen.
    originalSize: formatsOf(draft.proportion).includes(draft.originalSize) ? draft.originalSize : mediumFormat(draft.proportion), seoTitle: draft.seoTitle.trim(), seoDescription: draft.seoDescription.trim() });
  for (const f of draft.formats) {
    // Stored for any level; the Signature supplement is added by pricing.ts.
    patchRow("work_formats", formatRowId(id, f.format), { guidePriceCents: f.priceCents, active: f.active });
  }
  for (const p of draft.palettes) patchRow("palettes", paletteRowId(id, p.key), { active: p.active });
  for (const i of draft.shoppingList) patchRow("shopping_items", listRowId(id, i.position), { url: i.url.trim() });
  patchRow("works", id, {}, { action: "work.save", target: `work:${before.slug}`, summary: `Lucas edited ${before.number} · ${tabs.join(", ")}`.replace("Lucas", requireStaff().fullName) });
  return tabs;
}

/**
 * Publishing status. Going live, or being scheduled to, needs the checklist complete ("Before going
 * live", `workChecklist`); a work already live stays live when saved. Scheduled needs a date.
 */
export async function setWorkStatus(slug: string, status: WorkStatus, publishAt: string | null = null) {
  const staff = requireStaff("content");
  const work = await getAdminWork(slug);
  if (!work) throw new Error("This work no longer exists.");
  if (work.status === status && (status !== "scheduled" || work.publishAt === publishAt)) return;
  if (status === "scheduled" && !publishAt) throw new Error("Choose a publishing date.");
  // The same checklist guards Live and Scheduled (a scheduled work goes live by itself).
  if (((status === "live" && work.status !== "live") || status === "scheduled") && work.checklist.some((c) => !c.done)) throw new Error("Complete the checklist before going live.");
  patchRow("works", work.id, { status, publishAt: status === "scheduled" ? publishAt : null }, {
    action: "work.status",
    target: `work:${slug}`,
    summary: `${staff.fullName} set ${work.number} to ${STATUS_LABEL[status]}${status === "scheduled" && publishAt ? ` · ${publishAt.slice(0, 10)}` : ""}`,
  });
}

/** "Pick from submitted results": a published review photo becomes the work's real result. */
export async function setResultPhoto(slug: string, photoPath: string) {
  const staff = requireStaff("content");
  const work = await getAdminWork(slug);
  if (!work) return;
  patchRow("works", work.id, { resultPhotoPath: photoPath }, { action: "work.result_photo", target: `work:${slug}`, summary: `${staff.fullName} picked a real result photo for ${work.number}` });
}

/** Studio test "Upload": the photo of the studio's own painting; the work counts as painted by the studio. */
export async function markStudioTested(slug: string, file?: File) {
  const staff = requireStaff("content");
  const work = await getAdminWork(slug);
  if (!work) return;
  // A picture the browser cannot read still records the studio's painting (without the photo).
  const photo = file ? await readImage(file).catch(() => null) : null;
  patchRow("works", work.id, { studioTested: true, ...(photo ? { studioPhotoPath: photo.dataUrl } : {}) }, { action: "work.studio_test", target: `work:${slug}`, summary: `${staff.fullName} uploaded the studio test of ${work.number}` });
}

/** Digital preview "Replace": the new picture is the work's preview in the admin (the store after the next build). */
export async function replacePreview(slug: string, file: File) {
  const staff = requireStaff("content");
  const work = await getAdminWork(slug);
  if (!work) throw new Error("This work no longer exists.");
  const photo = await readImage(file, 1200);
  patchRow("works", work.id, { previewPath: photo.dataUrl, previewWidth: photo.width, previewHeight: photo.height }, { action: "work.preview", target: `work:${slug}`, summary: `${staff.fullName} replaced the digital preview of ${work.number}` });
}

/** Alternate palettes a work can add, with colours drawn from its original ones. */
const SHIFT: Record<Exclude<PaletteKey, "original">, [number, number, number]> = { warm: [40, 10, -30], cool: [-30, 5, 40], earth: [10, -10, -40] };

/** "+ Add a palette": a Warm, Cool or Earth version of the work's original colours, live at once. */
export async function addPalette(slug: string, key: Exclude<PaletteKey, "original">): Promise<void> {
  const staff = requireStaff("content");
  const work = await getAdminWork(slug);
  if (!work) throw new Error("This work no longer exists.");
  if (work.palettes.some((p) => p.key === key)) throw new Error(`${work.number} already has a ${PALETTE_NAMES[key]} palette.`);
  const original = work.palettes.find((p) => p.key === "original") ?? work.palettes[0]!;
  const [dr, dg, db] = SHIFT[key];
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const swatches = original.swatches.map((s) => {
    const n = Number.parseInt(s.hex.slice(1), 16);
    const hex = [((n >> 16) & 255) + dr, ((n >> 8) & 255) + dg, (n & 255) + db].map((v) => clamp(v).toString(16).padStart(2, "0")).join("");
    return { hex: `#${hex.toUpperCase()}`, name: `${s.name} (${PALETTE_NAMES[key].toLowerCase()})` };
  });
  insertRow("palettes", { id: paletteRowId(work.id, key), workId: work.id, key, name: PALETTE_NAMES[key], swatches, previewFilter: PREVIEW_FILTERS[key], active: true }, {
    action: "work.palette_add",
    target: `work:${slug}`,
    summary: `${staff.fullName} added the ${PALETTE_NAMES[key]} palette to ${work.number}`,
  });
}

/** "New work": a draft with the next number, the three 4:5 canvases and the Original palette. Returns its slug. */
export async function createWork(): Promise<string> {
  const staff = requireStaff("content");
  const all = await getAdminWorks();
  const n = Math.max(...all.map((w) => Number.parseInt(w.number.slice(2), 10) || 0)) + 1;
  const num = String(n).padStart(2, "0");
  const slug = `n${num}`;
  insertRow(
    "works",
    {
      id: `work-new-${slug}`,
      number: `N°${num}`,
      slug,
      status: "draft",
      publishAt: null,
      defaultFormat: "40x50",
      proportion: "4:5",
      baseLevel: "intermediate",
      originalSize: "40x50",
      orientation: "portrait",
      signature: false,
      previewWidth: 0,
      previewHeight: 0,
      description: "",
      previewPath: "",
      resultPhotoPath: null,
      studioTested: false,
      seoTitle: `N°${num} — paint it yourself · Geste`,
      seoDescription: "",
      sortOrder: 1000 + n,
      createdAt: adminNow(),
    },
    { action: "work.create", target: `work:${slug}`, summary: `${staff.fullName} created N°${num} (draft)` },
  );
  return slug;
}
