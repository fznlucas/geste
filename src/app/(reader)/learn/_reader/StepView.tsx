"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { Button, CanvasDiagram, StepCard, StepProgress } from "@/components";
import { track } from "@/lib/analytics";
import { applyProgress, completeGuide, markOpened, progressStore, saveProgress, startDrying } from "@/lib/client";
import { cn } from "@/lib/cn";
import { DesktopFrame } from "./DesktopFrame";
import { allStrokes, flatSteps, lastLetter, progressLine } from "./model";
import { readerPath, type ReaderData } from "./ReaderApp";

type Direction = "next" | "prev" | null;

/**
 * Step view (GuideReader, AppStep). Opens on ?step=, else where the painter stopped. Every change
 * saves the step (the Library follows) and rewrites ?step= without a new history entry. ← → keys,
 * segment clicks and (phone) swipes move one step; "Next step" on a layer's last step starts the
 * drying timer; the last step finishes the guide.
 */
export function StepView({ data, wide }: { data: ReaderData; wide: boolean }) {
  const { item, guide } = data;
  const id = item.entitlementId;
  const router = useRouter();
  const params = useSearchParams();
  const steps = useMemo(() => flatSteps(guide), [guide]);
  const ids = useMemo(() => steps.map((s) => s.id), [steps]);

  const [current, setCurrent] = useState(() => {
    const asked = params.get("step");
    const resume = applyProgress(item, progressStore.get()[id]).step;
    return asked && ids.includes(asked) ? asked : ids.includes(resume) ? resume : ids[0]!;
  });
  const [dir, setDir] = useState<Direction>(null);
  const index = ids.indexOf(current);
  const step = steps[index]!;
  const isLast = index === steps.length - 1;
  const [fade, setFade] = useState(false);

  // First open: guide_opened. A timer left running (app closed while drying) reopens on the timer.
  useEffect(() => {
    const first = !progressStore.get()[id] && !item.openedAt;
    markOpened(id, item);
    if (first) track("guide_opened", { entitlementId: id, guideId: guide.id });
    const drying = progressStore.get()[id]?.drying;
    if (drying && !params.get("step")) router.replace(readerPath.timer(id, drying.layer));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (progressStore.get()[id]?.step !== current) saveProgress(id, current);
    if (new URLSearchParams(window.location.search).get("step") !== current) window.history.replaceState(null, "", `?step=${current}`);
    track("guide_step_viewed", { entitlementId: id, step: current });
  }, [id, current]);

  const go = useCallback(
    (to: string) => {
      const at = ids.indexOf(to);
      if (at < 0 || to === current) return;
      setFade(steps[at]!.layer.position !== step.layer.position);
      setDir(at > index ? "next" : "prev");
      setCurrent(to);
    },
    [ids, steps, current, index, step.layer.position],
  );
  const back = () => index > 0 && go(ids[index - 1]!);
  const forward = () => index < ids.length - 1 && go(ids[index + 1]!);

  const next = () => {
    if (step.endOfLayer && step.layer.drySeconds > 0) {
      startDrying(id, step.layer.position, step.layer.drySeconds);
      track("guide_timer_started", { entitlementId: id, layer: step.layer.position });
      router.push(readerPath.timer(id, step.layer.position));
      return;
    }
    forward();
  };
  const finish = () => {
    completeGuide(id, current);
    track("guide_completed", { entitlementId: id, guideId: guide.id });
    router.push("/account");
  };

  // ← → anywhere in the reader, except while typing or with a modifier.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
      if (e.key === "ArrowRight") forward();
      else if (e.key === "ArrowLeft") back();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const nextLabel = step.endOfLayer && step.layer.drySeconds > 0 ? "Start drying timer" : "Next step";
  const motion = dir === "next" ? "animate-[step-from-right_var(--dur-step)_var(--ease-standard)]" : dir === "prev" ? "animate-[step-from-left_var(--dur-step)_var(--ease-standard)]" : undefined;
  const standIn = guide.isStandIn && <span>Preview content: N°03&apos;s steps stand in for this guide.</span>;

  if (wide) {
    return (
      <DesktopFrame
        guide={guide}
        item={item}
        layer={step.layer}
        current={current}
        onGo={go}
        printHref={readerPath.print(id)}
        fade={fade}
        status={
          <>
            <span>{progressLine(steps, index)}</span>
            {standIn}
          </>
        }
        actions={
          <>
            <Button variant="ghost" onClick={back} disabled={index === 0} aria-label="Back, previous step" className="min-h-56 min-w-120">
              Back
            </Button>
            {isLast ? (
              <Button trailing="→" onClick={finish} className="min-h-56 flex-1">
                I signed it. Finish
              </Button>
            ) : (
              <Button trailing="→" onClick={next} className="min-h-56 flex-1">
                {nextLabel}
              </Button>
            )}
          </>
        }
      >
        <StepCard key={current} id={current} lastLetter={lastLetter(step.layer)} brush={step.layer.brush} text={step.text} plate={step.layer.plate} tip={step.layer.tip} className={motion} />
      </DesktopFrame>
    );
  }

  return (
    <PhoneStep
      onSwipe={(d) => (d === "next" ? forward() : back())}
      header={
        <>
          <Link href="/account" className="flex min-h-44 items-center hover:text-fg-muted">
            ← {guide.workNumber}
          </Link>
          <h1 className="m-0 text-xs font-normal tracking-normal text-fg-muted">
            Layer {step.layer.position} · {step.layer.name}
          </h1>
        </>
      }
      progress={<StepProgress variant="phone" layers={guide.layers.map((l) => l.steps.map((s) => s.id))} current={current} onGo={go} />}
      diagram={
        <CanvasDiagram
          key={step.layer.position}
          strokes={allStrokes(guide)}
          upTo={step.layer.position}
          current={step.layer.position}
          width={270}
          className={cn("h-auto max-w-full", fade && "animate-[fade-in_var(--dur-step)_var(--ease-standard)]")}
        />
      }
      body={
        <>
          <StepCard key={current} variant="phone" id={current} lastLetter={lastLetter(step.layer)} brush={step.brush} text={step.text} className={motion} />
          {standIn && <p className="m-0 pt-10 text-fg-muted">{standIn}</p>}
        </>
      }
      actions={
        <>
          <Button variant="ghost" onClick={back} disabled={index === 0} aria-label="Back, previous step" className="min-w-88">
            Back
          </Button>
          <Button trailing="→" onClick={isLast ? finish : next} className="flex-1">
            {isLast ? "I signed it. Finish" : nextLabel}
          </Button>
        </>
      }
    />
  );
}

/** AppStep: header, the layer's segments, 270 × 360 diagram, the step; Back / Next pinned 24 px from the bottom. */
function PhoneStep({ header, progress, diagram, body, actions, onSwipe }: { header: React.ReactNode; progress: React.ReactNode; diagram: React.ReactNode; body: React.ReactNode; actions: React.ReactNode; onSwipe: (d: "next" | "prev") => void }) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const down = (e: PointerEvent) => {
    start.current = e.pointerType === "mouse" ? null : { x: e.clientX, y: e.clientY };
  };
  const up = (e: PointerEvent) => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) onSwipe(dx < 0 ? "next" : "prev");
  };
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="flex min-h-44 items-center justify-between px-16 pt-8">{header}</header>
      <div className="px-16 pt-8">{progress}</div>
      <main onPointerDown={down} onPointerUp={up} onPointerCancel={() => (start.current = null)} className="flex touch-pan-y flex-col">
        <div className="flex justify-center px-16 pt-16">{diagram}</div>
        <div className="px-16 pt-20">{body}</div>
      </main>
      <div className="sticky bottom-0 mt-auto flex gap-10 bg-bg px-16 pb-24 pt-16">{actions}</div>
    </div>
  );
}
