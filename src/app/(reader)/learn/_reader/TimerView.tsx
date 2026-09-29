"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, DryingTimer } from "@/components";
import { dryingLeft, saveProgress, startDrying, stopDrying, toggleDrying, useProgressEntry } from "@/lib/client";
import { DesktopFrame } from "./DesktopFrame";
import { flatSteps, pad, progressLine } from "./model";
import { readerPath, type ReaderData } from "./ReaderApp";

/**
 * Drying timer of a layer (`?layer=2`): GuideReader's drying view on desktop, AppTimer on the phone.
 * The end date is stored, so a reload or a locked phone keeps the right time. "Pause" / "Start
 * timer"; "It is dry, …" moves to the next layer at any time (skip). Back and "← Layer 2" leave the
 * timer and return to the layer's last step. No notification permission is asked in the mock.
 */
export function TimerView({ data, wide }: { data: ReaderData; wide: boolean }) {
  const { item, guide } = data;
  const id = item.entitlementId;
  const router = useRouter();
  const entry = useProgressEntry(id);
  const asked = Number(useSearchParams().get("layer"));
  const layerNo = asked || entry?.drying?.layer;
  const layer = guide.layers.find((l) => l.position === layerNo && l.drySeconds > 0);
  const nextLayer = layer && guide.layers.find((l) => l.position === layer.position + 1);
  const steps = flatSteps(guide);
  const lastStep = layer?.steps.at(-1)?.id;
  const [now, setNow] = useState(() => Date.now());

  // Opened without a running timer (a link, a reload after "Back"): the layer's timer, paused.
  useEffect(() => {
    if (!layer) {
      router.replace(readerPath.step(id));
      return;
    }
    if (!entry?.drying || entry.drying.layer !== layer.position) startDrying(id, layer.position, layer.drySeconds, { paused: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const drying = entry?.drying ?? null;
  const left = drying ? dryingLeft(drying, now) : (layer?.drySeconds ?? 0);
  const running = !!drying?.until && left > 0;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

  if (!layer || !lastStep) return null;

  const toggle = () => {
    setNow(Date.now());
    toggleDrying(id);
  };
  const leave = (to = lastStep) => {
    stopDrying(id);
    router.push(readerPath.step(id, to));
  };
  const dry = () => {
    const first = nextLayer?.steps[0]?.id;
    stopDrying(id);
    if (first) saveProgress(id, first);
    router.push(readerPath.step(id, first ?? lastStep));
  };

  if (wide) {
    return (
      <DesktopFrame
        guide={guide}
        item={item}
        layer={layer}
        current={lastStep}
        onGo={(to) => leave(to)}
        printHref={readerPath.print(id)}
        status={<span>{progressLine(steps, steps.findIndex((s) => s.id === lastStep))}</span>}
        actions={
          <>
            <Button variant="ghost" onClick={() => leave()} aria-label="Back, previous step" className="min-h-56 min-w-120">
              Back
            </Button>
            <Button trailing="→" onClick={dry} className="min-h-56 flex-1">
              {nextLayer ? `It is dry, start layer ${pad(nextLayer.position)}` : "It is dry, back to the guide"}
            </Button>
          </>
        }
      >
        <DryingTimer left={left} total={drying?.seconds ?? layer.drySeconds} layer={pad(layer.position)} running={running} onToggle={toggle} />
      </DesktopFrame>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="flex min-h-44 items-center justify-between px-16 pt-8">
        <button type="button" onClick={() => leave()} className="flex min-h-44 cursor-pointer items-center hover:text-fg-muted">
          ← Layer {layer.position}
        </button>
        <h1 className="m-0 text-xs font-normal tracking-normal text-fg-muted">Drying</h1>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-32">
        <DryingTimer variant="phone" left={left} total={drying?.seconds ?? layer.drySeconds} layer={String(layer.position)} running={running} />
      </main>
      <div className="flex flex-col gap-10 px-16 pb-24">
        <Button variant="ghost" fullWidth onClick={toggle} disabled={left === 0}>
          {running ? "Pause" : "Start timer"}
        </Button>
        <Button fullWidth trailing="→" onClick={dry}>
          {nextLayer ? `It is dry, go to layer ${nextLayer.position}` : "It is dry, back to the guide"}
        </Button>
      </div>
    </div>
  );
}
