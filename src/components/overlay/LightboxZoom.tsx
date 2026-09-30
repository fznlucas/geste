"use client";

import * as D from "@radix-ui/react-dialog";
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { Icon } from "../brand/Icon";
import { Button } from "../primitives/Button";
import { IconButton } from "../primitives/IconButton";
import { useReturnFocus } from "./useReturnFocus";
import { cn } from "@/lib/cn";
import { duration, ease, prefersReducedMotion } from "@/lib/motion";

/** Zoom of a click or Enter (desktop, keyboard); a pinch goes from 1 to MAX_PINCH. */
export const LIGHTBOX_ZOOM = 2.5;
const MAX_PINCH = 4;
/** Arrow keys move a zoomed picture by a tenth of its box. */
const PAN_STEP = 0.1;
/** Phones: two taps within 300 ms and 32 px of each other are a double-tap (each tap shorter than 300 ms). */
const DOUBLE_TAP = { ms: 300, px: 32 };

/** Scale, and translation in px from the centred picture (transform-origin: centre). */
type View = { s: number; x: number; y: number };
const WHOLE: View = { s: 1, x: 0, y: 0 };
type Point = { x: number; y: number };

const clampTo = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Never smaller than the box, never a gap between the picture and the box's edges. */
function clampView(v: View, w: number, h: number): View {
  const s = clampTo(v.s, 1, MAX_PINCH);
  const mx = ((s - 1) * w) / 2;
  const my = ((s - 1) * h) / 2;
  return { s, x: clampTo(v.x, -mx, mx), y: clampTo(v.y, -my, my) };
}
/** Scale `s` with the box point `c` (from the centre) at the matching point of the picture: the cursor's edge shows the picture's edge. */
const follow = (c: Point, s: number): View => ({ s, x: c.x * (1 - s), y: c.y * (1 - s) });

export interface LightboxZoomProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible name of the full-screen view: "N°08, digital preview". */
  title: string;
  /** Width / height of what is shown (the canvas, the whole sheet). */
  ratio: number;
  /** What is shown, filling a box of that ratio: the image (`fill`, sizes="250vw") or the print's sheet (`h-full w-full`). */
  children: ReactNode;
  /** Placement of the Zoom button on its ground, e.g. "absolute bottom-0 right-0". */
  className?: string;
  /** /kit: open already zoomed ×2.5 on the centre. */
  initialZoomed?: boolean;
  /** /kit: show a state whatever the picture does. */
  status?: "loading" | "error";
}

/**
 * Loupe of the work and print pages. The Zoom button (44 px target, a 24 px Paper square like the
 * picture's badge, loupe icon, hover Stone) opens a full-screen Radix Dialog on Paper; the page can
 * also open it from a click on its picture. The picture fits the screen, whole. Mouse: a click zooms
 * ×2.5 where it points, the picture then follows the cursor, a click shows it whole again. Touch:
 * pinch to zoom (up to ×4), one finger to move, a double-tap zooms ×2.5 where it touches and the next
 * one shows the picture whole. Keyboard: Enter / Space zoom, arrows move. Escape,
 * the cross ("Close") or a click beside the picture close it. The view fades in 240 ms (base), the
 * zoom takes 240 ms; nothing under prefers-reduced-motion. Loading: a Mist block, no spinner.
 */
export function LightboxZoom({ open, onOpenChange, title, ratio, children, className, initialZoomed, status }: LightboxZoomProps) {
  const focus = useReturnFocus();
  // A click closes only when it started and ended beside the picture (not a pan released outside it).
  const downOnBackdrop = useRef(false);
  return (
    <>
      <button
        type="button"
        aria-label="Zoom"
        aria-haspopup="dialog"
        onClick={() => onOpenChange(true)}
        className={cn("group flex size-44 items-center justify-center text-fg outline-none", className)}
      >
        <span className="flex size-24 items-center justify-center bg-bg transition-colors duration-fast ease-standard group-hover:text-fg-muted group-focus-visible:outline group-focus-visible:outline-1 group-focus-visible:outline-offset-2 group-focus-visible:outline-fg">
          <Icon name="zoom" />
        </span>
      </button>
      <D.Root open={open} onOpenChange={onOpenChange}>
        <D.Portal>
          <D.Overlay className="fixed inset-0 z-modal bg-bg data-[state=closed]:animate-[fade-out_240ms_var(--ease-standard)] data-[state=open]:animate-[fade-in_240ms_var(--ease-standard)]" />
          <D.Content
            {...focus}
            data-lightbox
            onPointerDown={(e) => (downOnBackdrop.current = e.target === e.currentTarget)}
            onClick={(e) => {
              if (downOnBackdrop.current && e.target === e.currentTarget) onOpenChange(false);
            }}
            className="fixed inset-0 z-modal flex items-center justify-center px-16 py-56 outline-none [--pad-y:56px] data-[state=closed]:animate-[fade-out_240ms_var(--ease-standard)] data-[state=open]:animate-[fade-in_240ms_var(--ease-standard)] lg:px-72 lg:py-72 lg:[--pad-y:72px]"
          >
            <D.Title className="sr-only">{title}</D.Title>
            <D.Description className="sr-only">Click the picture to zoom in and move the pointer to look around; on a touch screen, pinch or double-tap to zoom and drag to move. Escape closes.</D.Description>
            <D.Close asChild>
              <IconButton icon="close" label="Close" className="absolute right-6 top-6 lg:right-20 lg:top-20" />
            </D.Close>
            <Stage ratio={ratio} initialZoomed={initialZoomed} status={status}>
              {children}
            </Stage>
          </D.Content>
        </D.Portal>
      </D.Root>
    </>
  );
}

/** The picture's box: fits the screen at `ratio`; mounted with the dialog, so every opening starts whole. */
function Stage({ ratio, children, initialZoomed, status: forced }: { ratio: number; children: ReactNode; initialZoomed?: boolean; status?: "loading" | "error" }) {
  const box = useRef<HTMLButtonElement>(null);
  const [view, setViewState] = useState<View>(initialZoomed ? { s: LIGHTBOX_ZOOM, x: 0, y: 0 } : WHOLE);
  const current = useRef(view);
  const [animate, setAnimate] = useState(false);
  const animTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [loaded, setLoaded] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const status = forced ?? loaded;

  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{ view: View; mid: Point; dist: number } | null>(null);
  const pointerType = useRef("mouse");
  const moved = useRef(false);
  /** The touch in progress (one finger so far?) and the last tap, for the double-tap. */
  const tap = useRef<{ start: number; multi: boolean } | null>(null);
  const lastTap = useRef<{ time: number; at: Point } | null>(null);

  const setView = (v: View) => {
    current.current = v;
    setViewState(v);
  };
  /** The zoom toggles glide (base, 240 ms); the cursor, fingers and arrows move the picture at once. */
  const glide = () => {
    if (prefersReducedMotion()) return;
    setAnimate(true);
    clearTimeout(animTimer.current);
    animTimer.current = setTimeout(() => setAnimate(false), duration.base);
  };
  useEffect(() => () => clearTimeout(animTimer.current), []);

  // Every <img> of the content decides the state: a Mist block until they are all in, a line if one fails.
  useEffect(() => {
    const imgs = [...(box.current?.querySelectorAll("img") ?? [])];
    const check = () => {
      if (imgs.some((i) => i.complete && i.naturalWidth === 0)) setLoaded("error");
      else if (imgs.every((i) => i.complete)) setLoaded("ready");
    };
    const fail = () => setLoaded("error");
    check();
    for (const i of imgs) {
      i.addEventListener("load", check);
      i.addEventListener("error", fail);
    }
    return () => {
      for (const i of imgs) {
        i.removeEventListener("load", check);
        i.removeEventListener("error", fail);
      }
    };
  }, [attempt]);

  /** A pointer relative to the box's centre, and the box's size. */
  const measure = (e: { clientX: number; clientY: number }) => {
    const r = box.current!.getBoundingClientRect();
    return { c: { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 }, w: r.width, h: r.height };
  };

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    pointerType.current = e.pointerType;
    moved.current = false;
    if (e.pointerType !== "touch") return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic pointers (tests) cannot be captured; the gesture still works inside the box.
    }
    if (pointers.current.size === 0) tap.current = { start: e.timeStamp, multi: false };
    else if (tap.current) tap.current.multi = true;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    startGesture();
  };
  /** One finger: move from here; two: pinch from here. Restarted whenever a finger is added or lifted. */
  const startGesture = () => {
    const pts = [...pointers.current.values()];
    const a = pts[0];
    if (!a) {
      gesture.current = null;
      return;
    }
    const b = pts[1] ?? a;
    const mid = measure({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 }).c;
    gesture.current = { view: current.current, mid, dist: Math.hypot(a.x - b.x, a.y - b.y) };
  };
  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === "touch") {
      if (!pointers.current.has(e.pointerId) || !gesture.current) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pts = [...pointers.current.values()];
      const g = gesture.current;
      const a = pts[0]!;
      const b = pts[1] ?? a;
      const { c: mid, w, h } = measure({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
      if (Math.hypot(mid.x - g.mid.x, mid.y - g.mid.y) > 4) moved.current = true;
      if (pts.length >= 2) {
        // The picture point that was under the fingers' midpoint stays under it.
        const s = clampTo((g.view.s * Math.hypot(a.x - b.x, a.y - b.y)) / Math.max(g.dist, 1), 1, MAX_PINCH);
        const p = { x: (g.mid.x - g.view.x) / g.view.s, y: (g.mid.y - g.view.y) / g.view.s };
        setView(clampView({ s, x: mid.x - s * p.x, y: mid.y - s * p.y }, w, h));
      } else if (g.view.s > 1) {
        setView(clampView({ s: g.view.s, x: g.view.x + mid.x - g.mid.x, y: g.view.y + mid.y - g.mid.y }, w, h));
      }
      return;
    }
    if (current.current.s > 1) {
      const { c } = measure(e);
      setView(follow(c, current.current.s));
    }
  };
  const onPointerEnd = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== "touch" || !pointers.current.delete(e.pointerId)) return;
    // A double-tap zooms ×2.5 on the point touched (it stays under the finger), the next one shows the picture whole.
    const t = tap.current;
    if (e.type === "pointerup" && pointers.current.size === 0 && t && !t.multi && !moved.current && e.timeStamp - t.start < DOUBLE_TAP.ms) {
      const at = { x: e.clientX, y: e.clientY };
      const prev = lastTap.current;
      if (prev && e.timeStamp - prev.time < DOUBLE_TAP.ms && Math.hypot(at.x - prev.at.x, at.y - prev.at.y) < DOUBLE_TAP.px) {
        lastTap.current = null;
        glide();
        setView(current.current.s > 1 ? WHOLE : follow(measure(e).c, LIGHTBOX_ZOOM));
        return startGesture();
      }
      lastTap.current = { time: e.timeStamp, at };
    }
    // A pinch let go just above ×1 settles on the whole picture.
    if (pointers.current.size === 0 && current.current.s < 1.05 && current.current.s !== 1) {
      glide();
      setView(WHOLE);
    }
    startGesture();
  };
  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    // Phones zoom with the fingers and the double-tap: a single tap does nothing (beside the picture, it closes).
    if (e.detail !== 0 && pointerType.current === "touch") return;
    if (moved.current) return;
    glide();
    if (current.current.s > 1) return setView(WHOLE);
    // Keyboard (detail 0): the centre; mouse: where it points.
    setView(e.detail === 0 ? { s: LIGHTBOX_ZOOM, x: 0, y: 0 } : follow(measure(e).c, LIGHTBOX_ZOOM));
  };
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const dir = { ArrowLeft: [1, 0], ArrowRight: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    if (!dir || current.current.s <= 1) return;
    e.preventDefault();
    const r = box.current!.getBoundingClientRect();
    const v = current.current;
    setView(clampView({ s: v.s, x: v.x + dir[0]! * PAN_STEP * r.width, y: v.y + dir[1]! * PAN_STEP * r.height }, r.width, r.height));
  };

  const zoomed = view.s > 1;
  // Fits the screen: the full width inside the gutters, or the height inside --pad-y, whichever is smaller.
  const size = { aspectRatio: ratio, width: `min(100%, calc((100dvh - 2 * var(--pad-y)) * ${ratio}))` };
  if (status === "error") {
    return (
      <div role="alert" className="flex flex-col items-center justify-center gap-8 bg-surface-muted p-24 text-center" style={size}>
        <span>The picture did not load.</span>
        <Button variant="text" onClick={() => { setLoaded("loading"); setAttempt((n) => n + 1); }}>Try again</Button>
      </div>
    );
  }
  return (
    <button
      ref={box}
      type="button"
      data-zoom={zoomed ? "in" : "out"}
      aria-label={zoomed ? "Zoom out" : "Zoom in"}
      aria-busy={status === "loading" || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={cn(
        "relative block shrink-0 touch-none overflow-hidden bg-surface-muted outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-fg",
        zoomed ? "cursor-zoom-out" : "cursor-zoom-in",
      )}
      style={size}
    >
      <span
        key={attempt}
        data-zoom-layer
        className={cn("absolute inset-0 block transition-opacity duration-base ease-standard", status === "loading" && "opacity-0")}
        style={{
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})`,
          transition: animate ? `transform ${duration.base}ms ${ease.standard}, opacity ${duration.base}ms ${ease.standard}` : undefined,
        }}
      >
        {children}
      </span>
    </button>
  );
}
