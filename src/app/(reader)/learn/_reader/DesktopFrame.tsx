"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CanvasDiagram, StepProgress } from "@/components";
import type { Guide, GuideLayerData, LibraryItem } from "@/lib/api";
import { cn } from "@/lib/cn";
import { allStrokes, listHref, pad } from "./model";

export interface DesktopFrameProps {
  guide: Guide;
  item: LibraryItem;
  layer: GuideLayerData;
  current: string;
  onGo: (id: string) => void;
  printHref: string;
  /** Right column: the step, or the drying timer. */
  children: ReactNode;
  /** Bottom left: "Step 8 of 15 · 45 min, then dry 45 min". */
  status: ReactNode;
  /** Bottom right: Back and the primary action. */
  actions: ReactNode;
  /** Cross-fade the diagram (a layer change after the first render). */
  fade?: boolean;
  inert?: boolean;
}

/**
 * GuideReader focus mode: no site chrome. Top bar "← Library" · "N°03 · Layer 02 · Gestures" ·
 * Shopping list / Print; the 15 segments; diagram on Mist (480 × 640, smaller on short screens) and
 * the right column; the step line and Back / Next at the bottom, 56 px tall.
 */
export function DesktopFrame({ guide, item, layer, current, onGo, printHref, children, status, actions, fade, inert }: DesktopFrameProps) {
  return (
    <div className="flex h-dvh min-h-640 flex-col bg-bg" inert={inert || undefined}>
      <header className="grid min-h-64 grid-cols-3 items-center px-32 pt-8">
        <Link href="/account" className="flex min-h-44 items-center justify-self-start hover:text-fg-muted">
          ← Library
        </Link>
        <h1 className="m-0 text-center text-xs font-normal tracking-normal">
          {guide.workNumber}{" "}
          <span className="text-fg-muted">
            · Layer {pad(layer.position)} · {layer.name}
          </span>
        </h1>
        <nav aria-label="Guide" className="flex justify-end gap-20">
          <Link href={listHref(item)} className="-my-12 inline-flex min-h-44 items-center text-fg-muted hover:text-fg">
            Shopping list
          </Link>
          <Link href={printHref} className="-my-12 inline-flex min-h-44 items-center text-fg-muted hover:text-fg">
            Print
          </Link>
        </nav>
      </header>
      <div className="px-32 pt-8">
        <StepProgress layers={guide.layers.map((l) => l.steps.map((s) => s.id))} current={current} onGo={onGo} />
      </div>
      <main className="grid min-h-0 flex-1 grid-cols-2 gap-x-32 px-32 pt-16">
        <div className="flex min-h-0 items-center justify-center overflow-hidden bg-surface-muted">
          <CanvasDiagram
            key={layer.position}
            strokes={allStrokes(guide)}
            upTo={layer.position}
            current={layer.position}
            width={480}
            className={cn("h-full max-h-640 w-auto max-w-full", fade && "animate-[fade-in_var(--dur-step)_var(--ease-standard)]")}
          />
        </div>
        <div className="flex flex-col justify-center gap-28 px-48">{children}</div>
      </main>
      <footer className="grid grid-cols-2 items-center gap-x-32 px-32 pb-24 pt-16">
        <span className="flex flex-col text-fg-muted">{status}</span>
        <div className="flex gap-10 px-48">{actions}</div>
      </footer>
    </div>
  );
}
