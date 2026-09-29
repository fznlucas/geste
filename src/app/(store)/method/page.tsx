/**
 * Method — boards Method (1440) and MMethod (390), docs/screens/store.md §Method. Built at deploy time.
 * How it works (4 steps) · The size sets the level · Real results · Questions · Ready for your first canvas?
 */
import type { Metadata } from "next";
import Image from "next/image";
import { Accordion, ButtonLink, CanvasDiagram } from "@/components";
import { findGuide, getWork } from "@/lib/api";
import { FORMATS, LEVELS, estimatedTime, type FormatKey, type LevelKey } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "How it works",
  description: "Every work is designed stroke by stroke, then broken down into layers anyone can follow. You do not need to know how to paint.",
};

/** The work the boards draw in "How it works" (its three layers, then the finished work). */
const METHOD_WORK = "n03";

const STEPS = [
  { n: "01", title: "Choose", text: "A work, a format, a palette. The format sets the level, or pick your own.", short: "A work, a format, a palette." },
  { n: "02", title: "Get", text: "Your guide unlocks in your library, with the exact shopping list for your canvas.", short: "Guide + exact shopping list." },
  { n: "03", title: "Paint", text: "Three layers, step by step, on your phone. Works offline, with drying timers.", short: "Three layers, step by step, offline." },
  { n: "04", title: "Sign", text: "Stop, sign, hang it. It will not look like the preview. It will look like yours.", short: "Stop, sign, hang it." },
];

/** What each level adds, after its layer count ("2 layers, flat strokes"). */
const TECHNIQUE: Record<LevelKey, string> = { beginner: "flat strokes", intermediate: "veils", advanced: "drips, knife" };

const RESULTS = [
  { photo: "N°03 by a first-time painter", short: "N°03 by a beginner", caption: "N°03 · Intermediate" },
  { photo: "N°01 by a first-time painter", short: "N°01 by a beginner", caption: "N°01 · Beginner" },
  { photo: "N°07 by a first-time painter", caption: "N°07 · Beginner" },
  { photo: "N°03 by the studio", caption: "N°03 · Studio test" },
];

/** Desktop wording, then the phone's shorter one (MMethod). */
const QUESTIONS = [
  { id: "never-painted", q: "I have never painted. Is that a problem?", a: "That is who Geste is for. Start with a Beginner work: two layers, flat strokes, about an hour.", qShort: "I have never painted.", aShort: "That is who Geste is for. Start with a Beginner work." },
  { id: "materials", q: "Which paint do I need?", a: "Every guide comes with an exact shopping list for your format and palette, with a cheaper alternative for each item.", qShort: "Which paint do I need?", aShort: "Each guide has an exact shopping list, with a budget option." },
  { id: "offline", q: "Can I use it without internet?", a: "Yes. Open the guide once online and it stays on your phone.", qShort: "Offline?", aShort: "Yes: open the guide once online." },
  { id: "print", q: "Can I print the guide?", a: "Yes, three times per guide. Each copy carries your name.", qShort: "Can I print it?", aShort: "Three times per guide, with your name." },
  { id: "different", q: "What if mine looks different?", a: "It will. That is the point. Stop earlier than you think.", qShort: "Mine looks different.", aShort: "It will. That is the point." },
];

export default async function MethodPage() {
  const work = await getWork(METHOD_WORK);
  if (!work) throw new Error(`Method work ${METHOD_WORK} is not live`);
  const guide = await findGuide(work.id, work.defaultFormat, FORMATS[work.defaultFormat].defaultLevel);
  const strokes = guide?.layers.flatMap((l) => l.diagram) ?? [];
  const sizes = (Object.keys(FORMATS) as FormatKey[]).map((f) => {
    const level = FORMATS[f].defaultLevel;
    return { format: FORMATS[f].label, level: LEVELS[level].label, detail: `${LEVELS[level].layers} layers, ${TECHNIQUE[level]}`, time: `~${estimatedTime({ format: f, level: "match", palette: "original" })}` };
  });

  return (
    <div className="mx-auto flex w-full max-w-1440 flex-col gap-48 px-16 pt-24 lg:gap-96 lg:px-120 lg:pt-88">
      <div className="flex max-w-640 flex-col gap-8">
        <span className="text-fg-muted lg:hidden">Method</span>
        <h1 className="text-lg lg:text-xs lg:font-medium lg:tracking-normal">How Geste works</h1>
        <p className="text-fg-muted">
          <span className="lg:hidden">Every work is designed stroke by stroke, then broken into layers anyone can follow.</span>
          <span className="hidden lg:inline">Every work is designed stroke by stroke, then broken down into layers anyone can follow. You do not need to know how to paint. You need an afternoon.</span>
        </p>
      </div>

      {/* How it works: the canvas after each layer, then the finished work (phone: the last diagram again). */}
      <section aria-label="How it works" className="flex flex-col gap-20 lg:grid lg:grid-cols-4 lg:gap-x-40">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center gap-14 lg:flex-col lg:items-stretch">
            <span className="flex h-150 w-120 shrink-0 items-center justify-center bg-surface-muted lg:h-260 lg:w-auto">
              <span className="lg:hidden"><CanvasDiagram strokes={strokes} upTo={Math.min(i + 1, 3)} width={75} /></span>
              <span className="hidden lg:block">
                {i < 3 ? (
                  <CanvasDiagram strokes={strokes} upTo={i + 1} width={150} />
                ) : (
                  <Image src={work.imageUrl} alt="" width={150} height={200} sizes="150px" className="block h-200 w-150 object-contain" />
                )}
              </span>
            </span>
            <span className="flex flex-col gap-4 lg:gap-14">
              <span className="text-fg-muted">{s.n}</span>
              <span className="font-medium">{s.title}</span>
              <span className="text-fg-muted">
                <span className="lg:hidden">{s.short}</span>
                <span className="hidden lg:inline">{s.text}</span>
              </span>
            </span>
          </div>
        ))}
      </section>

      {/* The size sets the level. */}
      <section aria-labelledby="method-sizes" className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-x-40">
        <div className="mb-8 flex flex-col gap-8 lg:col-span-4 lg:mb-0">
          <h2 id="method-sizes" className="text-xs font-medium tracking-normal">The size sets the level</h2>
          <p className="hidden text-fg-muted lg:block">Bigger canvases need more layers and more gestures. You can also go custom: advanced technique on a small canvas.</p>
        </div>
        <div className="flex flex-col lg:col-span-7 lg:col-start-6">
          {sizes.map((s) => (
            <div key={s.format} className="flex justify-between border-t border-border py-10 lg:grid lg:grid-cols-[120px_160px_1fr_80px] lg:py-12">
              <span className="lg:hidden">{s.format} · {s.level}</span>
              <span className="hidden lg:inline">{s.format}</span>
              <span className="hidden lg:inline">{s.level}</span>
              <span className="hidden text-fg-muted lg:inline">{s.detail}</span>
              <span className="text-fg-muted lg:text-right lg:text-fg">{s.time}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Real results: the result photos arrive through the admin; until then the boards' frames. */}
      <section aria-labelledby="method-results" className="flex flex-col gap-10 lg:gap-20">
        <div className="flex justify-between">
          <h2 id="method-results" className="text-xs font-medium tracking-normal">Real results</h2>
          <span className="hidden text-fg-muted lg:inline">First-time painters, same guide</span>
        </div>
        <div className="grid grid-cols-2 gap-14 lg:grid-cols-4 lg:gap-x-40 lg:gap-y-0">
          {RESULTS.map((r) => (
            <div key={r.photo} className={r.short ? "flex flex-col gap-10" : "hidden flex-col gap-10 lg:flex"}>
              <div className="flex h-226 items-center justify-center border border-dashed border-border-dashed p-12 text-center text-fg-muted lg:h-342 lg:p-20">
                <span className="lg:hidden">[{r.short}]</span>
                <span className="hidden lg:inline">[Photo: {r.photo}]</span>
              </div>
              <span className="hidden text-fg-muted lg:inline">{r.caption}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Questions: a list on desktop (Method), an accordion on phones (MMethod, the first one open).
          #materials (footer "Shopping lists"): the boards have no materials section; "Which paint do I need?" lives here. */}
      <section id="materials" aria-labelledby="method-questions" className="scroll-mt-24 lg:grid lg:grid-cols-12 lg:gap-x-40">
        <h2 id="method-questions" className="sr-only text-xs font-medium tracking-normal lg:not-sr-only lg:col-span-4">Questions</h2>
        <div className="hidden flex-col lg:col-span-7 lg:col-start-6 lg:flex">
          {QUESTIONS.map((q) => (
            <div key={q.id} className="flex flex-col gap-4 border-t border-border py-14">
              <h3 className="text-xs font-normal tracking-normal">{q.q}</h3>
              <p className="text-fg-muted">{q.a}</p>
            </div>
          ))}
        </div>
        <div className="lg:hidden">
          <Accordion type="single" defaultValue={["never-painted"]} variant="faq" items={QUESTIONS.map((q) => ({ value: q.id, title: q.qShort, content: <p>{q.aShort}</p> }))} />
        </div>
      </section>

      {/* Closing call: desktop row with two buttons, phone a single full-width "Browse works". */}
      <section aria-label="Ready for your first canvas?" className="flex flex-col lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-40 lg:border-t lg:border-border lg:py-40">
        <div className="hidden flex-col gap-6 lg:col-span-6 lg:flex">
          <span className="font-medium">Ready for your first canvas?</span>
          <span className="text-fg-muted">Start with a Beginner work: two layers, about an hour.</span>
        </div>
        <div className="flex gap-12 lg:col-span-6 lg:col-start-7 lg:justify-end">
          <span className="hidden lg:contents">
            <ButtonLink href="/help" variant="ghost" className="min-w-160">More questions</ButtonLink>
          </span>
          <ButtonLink href="/shop" trailing="→" className="flex-1 lg:min-w-220 lg:flex-none">Browse works</ButtonLink>
        </div>
      </section>
    </div>
  );
}
