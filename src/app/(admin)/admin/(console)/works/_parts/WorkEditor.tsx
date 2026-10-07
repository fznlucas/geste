"use client";

/**
 * /admin/works/[slug] and /admin/works/draft?slug= (AdminWorkEditor): six tabs (General, Formats & prices,
 * Palettes, Shopping list, Prints, SEO), Publishing (status + Save changes + previews), the go-live
 * checklist, which blocks "Live" until complete, and the guide box.
 * One Save for every tab, as drawn. Mock: saves go to the admin overlay (`saveWork`, `setWorkStatus`);
 * the store is built at deploy time and does not show them.
 */
import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import {
  AdminBox, AdminHeadRow, AdminRow, AdminTabs, AdminTitle, Artwork, Button, ButtonLink, Checkbox, Field, Input, PillButton, Popover, Select,
  StatusChip, Textarea, UnderLink, fieldClass, useToast,
  canOpenAdmin,
} from "@/components";
import { getAdminWork, getGuideIndex, type AdminWorkDetail, type LevelKey, type WorkStatus } from "@/lib/api";
import { useAdminQuery } from "@/lib/client";
import { STATUS_LABEL, addPalette, markStudioTested, replacePreview, saveWork, setResultPhoto, setWorkStatus, type WorkDraft } from "@/lib/client/admin/catalog";
import { addDays, simToday } from "@/lib/clock";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/dates";
import { BUNDLE_DISCOUNT_PCT, CANVASES, LEVELS, SIZES, LEVEL_ORDER, PROPORTION_ORDER, SIGNATURE_CENTS, defaultLevel, estimatedTime, formatLabel, formatsOf, printCm, type FormatKey, type Orientation, type Proportion } from "@/lib/pricing";
import { AdminPage } from "../../../_admin/AdminPage";
import { useAdmin } from "../../../_admin/AdminFrame";

const TABS = ["General", "Formats & prices", "Palettes", "Shopping list", "Prints", "SEO"] as const;
type Tab = (typeof TABS)[number];
const STATUSES: WorkStatus[] = ["live", "draft", "scheduled", "archived"];

/** "$12", "$3.5" (the boards drop trailing zeros). */
const money = (cents: number) => `$${Number((cents / 100).toFixed(2))}`;
/** "$19" / "19" / "19.50" → cents, NaN when unreadable. */
const parseMoney = (s: string) => (/^\s*\$?\s*\d+(\.\d{1,2})?\s*$/.test(s) ? Math.round(Number(s.replace(/[$\s]/g, "")) * 100) : Number.NaN);
const smallField = fieldClass().replace("min-h-44", "min-h-32");

interface Form {
  description: string;
  orientation: Orientation;
  signature: boolean;
  seoTitle: string;
  seoDescription: string;
  proportion: Proportion;
  baseLevel: LevelKey;
  originalSize: FormatKey;
  formats: Array<{ format: WorkDraft["formats"][number]["format"]; price: string; active: boolean }>;
  allowCustom: boolean;
  palettes: WorkDraft["palettes"];
  shoppingList: WorkDraft["shoppingList"];
  editions: Array<{ size: WorkDraft["editions"][number]["size"]; editionId: string | null; editionSize: string; price: string }>;
  status: WorkStatus;
  publishAt: string;
}

const toForm = (w: AdminWorkDetail): Form => ({
  description: w.description,
  orientation: w.orientation,
  signature: w.signature,
  seoTitle: w.seoTitle,
  seoDescription: w.seoDescription,
  proportion: w.proportion,
  baseLevel: w.baseLevel,
  originalSize: w.originalSize,
  formats: w.formats.map((f) => ({ format: f.format, price: money(f.priceCents), active: f.active })),
  allowCustom: w.allowCustom,
  palettes: w.palettes.map((p) => ({ key: p.key, active: p.active })),
  shoppingList: w.shoppingList.map((i) => ({ position: i.position, url: i.url })),
  editions: w.editions.map((e) => ({ size: e.size, editionId: e.editionId, editionSize: String(e.editionSize), price: money(e.priceCents) })),
  status: w.status,
  // A new schedule defaults to four days after today (AdminCatalog "Scheduled · Oct 6" on Oct 2).
  publishAt: (w.publishAt ?? addDays(simToday(), 4)).slice(0, 10),
});

export function WorkEditorPage({ slug }: { slug: string }) {
  const q = useAdminQuery(() => getAdminWork(slug), [slug]);
  const title = q.data?.number ?? (q.status === "loading" ? "" : "Work not found");
  return (
    <AdminPage title={title} breadcrumbs={[{ label: "Works", href: "/admin/works" }]} roles={["content"]} desktopHref={q.data?.editorHref ?? "/admin/works"}>
      {q.status === "loading" ? (
        <div aria-busy="true" aria-label="Loading the work" className="h-480 bg-surface-muted" />
      ) : !q.data ? (
        <div className="flex max-w-480 flex-col gap-16 border border-border bg-surface p-20">
          <p>This work does not exist, or it was created in another browser.</p>
          <ButtonLink href="/admin/works" variant="ghost" className="self-start">Back to the works</ButtonLink>
        </div>
      ) : (
        // The form keeps its values while the stored work updates (checklist, guide box, statuses).
        <Editor key={q.data.slug} work={q.data} />
      )}
    </AdminPage>
  );
}

function Editor({ work }: { work: AdminWorkDetail }) {
  const { desktop } = useAdmin();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("General");
  /** The checklist item being fixed: its place in the form is marked. */
  const [fix, setFix] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(() => toForm(work));
  const [savedNow, setSavedNow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const edit = (patch: Partial<Form>) => {
    setForm((f) => ({ ...f, ...patch }));
    setSavedNow(false);
    setError(null);
  };

  const incomplete = work.checklist.filter((c) => !c.done);
  // Live and Scheduled need the whole checklist (`workChecklist`): a scheduled work goes live by itself.
  const blocked = ((form.status === "live" && work.status !== "live") || (form.status === "scheduled" && (work.status !== "scheduled" || form.publishAt !== work.publishAt?.slice(0, 10)))) && incomplete.length > 0;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const draft: WorkDraft = {
        description: form.description,
        orientation: form.orientation,
        signature: form.signature,
        seoTitle: form.seoTitle,
        seoDescription: form.seoDescription,
        proportion: form.proportion,
        baseLevel: form.baseLevel,
        originalSize: form.originalSize,
        formats: form.formats.map((f) => ({ format: f.format, priceCents: parseMoney(f.price), active: f.active })),
        allowCustom: form.allowCustom,
        palettes: form.palettes,
        shoppingList: form.shoppingList,
        editions: form.editions.map((e) => ({ size: e.size, editionId: e.editionId, editionSize: Number(e.editionSize), priceCents: parseMoney(e.price) })),
      };
      await saveWork(work.slug, draft);
      await setWorkStatus(work.slug, form.status, form.status === "scheduled" ? `${form.publishAt}T08:00:00Z` : null);
      setSavedNow(true);
      toast.show(`${work.number} saved`);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <div className={cn("grid items-start gap-16", desktop ? "grid-cols-12" : "grid-cols-1")}>
      <AdminBox className={desktop ? "col-span-9" : "min-w-0"}>
        <AdminTabs label="Work sections" tabs={TABS} value={tab} onChange={setTab} className={cn(!desktop && "overflow-x-auto [&>button]:shrink-0 [&>button]:whitespace-nowrap")} />
        {tab === "General" && <General work={work} form={form} edit={edit} fix={fix} />}
        {tab === "Formats & prices" && <Formats work={work} form={form} edit={edit} />}
        {tab === "Palettes" && <Palettes work={work} form={form} edit={edit} />}
        {tab === "Shopping list" && <ShoppingList work={work} form={form} edit={edit} />}
        {tab === "Prints" && <Prints work={work} form={form} edit={edit} />}
        {tab === "SEO" && <Seo form={form} edit={edit} />}
      </AdminBox>

      <div className={cn("flex flex-col gap-16", desktop && "col-span-3")}>
        <AdminBox>
          <AdminTitle>Publishing</AdminTitle>
          <Select aria-label="Status" value={form.status} onChange={(e) => edit({ status: e.target.value as WorkStatus })}>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </Select>
          {form.status === "scheduled" && (
            <Field label="Publish on">
              <Input type="date" value={form.publishAt} min={simToday()} onChange={(e) => edit({ publishAt: e.target.value })} />
            </Field>
          )}
          {blocked && <p className="text-danger">Complete the checklist before going live.</p>}
          {error && <p role="alert" className="text-danger">{error}</p>}
          <Button trailing="→" onClick={save} disabled={blocked} loading={busy} fullWidth>
            {savedNow ? `Saved · ${STATUS_LABEL[work.status].toLowerCase()}` : "Save changes"}
          </Button>
          <ButtonLink href={`/works/${work.slug}/`} variant="ghost" target="_blank" rel="noreferrer" fullWidth>Preview on the store ↗</ButtonLink>
          <Button
            variant="ghost"
            fullWidth
            onClick={() => window.open(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/works/${work.slug}/`, `phone-${work.slug}`, "width=390,height=844")}
          >
            Preview on phone ↗
          </Button>
          {savedNow && <p className="text-fg-muted">The store shows admin changes after the next deploy.</p>}
        </AdminBox>

        <AdminBox>
          <AdminTitle>Before going live</AdminTitle>
          <ul className="flex flex-col gap-14">
            {work.checklist.map((c) => (
              <li key={c.key} className="flex items-center justify-between gap-8">
                <StatusChip state={c.done ? "done" : "issue"} label={c.label} />
                {/* Where to fix it: the tab with the picture or the links, the work's guides. */}
                {!c.done &&
                  (c.key === "guide" ? (
                    <UnderLink href={`/admin/guides/?work=${work.slug}`}>Fix</UnderLink>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setTab(c.key === "list" ? "Shopping list" : "General");
                        setFix(c.key);
                        requestAnimationFrame(() => document.getElementById(`fix-${c.key}`)?.scrollIntoView({ block: "center" }));
                      }}
                      aria-label={`Fix: ${c.label}`}
                      className="cursor-pointer underline underline-offset-3 hover:text-fg-muted focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg"
                    >
                      Fix
                    </button>
                  ))}
              </li>
            ))}
          </ul>
        </AdminBox>

        <AdminBox>
          <AdminTitle>Guide</AdminTitle>
          {work.guide?.version === 0 ? (
            <p className="text-fg-muted">Drafted from the AI stroke plan: {work.guide.layers} layers · {work.guide.steps} steps, not published. Write the steps, then publish.</p>
          ) : work.guide ? (
            <>
              <p className="text-fg-muted">{work.guide.layers} layers · {work.guide.steps} steps · v{work.guide.version}, edited {shortDate(work.guide.editedAt)}</p>
              <GuideMatrix workId={work.id} />
              <ButtonLink href={`/admin/works/${work.slug}/guide/${work.guide.id}`} variant="ghost" fullWidth>Open guide editor</ButtonLink>
            </>
          ) : (
            <>
              <p className="text-fg-muted">No guide yet. Generate a stroke plan with AI, then edit it here.</p>
              <ButtonLink href="/admin/ai" variant="ghost" fullWidth>Open the AI pipeline</ButtonLink>
            </>
          )}
        </AdminBox>
      </div>
    </div>
  );
}

interface TabProps {
  work: AdminWorkDetail;
  form: Form;
  edit: (patch: Partial<Form>) => void;
}

function General({ work, form, edit, fix }: TabProps & { fix?: string | null }) {
  const { desktop } = useAdmin();
  const toast = useToast();
  const upload = useRef<HTMLInputElement>(null);
  const replace = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-14">
      <div className={cn("grid gap-14", desktop ? "grid-cols-3" : "grid-cols-1")}>
        <Field label="Number">
          <Input value={work.number} readOnly />
        </Field>
        <Field label="URL">
          <Input value={`geste.studio/works/${work.slug}`} readOnly />
        </Field>
        {/* Landscape: the formats and prints are sold turned (40×30 … 100×80) and the work is shown landscape. */}
        <Field label="Orientation">
          <Select value={form.orientation} onChange={(e) => edit({ orientation: e.target.value as Orientation })}>
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </Select>
        </Field>
        {/* The reference canvas among its three: sizes the work in the grids only (Shop, Home, /prints, this catalog). */}
        <Field label="Original size">
          <Select value={form.originalSize} onChange={(e) => edit({ originalSize: e.target.value as FormatKey })}>
            {formatsOf(form.proportion).map((f) => <option key={f} value={f}>{formatLabel(f, form.orientation)} · {SIZES[CANVASES[f].size].label}</option>)}
          </Select>
        </Field>
        {/* pb-6: the board's textarea sits on a text line, 6 px above the pictures' row. */}
        <Field label="Description" className={desktop ? "col-span-3 pb-6" : "pb-6"}>
          <Textarea rows={2} className="h-80 resize-y" value={form.description} onChange={(e) => edit({ description: e.target.value })} />
        </Field>
      </div>
      <div className={cn("grid gap-14", desktop ? "grid-cols-3" : "grid-cols-1")}>
        <Slot id="fix-preview" marked={fix === "preview"} label="Digital preview" picture={work.imageUrl ? <Artwork src={work.imageUrl} alt={`${work.number} · Digital preview`} orientation={form.orientation} className="w-200" sizes="200px" /> : <Missing>Missing</Missing>}>
          <PillButton onClick={() => replace.current?.click()}>Replace</PillButton>
          <input
            ref={replace}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                await replacePreview(work.slug, file);
                toast.show("Digital preview replaced");
              } catch (err) {
                toast.show(err instanceof Error ? err.message : "Could not read this image.", { tone: "danger" });
              }
            }}
          />
        </Slot>
        <Slot id="fix-result" marked={fix === "result"} label="Real result (beginner)" picture={work.resultPhotoUrl ? <Image src={work.resultPhotoUrl} alt={`${work.number} · Real result`} width={400} height={500} sizes="200px" className="block h-250 w-200 shrink-0 object-cover" /> : <Missing>Missing</Missing>}>
          <ResultPicker work={work} />
        </Slot>
        <Slot id="fix-studio" marked={fix === "studio"} label="Studio test" picture={work.studioPhotoUrl ? <Image src={work.studioPhotoUrl} alt={`${work.number} · Studio test`} width={400} height={500} sizes="200px" unoptimized className="block h-250 w-200 shrink-0 object-cover" /> : <Missing>[Your painted canvas]</Missing>}>
          <PillButton onClick={() => upload.current?.click()}>Upload</PillButton>
          <input
            ref={upload}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                await markStudioTested(work.slug, file);
                toast.show("Studio test received");
              } catch (err) {
                toast.show(err instanceof Error ? err.message : "Could not read this image.", { tone: "danger" });
              }
            }}
          />
        </Slot>
      </div>
    </div>
  );
}

/** A picture slot; `marked` when the checklist's "Fix" brought the user here. */
function Slot({ id, marked, label, picture, children }: { id?: string; marked?: boolean; label: string; picture: ReactNode; children: ReactNode }) {
  return (
    <div id={id} aria-current={marked || undefined} className={cn("flex scroll-mt-16 flex-col gap-6", marked && "outline outline-1 outline-offset-4 outline-fg")}>
      <span className="text-fg-muted">{label}</span>
      {picture}
      {children}
    </div>
  );
}

function Missing({ children }: { children: ReactNode }) {
  // 200 × 250 inside its dashed rule, as drawn (the board's box is content-box).
  return <div className="flex h-252 w-202 shrink-0 items-center justify-center border border-dashed border-border-dashed text-fg-muted">{children}</div>;
}

/** "Pick from submitted results": the published review photos of this work. */
function ResultPicker({ work }: { work: AdminWorkDetail }) {
  const toast = useToast();
  return (
    <Popover align="start" width={320} trigger={<PillButton>Pick from submitted results</PillButton>}>
      <div className="flex flex-col py-8">
        {work.resultCandidates.length === 0 ? (
          <p className="flex flex-col gap-6 px-16 py-8">
            <span>No published photo for {work.number} yet.</span>
            <UnderLink href="/admin/reviews" className="self-start">Reviews & results</UnderLink>
          </p>
        ) : (
          work.resultCandidates.map((c) => (
            <button
              key={c.reviewId}
              type="button"
              onClick={async () => {
                await setResultPhoto(work.slug, c.photoPath);
                toast.show("Real result photo set");
              }}
              className="flex min-h-56 cursor-pointer items-center gap-12 px-16 text-left hover:bg-surface-hover focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-2 focus-visible:outline-fg"
            >
              <Image src={c.photoUrl} alt="" width={64} height={80} sizes="32px" className="block h-40 w-32 object-cover" />
              <span>Photo by {c.customerName}</span>
            </button>
          ))
        )}
      </div>
    </Popover>
  );
}

const FORMAT_COLS = "90px 140px 110px 110px 90px 1fr";

function Formats({ work, form, edit }: TabProps) {
  const set = (i: number, patch: Partial<Form["formats"][number]>) => edit({ formats: form.formats.map((f, j) => (j === i ? { ...f, ...patch } : f)) });
  const { desktop } = useAdmin();
  // Another proportion sells its own three canvases: their stored price when the work had them, else the default.
  const setProportion = (proportion: Proportion) =>
    edit({
      proportion,
      originalSize: formatsOf(proportion).includes(form.originalSize) ? form.originalSize : formatsOf(proportion)[1]!,
      formats: formatsOf(proportion).map((format) => {
        const had = work.formats.find((f) => f.format === format);
        return { format, price: money(had?.priceCents ?? CANVASES[format].guideCents), active: had?.active ?? true };
      }),
    });
  return (
    <div className="flex flex-col gap-14 overflow-x-auto">
      <div className={cn("grid gap-14", desktop ? "grid-cols-3" : "grid-cols-1")}>
        {/* The work's own ratio: its three stock canvases (a nearly square image is cropped at the centre). */}
        <Field label="Proportion">
          <Select value={form.proportion} onChange={(e) => setProportion(e.target.value as Proportion)}>
            {PROPORTION_ORDER.map((p) => <option key={p} value={p}>{p} · {formatsOf(p).map((f) => formatLabel(f, form.orientation)).join(" · ")}</option>)}
          </Select>
        </Field>
        {/* By complexity. Small: one level below, large: one above. Below it a guide is a simplified version. */}
        <Field label="Base level (medium)">
          <Select value={form.baseLevel} onChange={(e) => edit({ baseLevel: e.target.value as LevelKey })}>
            {LEVEL_ORDER.map((l) => <option key={l} value={l}>{LEVELS[l].label}</option>)}
          </Select>
        </Field>
      </div>
      {form.proportion !== work.proportion && (
        <p role="status" className="text-danger">
          {work.proportion} → {form.proportion}: the guides were written for the {work.proportion} canvases. The checklist will ask for the {formatsOf(form.proportion).map((f) => formatLabel(f, form.orientation)).join(", ")} guides before the work can be live again.
        </p>
      )}
      <div role="table" aria-label="Formats and prices" className="min-w-640 flex flex-col gap-14">
        <AdminHeadRow cols={FORMAT_COLS}>
          <span role="columnheader">Format</span>
          <span role="columnheader">Default level</span>
          <span role="columnheader">Guide price</span>
          <span role="columnheader">Customer pays</span>
          <span role="columnheader">Est. time</span>
          <span role="columnheader">Available</span>
        </AdminHeadRow>
        {form.formats.map((f, i) => {
          const level = defaultLevel(f.format, form.baseLevel);
          // The form's orientation, so the labels turn before saving ("80×60" for a landscape work).
          const label = formatLabel(f.format, form.orientation);
          const cents = parseMoney(f.price);
          const invalid = Number.isNaN(cents);
          return (
            <AdminRow key={f.format} cols={FORMAT_COLS}>
              <span role="cell">{label}</span>
              <span role="cell">{LEVELS[level].label}</span>
              <span role="cell">
                <input aria-label={`Price ${label}`} aria-invalid={invalid || undefined} value={f.price} onChange={(e) => set(i, { price: e.target.value })} className={fieldClass(invalid).replace("min-h-44", "min-h-32")} />
              </span>
              <span role="cell" className="tabular-nums">{invalid ? "—" : money(cents + (form.signature ? SIGNATURE_CENTS : 0))}</span>
              <span role="cell">~{estimatedTime(f.format, level)}</span>
              <span role="cell">
                <Checkbox layout="setting" gap="gap-10" label="On sale" checked={f.active} onChange={(e) => set(i, { active: e.target.checked })} />
              </span>
            </AdminRow>
          );
        })}
      </div>
      <Checkbox layout="setting" gap="gap-10" className="-my-6" label={`Signature work · +${money(SIGNATURE_CENTS)} on every format`} checked={form.signature} onChange={(e) => edit({ signature: e.target.checked })} />
      <Checkbox layout="setting" gap="gap-10" className="-my-6" label="Allow “Custom” level (any level on any format, same price)" checked={form.allowCustom} onChange={(e) => edit({ allowCustom: e.target.checked })} />
      <AdminTitle>Prints</AdminTitle>
      <PrintRows work={work} form={form} edit={edit} />
      <p className="text-fg-muted">Guide + print of this work in one cart: −{BUNDLE_DISCOUNT_PCT}% on both lines.</p>
    </div>
  );
}

const PALETTE_COLS = "140px 1fr 200px 90px";

function Palettes({ work, form, edit }: TabProps) {
  return (
    <div className="flex flex-col gap-14 overflow-x-auto">
      <div role="table" aria-label="Palettes" className="min-w-560 flex flex-col gap-14">
        {work.palettes.map((p) => (
          <AdminRow key={p.key} cols={PALETTE_COLS}>
            <span role="cell">{p.name}</span>
            <span role="cell" className="flex gap-4">
              {p.swatches.map((s) => (
                // Paint colours are content, not UI tokens.
                <span key={s.hex} title={s.name} className="size-22" style={{ background: s.hex }} />
              ))}
              <span className="sr-only">{p.swatches.map((s) => s.name).join(", ")}</span>
            </span>
            <span role="cell" className="text-fg-muted">{p.note}</span>
            <span role="cell">
              {/* A palette added since the form opened is not in it yet: it starts from its stored state. */}
              <Checkbox
                layout="setting"
                gap="gap-8"
                label="Live"
                checked={form.palettes.find((x) => x.key === p.key)?.active ?? p.active}
                onChange={(e) => edit({ palettes: [...form.palettes.filter((x) => x.key !== p.key), { key: p.key, active: e.target.checked }] })}
              />
            </span>
          </AdminRow>
        ))}
      </div>
      <AddPalette work={work} />
    </div>
  );
}

const LIST_COLS = "1.2fr 1.4fr 70px 70px 1fr";

function ShoppingList({ work, form, edit }: TabProps) {
  return (
    <div className="flex flex-col gap-14 overflow-x-auto">
      <div role="table" aria-label="Shopping list" className="min-w-640 flex flex-col gap-14">
        <AdminHeadRow cols={LIST_COLS}>
          <span role="columnheader">Item</span>
          <span role="columnheader">Standard / budget</span>
          <span role="columnheader">Std</span>
          <span role="columnheader">Budget</span>
          <span role="columnheader">Affiliate link</span>
        </AdminHeadRow>
        {work.shoppingList.map((item, i) => (
          <AdminRow key={item.id} cols={LIST_COLS}>
            <span role="cell">{item.name}</span>
            <span role="cell" className="truncate text-fg-muted" title={item.choices}>{item.choices}</span>
            <span role="cell">{money(item.standardCents)}</span>
            <span role="cell">{money(item.budgetCents)}</span>
            <span role="cell">
              <input
                aria-label={`Link ${item.name}`}
                value={form.shoppingList[i]!.url.replace(/^https?:\/\//, "")}
                onChange={(e) => edit({ shoppingList: form.shoppingList.map((x, j) => (j === i ? { ...x, url: e.target.value ? `https://${e.target.value.replace(/^https?:\/\//, "")}` : "" } : x)) })}
                className={smallField}
              />
            </span>
          </AdminRow>
        ))}
      </div>
      <span className="text-fg-muted">Quantities scale automatically with the format (20 → 120 ml).</span>
    </div>
  );
}

const PRINT_COLS = "160px 120px 120px 1fr";

/** S, M, L of the work: edition size and price (Prints tab and Formats & prices, the same form fields). */
function PrintRows({ work, form, edit }: TabProps) {
  const set = (i: number, patch: Partial<Form["editions"][number]>) => edit({ editions: form.editions.map((e, j) => (j === i ? { ...e, ...patch } : e)) });
  return (
    <div role="table" aria-label="Print editions" className="min-w-520 flex flex-col gap-14">
      <AdminHeadRow cols={PRINT_COLS}>
        <span role="columnheader">Size</span>
        <span role="columnheader">Edition</span>
        <span role="columnheader">Price</span>
        <span role="columnheader">Status</span>
      </AdminHeadRow>
      {work.editions.map((e, i) => {
        const f = form.editions[i]!;
        const offered = !!e.editionId;
        // The form's orientation, so the sizes turn before saving.
        const dims = printCm(e.size, form.orientation);
        return (
          <AdminRow key={e.size} cols={PRINT_COLS}>
            <span role="cell">{e.size} · {dims}</span>
            <span role="cell">
              <input aria-label={`Edition ${e.size}`} inputMode="numeric" value={f.editionSize} disabled={!offered} onChange={(ev) => set(i, { editionSize: ev.target.value.replace(/\D/g, "") })} className={fieldClass(false, !offered).replace("min-h-44", "min-h-32")} />
            </span>
            <span role="cell">
              <input aria-label={`Price ${e.size}`} value={f.price} disabled={!offered} onChange={(ev) => set(i, { price: ev.target.value })} className={fieldClass(offered && Number.isNaN(parseMoney(f.price)), !offered).replace("min-h-44", "min-h-32")} />
            </span>
            <span role="cell">
              {!offered ? <StatusChip state="off" label="Not offered" /> : e.open ? <StatusChip state="done" label={`On sale · ${e.sold} sold`} /> : <StatusChip state="todo" label={`Closed · ${e.sold} sold`} />}
            </span>
          </AdminRow>
        );
      })}
    </div>
  );
}

function Prints(props: TabProps) {
  const { staff } = useAdmin();
  return (
    <div className="flex flex-col gap-14 overflow-x-auto">
      <PrintRows {...props} />
      {canOpenAdmin(staff.role, "/admin/editions") && <Link href="/admin/editions" className="self-start underline underline-offset-3 hover:text-fg-muted">Edition stock</Link>}
    </div>
  );
}

function Seo({ form, edit }: Pick<TabProps, "form" | "edit">) {
  return (
    <div className="flex flex-col gap-12">
      <Field label="Page title" error={form.seoTitle.trim() ? undefined : "Enter a page title"}>
        <Input value={form.seoTitle} onChange={(e) => edit({ seoTitle: e.target.value })} />
      </Field>
      <Field label="Meta description">
        <Input value={form.seoDescription} onChange={(e) => edit({ seoDescription: e.target.value })} />
      </Field>
      <span className="text-fg-muted">Link preview image is generated from the brand template.</span>
    </div>
  );
}

/** The work's guides, canvas by level (docs/admin-v2/04 "Guide box"): each opens its editor; "·" not written yet. */
function GuideMatrix({ workId }: { workId: string }) {
  const q = useAdminQuery(getGuideIndex, []);
  const own = (q.data ?? []).filter((g) => g.workId === workId);
  if (!own.length) return null;
  const formats = [...new Map(own.map((g) => [g.format, g.formatLabel])).entries()];
  const levels = [...new Map(own.map((g) => [g.level, g.levelLabel])).entries()];
  return (
    <table aria-label="Guides of this work" className="w-full border-collapse">
      <thead>
        <tr>
          <th scope="col" className="text-left font-normal text-fg-muted"><span className="sr-only">Canvas</span></th>
          {levels.map(([l, label]) => <th key={l} scope="col" className="text-left font-normal text-fg-muted">{label.slice(0, 5)}.</th>)}
        </tr>
      </thead>
      <tbody>
        {formats.map(([f, label]) => (
          <tr key={f}>
            <th scope="row" className="py-2 text-left font-normal">{label}</th>
            {levels.map(([l, levelLabel]) => {
              const g = own.find((x) => x.format === f && x.level === l)!;
              return (
                <td key={l} className="py-2">
                  <Link href={g.href} aria-label={`${label} · ${levelLabel} · v${g.version}${g.status === "stand_in" ? " · not written" : g.status === "draft" ? " · unpublished changes" : ""}`} className="underline underline-offset-3 hover:text-fg-muted">
                    v{g.version}{g.status === "stand_in" ? " ·" : g.status === "draft" ? "*" : ""}
                  </Link>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** "+ Add a palette": the alternates the work does not have yet (Warm, Cool, Earth). */
function AddPalette({ work }: { work: AdminWorkDetail }) {
  const toast = useToast();
  const missing = (["warm", "cool", "earth"] as const).filter((k) => !work.palettes.some((p) => p.key === k));
  if (!missing.length) return <p className="text-fg-muted">Every palette is there: Original, Warm, Cool, Earth.</p>;
  return (
    <Popover align="start" width={240} trigger={<PillButton className="self-start">+ Add a palette</PillButton>}>
      <div className="flex flex-col py-8">
        {missing.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => addPalette(work.slug, k).then(() => toast.show(`${k[0]!.toUpperCase()}${k.slice(1)} palette added`), (e) => toast.show(e instanceof Error ? e.message : "Could not add it.", { tone: "danger" }))}
            className="flex min-h-44 cursor-pointer items-center px-16 text-left hover:bg-surface-hover focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-2 focus-visible:outline-fg"
          >
            {k[0]!.toUpperCase()}{k.slice(1)} · from the original colours
          </button>
        ))}
      </div>
    </Popover>
  );
}
