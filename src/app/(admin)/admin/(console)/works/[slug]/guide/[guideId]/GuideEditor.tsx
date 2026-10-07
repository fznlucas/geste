"use client";

/**
 * AdminGuideEditor: tree of layers and steps · "Canvas after this layer" · the selected step's form.
 * Every change autosaves the draft (saveStep / saveLayer / addStep / addLayer); buyers keep reading the
 * published version until "Publish changes" creates the next one (publishGuide). The selection lives in
 * the URL: `?step=2c` (default: the first step) or `?layer=2` (the layer's own fields: name, brush,
 * painting time, drying time, tip; opened from the layer title in the tree).
 */
import * as P from "@radix-ui/react-popover";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AdminBox, AdminTitle, Button, CanvasDiagram, Field, Input, Modal, PillButton, Select, StepCard, Textarea, useToast } from "@/components";
import { allAiCandidates, getGuideEditor, gestureVideo, type GuideContentLayer, type GuideEditorData } from "@/lib/api";
import { useAdminQuery } from "@/lib/client";
import { BRUSH_WIDTHS, GuideInvalidError, MAX_STEPS, addLayer, addStep, deleteStep, importStrokesFromAi, moveStep, publishGuide, restoreVersion, saveLayer, saveStep, saveStrokes, uploadGestureVideo } from "@/lib/client/admin/guides";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/dates";
import { AdminPage } from "@/app/(admin)/admin/_admin/AdminPage";

const LETTERS = "abcdefghij";
/** Brushes of the kit (Guide04 "Brushes") + the palette knife drawn on the board. "—": no brush (wash, dry). */
const BRUSHES = ["50 mm flat", "25 mm flat", "Round n°6", "Palette knife", "—"];

type Selection = { kind: "step"; layer: number; step: number } | { kind: "layer"; layer: number };

function parseSelection(params: URLSearchParams, layers: GuideContentLayer[]): Selection {
  const layerParam = Number(params.get("layer"));
  if (layerParam && layers.some((l) => l.position === layerParam)) return { kind: "layer", layer: layerParam };
  const m = /^(\d+)([a-j])$/.exec(params.get("step") ?? "");
  if (m) {
    const layer = layers.find((l) => l.position === Number(m[1]));
    const step = LETTERS.indexOf(m[2]!) + 1;
    if (layer?.steps.some((s) => s.position === step)) return { kind: "step", layer: layer.position, step };
  }
  return { kind: "step", layer: layers[0]?.position ?? 1, step: 1 };
}

const two = (n: number) => String(n).padStart(2, "0");
/** "30 min" / "—" (Drying timer field). */
const minutesLabel = (seconds: number) => (seconds > 0 ? `${Math.round(seconds / 60)} min` : "—");
/** "45", "45 min", "—" → seconds; null when it is not a number. */
function parseMinutes(v: string): number | null {
  const t = v.trim();
  if (t === "" || t === "—" || t === "-") return 0;
  const m = /^(\d+(?:[.,]\d+)?)\s*(min)?$/i.exec(t);
  return m ? Math.round(Number(m[1]!.replace(",", ".")) * 60) : null;
}

export interface GuideEditorProps {
  guideId: string;
  slug: string;
  workNumber: string;
  /** "N°03 · 60×80 · Intermediate" */
  heading: string;
}

export function GuideEditor({ guideId, slug, workNumber, heading }: GuideEditorProps) {
  const q = useAdminQuery(() => getGuideEditor(guideId), [guideId]);
  return (
    <AdminPage
      title="Guide editor"
      breadcrumbs={[{ label: "Works", href: "/admin/works" }, { label: workNumber, href: `/admin/works/${slug}` }]}
      roles={["content"]}
      desktopHref={`/admin/works/${slug}/guide/${guideId}`}
    >
      {q.status === "loading" || !q.data ? <div aria-busy="true" className="h-640 bg-surface-muted" /> : <Editor guideId={guideId} heading={heading} data={q.data} />}
    </AdminPage>
  );
}

function Editor({ guideId, heading, data }: { guideId: string; heading: string; data: GuideEditorData }) {
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const [preview, setPreview] = useState(false);
  const [strokesOpen, setStrokesOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const layers = data.draft.layers;
  const sel = parseSelection(new URLSearchParams(params.toString()), layers);
  const layer = layers.find((l) => l.position === sel.layer)!;
  const path = `/admin/works/${data.published.workSlug}/guide/${guideId}/`;
  const go = (query: string) => router.replace(`${path}?${query}`, { scroll: false });
  const fail = (e: unknown) => toast.show(e instanceof Error ? e.message : "Could not save", { tone: "danger" });

  const publish = async () => {
    if (!data.hasChanges) {
      toast.show(`Already published · version ${data.published.version}`);
      return;
    }
    setPublishing(true);
    try {
      const v = await publishGuide(guideId);
      toast.show(`Published · version ${v}`);
    } catch (e) {
      fail(e instanceof GuideInvalidError ? e : new Error("Could not publish"));
    } finally {
      setPublishing(false);
    }
  };

  const stepData = sel.kind === "step" ? layer.steps.find((s) => s.position === sel.step)! : layer.steps[0]!;
  const letter = LETTERS[stepData.position - 1]!;
  const lastLetter = LETTERS[layer.steps.length - 1]!;
  const strokes = layer.diagram.filter((s) => s.layer === layer.position).length;

  return (
    <div className="grid items-start gap-16 min-[1200px]:grid-cols-[240px_1fr_360px]">
      {/* Tree */}
      <nav aria-label="Layers and steps" className="flex flex-col gap-10 border border-border bg-surface p-14">
        <AdminTitle as="p">{heading}</AdminTitle>
        {data.published.isStandIn && <p className="text-fg-muted">Preview content: N°03’s steps until this guide is written.</p>}
        {layers.map((l) => (
          <div key={l.position} className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => go(`layer=${l.position}`)}
              aria-current={sel.kind === "layer" && sel.layer === l.position ? "true" : undefined}
              className={cn("-my-2 flex min-h-24 cursor-pointer items-center text-left font-medium hover:text-fg-muted focus-visible:outline focus-visible:outline-1 focus-visible:outline-fg", sel.kind === "layer" && sel.layer === l.position && "underline underline-offset-4")}
            >
              {two(l.position)} {l.name}
            </button>
            {l.steps.map((s) => {
              const on = sel.kind === "step" && sel.layer === l.position && sel.step === s.position;
              return (
                <button
                  key={s.position}
                  type="button"
                  onClick={() => go(`step=${l.position}${LETTERS[s.position - 1]}`)}
                  aria-current={on ? "step" : undefined}
                  aria-label={`Step ${l.position}${LETTERS[s.position - 1]}: ${s.text || "empty"}`}
                  className={cn(
                    "flex min-h-30 cursor-pointer items-center text-left focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg",
                    on ? "text-fg underline underline-offset-4" : "text-fg-muted hover:text-fg",
                  )}
                >
                  Step {LETTERS[s.position - 1]} · {s.text ? `${s.text.slice(0, 18)}…` : "empty"}
                </button>
              );
            })}
          </div>
        ))}
        <PillButton
          className="w-full"
          disabled={layer.steps.length >= MAX_STEPS}
          onClick={() => addStep(guideId, layer.position).then((id) => go(`step=${id}`), fail)}
        >
          + Add a step
        </PillButton>
        <PillButton className="w-full" onClick={() => addLayer(guideId).then((id) => go(`step=${id}`), fail)}>
          + Add a layer
        </PillButton>
      </nav>

      {/* Canvas */}
      <AdminBox className="items-center">
        <div className="flex w-full flex-wrap justify-between gap-y-8">
          <span className="text-fg-muted">Canvas after this layer</span>
          <div className="flex gap-6">
            <PillButton onClick={() => setStrokesOpen(true)}>Edit strokes</PillButton>
            <ImportFromAi guideId={guideId} fail={fail} />
          </div>
        </div>
        <div className="flex h-480 w-full items-center justify-center bg-surface-muted">
          <CanvasDiagram strokes={layers.flatMap((l) => l.diagram)} upTo={layer.position} current={layer.position} width={330} className="h-440 w-330" />
        </div>
        <span className="text-fg-muted">Strokes on this layer: {strokes} · brush widths match the kit</span>
      </AdminBox>

      {/* Form */}
      <AdminBox>
        {sel.kind === "step" ? (
          <StepForm key={`${layer.position}${letter}-${data.published.version}-${layer.steps.length}`} guideId={guideId} layer={layer} step={stepData.position} fail={fail} go={go} />
        ) : (
          <LayerForm key={`${layer.position}-${data.published.version}`} guideId={guideId} layer={layer} fail={fail} />
        )}
        <div className="flex gap-8">
          <Button className="grow" trailing="→" onClick={publish} loading={publishing} aria-describedby="ge-version">
            {data.hasChanges ? "Publish changes" : "Published"}
          </Button>
          <Button variant="ghost" onClick={() => setPreview(true)}>Preview</Button>
        </div>
        <p id="ge-version" className="text-fg-muted">
          Version {data.published.version} · autosaved · <History data={data} guideId={guideId} fail={fail} />
        </p>
      </AdminBox>

      {strokesOpen && <StrokesModal guideId={guideId} layer={layer} onClose={() => setStrokesOpen(false)} fail={fail} />}

      <Modal
        open={preview}
        onOpenChange={setPreview}
        title={`Preview · step ${layer.position}${letter}`}
        description={data.hasChanges ? "The draft, as buyers will read it after Publish." : "What buyers read now."}
        width={560}
        actions={<Button variant="ghost" onClick={() => setPreview(false)}>Close</Button>}
      >
        <StepCard
          id={`${layer.position}${letter}`}
          lastLetter={lastLetter}
          brush={layer.brush}
          text={stepData.text || "—"}
          plate={layer.plate}
          tip={layer.tip || undefined}
          className="border border-border bg-surface p-24"
        />
      </Modal>
    </div>
  );
}

function Plate({ layer }: { layer: GuideContentLayer }) {
  return (
    <div className="flex flex-col gap-6">
      <span className="text-fg-muted">On the plate</span>
      {layer.plate.length ? (
        <ul className="flex flex-wrap gap-x-12 gap-y-6">
          {layer.plate.map((c) => (
            <li key={c.hex + c.name} className="flex items-center gap-6">
              {/* Paint colour: content, not a UI token. */}
              <span aria-hidden="true" className="size-14 outline outline-1 -outline-offset-1 outline-border-field" style={{ background: c.hex }} />
              {c.name}
            </li>
          ))}
        </ul>
      ) : (
        <span className="text-fg-muted">No colours yet: they come with the strokes.</span>
      )}
    </div>
  );
}

function StepForm({ guideId, layer, step, fail, go }: { guideId: string; layer: GuideContentLayer; step: number; fail: (e: unknown) => void; go: (query: string) => void }) {
  const s = layer.steps.find((x) => x.position === step)!;
  const letter = LETTERS[step - 1]!;
  const last = step === layer.steps.length;
  const [text, setText] = useState(s.text);
  const [brush, setBrush] = useState(s.brush ?? "");
  const brushes = BRUSHES.includes(brush) || !brush ? BRUSHES : [brush, ...BRUSHES];
  const first = step === 1;

  return (
    <>
      <div className="flex items-center justify-between gap-8">
        <AdminTitle>Step {letter} · layer {two(layer.position)}</AdminTitle>
        {/* Reorder with buttons (keyboard) and delete; the ids follow the new order. */}
        <div className="flex gap-6">
          <PillButton disabled={first} aria-label={`Move step ${layer.position}${letter} up`} onClick={() => moveStep(guideId, layer.position, step, -1).then((id) => go(`step=${id}`), fail)}>↑</PillButton>
          <PillButton disabled={last} aria-label={`Move step ${layer.position}${letter} down`} onClick={() => moveStep(guideId, layer.position, step, 1).then((id) => go(`step=${id}`), fail)}>↓</PillButton>
          <PillButton disabled={layer.steps.length <= 1} aria-label={`Delete step ${layer.position}${letter}`} onClick={() => deleteStep(guideId, layer.position, step).then(() => go(`step=${layer.position}${LETTERS[Math.max(0, step - 2)]}`), fail)}>Delete</PillButton>
        </div>
      </div>
      {/* The board's textarea is inline: its line box leaves 6 px under it. */}
      <Field label="Instruction" className="mb-6">
        <Textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            saveStep(guideId, layer.position, step, { text: e.target.value }).catch(fail);
          }}
          className="min-h-120! resize-none"
        />
      </Field>
      {/* 7 px under the label: the board's native select sits 1 px lower than the text fields (as in Checkout). */}
      <Field label="Brush" className="[&>label]:mb-7">
        <Select
          value={brush}
          onChange={(e) => {
            setBrush(e.target.value);
            saveStep(guideId, layer.position, step, { brush: e.target.value || null }).catch(fail);
          }}
        >
          <option value="">Same as the layer · {layer.brush}</option>
          {brushes.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </Select>
      </Field>
      <Plate layer={layer} />
      {/* Tip and drying belong to the layer: shown here, edited once on the layer. */}
      <Field label="Tip">
        <Input value={layer.tip || "—"} readOnly />
      </Field>
      <div className="grid grid-cols-2 gap-10">
        <Field label="Drying timer">
          <Input value={last ? minutesLabel(layer.drySeconds) : "—"} readOnly />
        </Field>
        <GestureVideo guideId={guideId} stepId={`${layer.position}${letter}`} fail={fail} />
      </div>
      <button type="button" onClick={() => go(`layer=${layer.position}`)} className="-mt-4 self-start text-fg-muted underline underline-offset-3 hover:text-fg focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg">
        Edit the tip and the drying time on layer {two(layer.position)}
      </button>
    </>
  );
}

function LayerForm({ guideId, layer, fail }: { guideId: string; layer: GuideContentLayer; fail: (e: unknown) => void }) {
  const [name, setName] = useState(layer.name);
  const [brush, setBrush] = useState(layer.brush);
  const [minutes, setMinutes] = useState(String(layer.minutes));
  const [dry, setDry] = useState(minutesLabel(layer.drySeconds));
  const [tip, setTip] = useState(layer.tip);
  const [errors, setErrors] = useState<{ minutes?: string; dry?: string }>({});
  return (
    <>
      <AdminTitle>Layer {two(layer.position)}</AdminTitle>
      <Field label="Name">
        <Input value={name} onChange={(e) => { setName(e.target.value); saveLayer(guideId, layer.position, { name: e.target.value }).catch(fail); }} />
      </Field>
      <Field label="Brushes" hint="Shown above every step on a computer.">
        <Input value={brush} onChange={(e) => { setBrush(e.target.value); saveLayer(guideId, layer.position, { brush: e.target.value }).catch(fail); }} />
      </Field>
      <Plate layer={layer} />
      <div className="grid grid-cols-2 gap-10">
        <Field label="Painting time" error={errors.minutes}>
          <Input
            value={minutes}
            inputMode="numeric"
            onChange={(e) => {
              setMinutes(e.target.value);
              const s = parseMinutes(e.target.value);
              setErrors((x) => ({ ...x, minutes: s === null ? "Minutes, e.g. 45" : undefined }));
              if (s !== null) saveLayer(guideId, layer.position, { minutes: Math.round(s / 60) }).catch(fail);
            }}
          />
        </Field>
        <Field label="Drying timer" error={errors.dry}>
          <Input
            value={dry}
            onChange={(e) => {
              setDry(e.target.value);
              const s = parseMinutes(e.target.value);
              setErrors((x) => ({ ...x, dry: s === null ? "Minutes, e.g. 45" : undefined }));
              if (s !== null) saveLayer(guideId, layer.position, { drySeconds: s }).catch(fail);
            }}
          />
        </Field>
      </div>
      <Field label="Tip">
        <Input value={tip} onChange={(e) => { setTip(e.target.value); saveLayer(guideId, layer.position, { tip: e.target.value }).catch(fail); }} />
      </Field>
    </>
  );
}

/** "history": the published versions, newest first; "Restore" makes one the draft. */
function History({ data, guideId, fail }: { data: GuideEditorData; guideId: string; fail: (e: unknown) => void }) {
  const toast = useToast();
  return (
    <P.Root>
      <P.Trigger className="cursor-pointer text-fg underline underline-offset-3 hover:text-fg-muted focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg">history</P.Trigger>
      <P.Portal>
        <P.Content align="start" sideOffset={8} className="z-popover flex w-320 flex-col bg-surface py-8 shadow-pop outline-none" aria-label="Versions">
          {data.hasChanges && <p className="flex min-h-36 items-center justify-between px-16"><span>Draft</span><span className="text-fg-muted">autosaved</span></p>}
          {data.versions.map((v) => (
            <div key={v.version} className="flex min-h-44 items-center justify-between gap-12 px-16">
              <span>
                Version {v.version}{v.version === data.published.version ? " · live" : ""}
                <br />
                <span className="text-fg-muted">{shortDate(v.publishedAt)}{v.publishedBy ? ` · ${v.publishedBy}` : ""}</span>
              </span>
              <PillButton
                aria-label={`Restore version ${v.version} as the draft`}
                onClick={() => restoreVersion(guideId, v.version, v.content).then(() => toast.show(`Version ${v.version} restored as the draft · publish to make it live`), fail)}
              >
                Restore
              </PillButton>
            </div>
          ))}
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}

/** "Edit strokes": the layer's strokes in painting order; add, remove, reorder, width from the brush kit. */
function StrokesModal({ guideId, layer, onClose, fail }: { guideId: string; layer: GuideContentLayer; onClose: () => void; fail: (e: unknown) => void }) {
  const toast = useToast();
  const [list, setList] = useState(() => layer.diagram.filter((s) => s.layer === layer.position));
  const colours = layer.plate.length ? layer.plate : [{ hex: "#1F2433", name: "Payne's grey" }];
  const move = (i: number, by: -1 | 1) => setList((l) => {
    const n = [...l];
    const j = i + by;
    if (j < 0 || j >= n.length) return l;
    [n[i], n[j]] = [n[j]!, n[i]!];
    return n;
  });
  const save = () =>
    saveStrokes(guideId, layer.position, list).then(() => {
      toast.show(`Layer ${two(layer.position)}: ${list.length} strokes saved`);
      onClose();
    }, fail);
  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Strokes · layer ${two(layer.position)}`}
      description="In painting order. The diagram follows."
      width={560}
      actions={
        <>
          <Button variant="ghost" className="grow" onClick={onClose}>Cancel</Button>
          <Button className="grow-2" trailing="→" onClick={save}>Save strokes</Button>
        </>
      }
    >
      <CanvasDiagram strokes={[...layer.diagram.filter((s) => s.layer < layer.position), ...list]} upTo={layer.position} current={layer.position} width={160} className="h-213 w-160 self-center" />
      <ol aria-label="Strokes" className="flex max-h-280 flex-col gap-6 overflow-y-auto">
        {list.map((s, i) => (
          <li key={i} className="flex items-center gap-8">
            <span className="w-24 text-fg-muted">{i + 1}</span>
            {/* Paint colour: content, not a UI token. */}
            <span aria-hidden="true" className="size-14 outline outline-1 -outline-offset-1 outline-border-field" style={{ background: s.color }} />
            <span className="grow">{s.kind === "rect" ? "Ground" : "Stroke"}</span>
            <label className="sr-only" htmlFor={`st-w-${i}`}>Width of stroke {i + 1}</label>
            <Select id={`st-w-${i}`} value={String(s.width ?? 0)} onChange={(e) => setList((l) => l.map((x, k) => (k === i ? { ...x, width: Number(e.target.value) } : x)))} className="w-150">
              {s.kind === "rect" && <option value="0">Whole canvas</option>}
              {BRUSH_WIDTHS.map(([b, w]) => <option key={b} value={w}>{b}</option>)}
            </Select>
            <PillButton aria-label={`Move stroke ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}>↑</PillButton>
            <PillButton aria-label={`Move stroke ${i + 1} down`} disabled={i === list.length - 1} onClick={() => move(i, 1)}>↓</PillButton>
            <PillButton aria-label={`Remove stroke ${i + 1}`} onClick={() => setList((l) => l.filter((_, k) => k !== i))}>✕</PillButton>
          </li>
        ))}
      </ol>
      <PillButton
        className="self-start"
        onClick={() => setList((l) => [...l, { layer: layer.position, kind: "path", d: `M${120 + l.length * 20} ${300 + l.length * 30} Q300 ${260 + l.length * 30} ${480 - l.length * 10} ${320 + l.length * 30}`, color: colours[l.length % colours.length]!.hex, width: (BRUSH_WIDTHS.find(([b]) => b === layer.brush) ?? BRUSH_WIDTHS[1]!)[1], opacity: 0.9 }])}
      >
        + Add a stroke
      </PillButton>
    </Modal>
  );
}

/** "Import from AI": an approved candidate's stroke plan for this guide. */
function ImportFromAi({ guideId, fail }: { guideId: string; fail: (e: unknown) => void }) {
  const toast = useToast();
  const approved = allAiCandidates().filter((c) => c.status === "approved");
  return (
    <P.Root>
      <P.Trigger asChild>
        <PillButton>Import from AI</PillButton>
      </P.Trigger>
      <P.Portal>
        <P.Content align="end" sideOffset={8} className="z-popover flex w-300 flex-col bg-surface py-8 shadow-pop outline-none" aria-label="Approved candidates">
          {approved.length === 0 ? (
            <p className="px-16 py-8 text-fg-muted">No approved candidate yet: approve one in the AI pipeline.</p>
          ) : (
            approved.slice(0, 8).map((c) => (
              <P.Close asChild key={c.id}>
                <button
                  type="button"
                  onClick={() => importStrokesFromAi(guideId, c).then((n) => toast.show(`${n} strokes imported from ${c.id}`), fail)}
                  className="flex min-h-44 cursor-pointer items-center justify-between px-16 text-left hover:bg-surface-hover focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-2 focus-visible:outline-fg"
                >
                  <span>{c.id}</span>
                  <span className="text-fg-muted">{c.strokes} strokes · {c.layers} layers</span>
                </button>
              </P.Close>
            ))
          )}
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}

/** "Gesture video": upload to the video host (mock: processing for a few seconds, then ready). */
function GestureVideo({ guideId, stepId, fail }: { guideId: string; stepId: string; fail: (e: unknown) => void }) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [, tick] = useState(0);
  const video = gestureVideo(guideId, stepId);
  useEffect(() => {
    if (video?.status !== "processing") return;
    const t = setTimeout(() => tick((n) => n + 1), 1000);
    return () => clearTimeout(t);
  });
  return (
    <Field label="Gesture video">
      <div className="flex items-center gap-8">
        <span className="grow text-fg-muted">{video ? `${video.name} · ${video.status === "ready" ? "ready" : "processing…"}` : "No video yet"}</span>
        <PillButton onClick={() => input.current?.click()}>{video ? "Replace" : "Upload"}</PillButton>
        <input
          ref={input}
          type="file"
          accept="video/*"
          hidden
          aria-label={`Gesture video of step ${stepId}`}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) uploadGestureVideo(guideId, stepId, file.name).then(() => toast.show(`${file.name} uploaded · processing`), fail);
          }}
        />
      </div>
    </Field>
  );
}
