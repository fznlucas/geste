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
import { useState } from "react";
import { AdminBox, AdminTitle, Button, CanvasDiagram, Field, Input, Modal, PillButton, Select, StepCard, Textarea, useToast } from "@/components";
import { getGuideEditor, type GuideContentLayer, type GuideEditorData } from "@/lib/api";
import { useAdminQuery } from "@/lib/client";
import { GuideInvalidError, MAX_STEPS, addLayer, addStep, publishGuide, saveLayer, saveStep } from "@/lib/client/admin/guides";
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
            <PillButton onClick={() => toast.show("Done · demo action")}>Edit strokes</PillButton>
            <PillButton onClick={() => toast.show("Done · demo action")}>Import from AI</PillButton>
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
          <StepForm key={`${layer.position}${letter}-${data.published.version}`} guideId={guideId} layer={layer} step={stepData.position} fail={fail} />
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
          Version {data.published.version} · autosaved · <History data={data} />
        </p>
      </AdminBox>

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

function StepForm({ guideId, layer, step, fail }: { guideId: string; layer: GuideContentLayer; step: number; fail: (e: unknown) => void }) {
  const s = layer.steps.find((x) => x.position === step)!;
  const letter = LETTERS[step - 1]!;
  const last = step === layer.steps.length;
  const [text, setText] = useState(s.text);
  const [brush, setBrush] = useState(s.brush ?? "");
  const [tip, setTip] = useState(layer.tip);
  const [dry, setDry] = useState(minutesLabel(layer.drySeconds));
  const [dryError, setDryError] = useState<string>();
  const brushes = BRUSHES.includes(brush) || !brush ? BRUSHES : [brush, ...BRUSHES];

  return (
    <>
      <AdminTitle>Step {letter} · layer {two(layer.position)}</AdminTitle>
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
      <Field label="Tip">
        <Input
          value={tip}
          onChange={(e) => {
            setTip(e.target.value);
            saveLayer(guideId, layer.position, { tip: e.target.value }).catch(fail);
          }}
        />
      </Field>
      <div className="grid grid-cols-2 gap-10">
        <Field label="Drying timer" error={dryError} hint={last ? undefined : undefined}>
          <Input
            value={last ? dry : "—"}
            readOnly={!last}
            title={last ? undefined : "The drying time is set on the layer’s last step"}
            onChange={(e) => {
              setDry(e.target.value);
              const seconds = parseMinutes(e.target.value);
              setDryError(seconds === null ? "Minutes, e.g. 45" : undefined);
              if (seconds !== null) saveLayer(guideId, layer.position, { drySeconds: seconds }).catch(fail);
            }}
          />
        </Field>
        <Field label="Gesture video">
          <Input value={`step-${letter}.mp4 · DRM`} readOnly title="Uploaded with the video host (signed playback)" />
        </Field>
      </div>
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

/** "history": the published versions, newest first. */
function History({ data }: { data: GuideEditorData }) {
  return (
    <P.Root>
      <P.Trigger className="cursor-pointer text-fg underline underline-offset-3 hover:text-fg-muted focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg">history</P.Trigger>
      <P.Portal>
        <P.Content align="start" sideOffset={8} className="z-popover flex w-280 flex-col bg-surface py-8 shadow-pop outline-none" aria-label="Versions">
          {data.hasChanges && <p className="flex min-h-36 items-center justify-between px-16"><span>Draft</span><span className="text-fg-muted">autosaved</span></p>}
          {data.versions.map((v) => (
            <p key={v.version} className="flex min-h-36 items-center justify-between gap-12 px-16">
              <span>Version {v.version}{v.version === data.published.version ? " · live" : ""}</span>
              <span className="text-fg-muted">{shortDate(v.publishedAt)}{v.publishedBy ? ` · ${v.publishedBy}` : ""}</span>
            </p>
          ))}
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}
