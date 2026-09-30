import Image from "next/image";
import type { ReactNode } from "react";
import type { Guide, GuideLicense, Swatch } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { tubeMl as tubeFor } from "@/lib/pricing";
import { CanvasDiagram } from "./CanvasDiagram";

/** Cover, before you start, palette & mixes, the plan, one page per layer, avoid mud & finish. */
export const guidePageCount = (guide: Pick<Guide, "layers">) => 5 + guide.layers.length;
/** Page number of a layer's page (layer 1 → page 5). */
export const layerPage = (layer: number) => 4 + layer;

const LETTERS = "abcdefghij";
const COUNT = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const count = (n: number) => COUNT[n] ?? String(n);
const pad = (n: number) => String(n).padStart(2, "0");

/** Pale paint (white, off-white) gets a 1 px outline so it shows on Paper. */
function pale(hex: string): boolean {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 225;
}

function Paint({ hex, className }: { hex: string; className: string }) {
  return <span aria-hidden="true" className={cn("block shrink-0", pale(hex) && "outline outline-1 -outline-offset-1 outline-border-field", className)} style={{ background: hex }} />;
}

function SwatchLine({ s }: { s: Swatch }) {
  return (
    <span className="flex items-center gap-6">
      <Paint hex={s.hex} className="size-16" />
      <span>{s.name}</span>
    </span>
  );
}

function Tick({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-baseline gap-12">
      <span aria-hidden="true" className="box-content inline-block size-10 shrink-0 border border-fg" />
      <span>{children}</span>
    </li>
  );
}

const muted = "text-fg-muted-print";
const h1 = "m-0 text-lg font-medium tracking-heading";

export interface GuideSheetProps {
  /** "N°03" */
  workNumber: string;
  page: number;
  pages: number;
  license: GuideLicense;
  children: ReactNode;
}

/**
 * One A4 page of the printed guide (Guide01–08): 794 × 1123 px (210 × 297 mm when printed),
 * 48 / 56 px margins, running head "geste — N°03 · Guide" and "01 / 08". The watermark sits in the
 * bottom margin of every page: "Licensed to {name} · {email}" and "order #GS-2041".
 */
export function GuideSheet({ workNumber, page, pages, license, children }: GuideSheetProps) {
  return (
    <section
      aria-label={`Page ${page} of ${pages}`}
      className="relative box-border flex h-1123 w-794 shrink-0 flex-col overflow-hidden bg-bg px-56 py-48 text-print text-fg print:h-[297mm] print:w-[210mm] print:break-after-page"
    >
      <div className={cn("flex justify-between text-print-sm", muted)}>
        <span>geste — {workNumber} · Guide</span>
        <span>
          {pad(page)} / {pad(pages)}
        </span>
      </div>
      {children}
      <div className={cn("absolute inset-x-56 bottom-20 flex justify-between gap-16 text-print-sm", muted)}>
        <span>
          Licensed to {license.name} · {license.email}
        </span>
        <span>order #{license.orderNumber}</span>
      </div>
    </section>
  );
}

export interface GuideBookletProps {
  guide: Guide;
  license: GuideLicense;
  /** "Original" */
  paletteName: string;
  /** Page numbers to render (1-based); every page by default. */
  only?: number[];
}

/** The printed guide, page by page, from the guide's content and its printed copy (`guide.print`). */
export function GuideBooklet({ guide, license, paletteName, only }: GuideBookletProps) {
  const p = guide.print;
  if (!p) return null;
  const pages = guidePageCount(guide);
  const strokes = guide.layers.flatMap((l) => l.diagram);
  const size = guide.formatLabel.replace("×", " × ");
  const tubeMl = tubeFor(guide.format);
  const sheet = (page: number, children: ReactNode) =>
    (!only || only.includes(page)) && (
      <GuideSheet key={page} workNumber={guide.workNumber} page={page} pages={pages} license={license}>
        {children}
      </GuideSheet>
    );
  const dryLabel = (l: Guide["layers"][number]) => (l.drySeconds > 0 ? `then dry ${Math.round(l.drySeconds / 60)} min` : "then stop");

  return (
    <>
      {sheet(
        1,
        <div className="flex grow flex-col justify-between pt-56">
          <div className="flex flex-col items-center gap-12">
            {/* The work whole, at its own ratio: up to 510 × 680, or 680 × 510 for a landscape work. */}
            <div className="relative">
              <Image
                src={guide.imageUrl}
                alt={`${guide.workNumber}, digital preview`}
                width={0}
                height={0}
                priority
                sizes="680px"
                className={cn("block h-auto w-auto", guide.orientation === "landscape" ? "max-h-510 max-w-680" : "max-h-680 max-w-510")}
              />
              <span className="absolute left-12 top-12 bg-bg px-8 py-4 text-print-sm">Digital preview</span>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="flex flex-col gap-4">
              <span className="text-print-title tracking-heading">{guide.workNumber}</span>
              <span>Your step-by-step guide</span>
            </div>
            <div className={cn("flex flex-col gap-2 text-right", muted)}>
              <span>{guide.levelLabel}</span>
              <span>{size} cm</span>
              <span>
                ~{guide.duration} · {guide.layers.length} layers
              </span>
              <span>{paletteName} palette</span>
            </div>
          </div>
        </div>,
      )}

      {sheet(
        2,
        <div className="flex flex-col gap-40 pt-56">
          <h1 className={h1}>Before you start</h1>
          <div className="grid grid-cols-2 gap-x-40">
            <div className="flex flex-col gap-10">
              <span className={muted}>In the box</span>
              <ul className="m-0 flex list-none flex-col gap-10 p-0">
                <Tick>Canvas {size} cm, primed</Tick>
                {p.tubes.map((t) => (
                  <Tick key={t.name}>
                    {t.name}, {tubeMl}
                  </Tick>
                ))}
                {p.boxTools.map((t) => (
                  <Tick key={t}>{t}</Tick>
                ))}
                <Tick>This guide</Tick>
              </ul>
            </div>
            <div className="flex flex-col gap-10">
              <span className={muted}>From your kitchen</span>
              <ul className="m-0 flex list-none flex-col gap-10 p-0">
                {p.kitchen.map((t) => (
                  <Tick key={t}>{t}</Tick>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex flex-col gap-10">
            <span className={muted}>Three rules</span>
            <ol className="m-0 grid list-none grid-cols-[40px_1fr] gap-y-10 p-0">
              {p.rules.map((r, i) => (
                <li key={r} className="contents">
                  <span>{pad(i + 1)}</span>
                  <span>{r}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="flex flex-col gap-10">
            <span className={muted}>Your afternoon</span>
            <Afternoon guide={guide} />
          </div>
        </div>,
      )}

      {sheet(
        3,
        <div className="flex flex-col gap-40 pt-56">
          <h1 className={h1}>Palette &amp; mixes</h1>
          <div className="flex flex-col gap-10">
            <span className={muted}>Your {count(p.tubes.length)} tubes</span>
            <div className="grid grid-cols-6 gap-x-12">
              {p.tubes.map((t) => (
                <div key={t.name} className="flex flex-col gap-8">
                  <Paint hex={t.hex} className="h-88" />
                  <span className="text-print-sm">
                    {t.name.split(" ").map((w, i) => (
                      <span key={i}>
                        {i > 0 && <br />}
                        {w}
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-18">
            <span className={muted}>{count(p.mixes.length).replace(/^./, (c) => c.toUpperCase())} mixes, made on the plate before each layer</span>
            {p.mixes.map((m) => (
              <div key={m.name} className="grid grid-cols-[64px_1fr] items-center gap-x-16">
                <Paint hex={m.hex} className="size-64" />
                <div className="flex flex-col gap-4">
                  <span className="font-medium">{m.name}</span>
                  <span className={cn("flex flex-wrap gap-x-14 gap-y-6", muted)}>
                    {m.parts.map((s) => (
                      <SwatchLine key={s.name} s={s} />
                    ))}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className={cn("m-0 max-w-560", muted)}>{p.mixNote}</p>
        </div>,
      )}

      {sheet(
        4,
        <div className="flex flex-col gap-40 pt-56">
          <h1 className={h1}>The plan</h1>
          <p className="m-0 max-w-560">{p.plan}</p>
          <div className="grid grid-cols-3 gap-x-24">
            {guide.layers.map((l, i) => (
              <div key={l.position} className="flex flex-col gap-10">
                <CanvasDiagram strokes={strokes} upTo={l.position} width={206} />
                <span className="font-medium">
                  {pad(l.position)} · {l.name}
                </span>
                <span className={muted}>{p.layers[i]?.summary}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-10">
            <span className={muted}>Brushes</span>
            <div className="grid grid-cols-[120px_1fr] gap-y-6">
              {p.brushes.map((b) => (
                <span key={b.name} className="contents">
                  <span>{b.name}</span>
                  <span>{b.use}</span>
                </span>
              ))}
            </div>
          </div>
        </div>,
      )}

      {guide.layers.map((l, i) =>
        sheet(
          layerPage(l.position),
          <div className="flex grow flex-col gap-32 pt-40">
            <div className="flex items-end justify-between">
              <div className="flex flex-col gap-6">
                <span className="text-2xl tracking-display">{pad(l.position)}</span>
                <h1 className={h1}>{l.name}</h1>
              </div>
              <div className={cn("flex flex-col text-right", muted)}>
                <span>
                  {l.minutes} min · {dryLabel(l)}
                </span>
                <span>{p.layers[i]?.brush ?? l.brush}</span>
              </div>
            </div>
            <div className="grid grid-cols-[300px_1fr] items-start gap-x-40">
              <div className="flex flex-col gap-8">
                <CanvasDiagram strokes={strokes} upTo={l.position} current={l.position} width={300} />
                <span className={cn("text-print-sm", muted)}>Your canvas after this layer. Faded strokes are the layers already dry.</span>
              </div>
              <div className="flex flex-col gap-24">
                <div className="flex flex-col gap-8">
                  <span className={muted}>On the plate</span>
                  <div className="flex flex-wrap gap-x-16 gap-y-8">
                    {l.plate.map((s) => (
                      <SwatchLine key={s.name} s={s} />
                    ))}
                  </div>
                </div>
                <ol className="m-0 grid list-none grid-cols-[24px_1fr] gap-y-10 p-0">
                  {l.steps.map((s, k) => (
                    <li key={s.id} className="contents">
                      <span className={muted}>{LETTERS[k]}</span>
                      <span>{p.layers[i]?.steps[k] ?? s.text}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            <div className="mt-auto grid grid-cols-[64px_1fr] gap-x-12 bg-surface-muted px-20 py-16">
              <span className="font-medium">Tip</span>
              <span>{p.layers[i]?.tip ?? l.tip}</span>
            </div>
          </div>,
        ),
      )}

      {sheet(
        pages,
        <div className="flex flex-col gap-36 pt-56">
          <h1 className={h1}>Avoid mud</h1>
          <div className="grid grid-cols-2 gap-x-40">
            <div className="flex flex-col gap-10">
              <div className="relative h-120 overflow-hidden bg-surface outline outline-1 -outline-offset-1 outline-border-field">
                <span aria-hidden="true" className="absolute left-20 top-20 h-80 w-150" style={{ background: p.mud.first }} />
                <span aria-hidden="true" className="absolute left-110 top-34 h-60 w-160 opacity-85" style={{ background: p.mud.second }} />
              </div>
              <span className="font-medium">Clean</span>
              <span className={muted}>{p.mud.clean}</span>
            </div>
            <div className="flex flex-col gap-10">
              <div className="relative h-120 overflow-hidden bg-surface outline outline-1 -outline-offset-1 outline-border-field">
                <span aria-hidden="true" className="absolute left-20 top-20 h-80 w-250" style={{ background: p.mud.mixed }} />
              </div>
              <span className="font-medium">Mud</span>
              <span className={muted}>{p.mud.muddy}</span>
            </div>
          </div>
          <div className="flex flex-col gap-10">
            <span className={muted}>If something goes wrong</span>
            <div className="grid grid-cols-[220px_1fr] gap-x-16 gap-y-10">
              {p.fixes.map((f) => (
                <span key={f.problem} className="contents">
                  <span>{f.problem}</span>
                  <span>{f.fix}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-10 border-t border-border-field pt-24">
            <h2 className="m-0 text-print-h2 tracking-normal">Sign &amp; share</h2>
            <ol className="m-0 grid list-none grid-cols-[24px_1fr] gap-y-8 p-0">
              {p.sign.map((s, k) => (
                <li key={s} className="contents">
                  <span className={muted}>{LETTERS[k]}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>,
      )}
    </>
  );
}

/** "Your afternoon" (Guide02): each layer and each drying time as a block as wide as its minutes, then "Sign & stop". */
function Afternoon({ guide }: { guide: Guide }) {
  const hatch = "repeating-linear-gradient(45deg, var(--color-border) 0 4px, var(--color-bg) 4px 8px)";
  const blocks = guide.layers.flatMap((l, i) => {
    const out = [{ key: `l${l.position}`, grow: l.minutes, label: [`Layer ${l.position}`, `${l.minutes} min`], bg: guide.print?.layers[i]?.colour ?? l.plate[0]?.hex ?? "", outline: false }];
    if (l.drySeconds > 0) out.push({ key: `d${l.position}`, grow: Math.round(l.drySeconds / 60), label: ["Dry", `${Math.round(l.drySeconds / 60)} min`], bg: hatch, outline: false });
    return out;
  });
  blocks.push({ key: "sign", grow: 30, label: ["Sign", "& stop"], bg: "var(--color-surface)", outline: true });
  return (
    <>
      <div aria-hidden="true" className="flex h-28 gap-4">
        {blocks.map((b) => (
          <span key={b.key} className={cn(b.outline && "outline outline-1 -outline-offset-1 outline-border-field")} style={{ flexGrow: b.grow, background: b.bg }} />
        ))}
      </div>
      <div className={cn("flex gap-4 text-print-sm", muted)}>
        {blocks.map((b) => (
          <span key={b.key} className="basis-0" style={{ flexGrow: b.grow }}>
            {b.label[0]}
            <br />
            {b.label[1]}
          </span>
        ))}
      </div>
    </>
  );
}
