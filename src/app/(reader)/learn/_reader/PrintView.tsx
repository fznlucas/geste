"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, CanvasDiagram, GuideBooklet, PrintSheet, StepCard, guidePageCount, layerPage, type PrintScope } from "@/components";
import { track } from "@/lib/analytics";
import { applyProgress, useProgressEntry } from "@/lib/client";
import { DesktopFrame } from "./DesktopFrame";
import { allStrokes, flatSteps, lastLetter, progressLine } from "./model";
import { readerPath, type ReaderData } from "./ReaderApp";

/** Mock latency of the PDF generation (a network call later): long enough to see "Preparing your PDF…". */
const PREPARE_MS = 800;

/**
 * /learn/[id]/print (AppPrint, Guide01–08). The "Print this guide" sheet over the reader (phone:
 * the dimmed diagram, as drawn; desktop: the reader, with the same content in a centred panel).
 * "Prepare PDF" shows the A4 pages with the licence watermark, and "Print or save as PDF" opens the
 * browser's print dialog (A4, no margins). Mock: the preview spends no print credit (docs/mock-plan.md).
 */
export function PrintView({ data, wide }: { data: ReaderData; wide: boolean }) {
  const { item, guide, license } = data;
  const id = item.entitlementId;
  const router = useRouter();
  const fromLibrary = useSearchParams().get("from") === "library";
  const live = applyProgress(item, useProgressEntry(id));
  const steps = flatSteps(guide);
  const index = Math.max(0, steps.findIndex((s) => s.id === live.step));
  const step = steps[index]!;
  const pages = guidePageCount(guide);
  const [scope, setScope] = useState<PrintScope>("full");
  const [stage, setStage] = useState<"choose" | "preparing" | "preview">("choose");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const close = () => router.push(fromLibrary ? "/account" : readerPath.step(id, step.id));
  const prepare = () => {
    setStage("preparing");
    track("guide_print_prepared", { entitlementId: id, scope });
    timer.current = setTimeout(() => setStage("preview"), PREPARE_MS);
  };

  if (stage === "preview") {
    return <Preview data={data} only={scope === "layer" ? [layerPage(step.layer.position)] : undefined} onBack={() => setStage("choose")} />;
  }

  const sheet = (
    <PrintSheet
      open
      onClose={close}
      variant={wide ? "panel" : "sheet"}
      scrim={wide}
      printsLeft={item.printsLeft}
      pages={pages}
      name={license.name}
      orderNumber={license.orderNumber}
      scope={scope}
      onScope={setScope}
      onPrepare={prepare}
      preparing={stage === "preparing"}
    />
  );

  if (wide) {
    return (
      <>
        <DesktopFrame
          inert
          guide={guide}
          item={item}
          layer={step.layer}
          current={step.id}
          onGo={() => {}}
          printHref={readerPath.print(id)}
          status={<span>{progressLine(steps, index)}</span>}
          actions={
            <>
              <Button variant="ghost" className="min-h-56 min-w-120">Back</Button>
              <Button trailing="→" className="min-h-56 flex-1">Next step</Button>
            </>
          }
        >
          <StepCard id={step.id} lastLetter={lastLetter(step.layer)} brush={step.layer.brush} text={step.text} plate={step.layer.plate} tip={step.layer.tip} />
        </DesktopFrame>
        {sheet}
      </>
    );
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-bg">
      <div className="absolute inset-0 bg-scrim-sheet" />
      <div aria-hidden="true" className="px-16 pt-52 opacity-50">
        <CanvasDiagram strokes={allStrokes(guide)} upTo={step.layer.position} current={step.layer.position} width={270} />
      </div>
      {sheet}
    </div>
  );
}

/** The pages, scaled to the screen's width (printed at A4 whatever the scale). */
function Preview({ data, only, onBack }: { data: ReaderData; only?: number[]; onBack: () => void }) {
  const { guide, item, license } = data;
  const scale = usePageScale();
  const count = only?.length ?? guidePageCount(guide);
  return (
    <div className="min-h-dvh bg-surface-muted print:bg-bg">
      <header className="sticky top-0 z-sticky flex flex-wrap items-center justify-between gap-x-20 gap-y-8 bg-bg px-16 py-8 lg:px-32 print:hidden">
        <button type="button" onClick={onBack} className="flex min-h-44 cursor-pointer items-center hover:text-fg-muted">
          ← Print options
        </button>
        <h1 className="m-0 text-xs font-normal tracking-normal text-fg-muted">
          {guide.workNumber} · {count} {count === 1 ? "page" : "pages"}, A4 · licensed to {license.name} · #{license.orderNumber}
        </h1>
        <Button trailing="→" onClick={() => window.print()} className="w-full md:w-auto">
          Print or save as PDF
        </Button>
      </header>
      <div className="flex flex-col items-center gap-24 px-16 py-24 lg:gap-32 lg:py-32 print:block print:p-0">
        <div className="flex flex-col gap-24 print:block print:[zoom:1]!" style={{ zoom: scale }}>
          <GuideBooklet guide={guide} license={license} paletteName={item.paletteName} only={only} />
        </div>
      </div>
    </div>
  );
}

/** 1 on a wide screen; the page's 794 px fitted in the width (16 px gutters) on a phone. */
function usePageScale(): number {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerWidth - 32) / 794));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  return scale;
}
