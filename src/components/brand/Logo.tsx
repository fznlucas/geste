"use client";

import { useEffect, useId, useRef, useState } from "react";
import { GESTE_GLYPHS, PEN_STROKES, STUDIO_GLYPHS } from "./logoPaths";
import { ease, penSchedule, prefersReducedMotion } from "@/lib/motion";

export interface LogoProps {
  /** Rendered height in px (cap box). Minimum 12. Header uses 12, footer 12, emails 24. */
  size?: number;
  /** "full" = geste.studio, "short" = geste (avatars, stamps, small spaces). */
  variant?: "full" | "short";
  /** "ink" on light grounds, "paper" on Ink. */
  tone?: "ink" | "paper";
  /** Draw the letters stroke by stroke on hover/focus of the closest link or button. Desktop only. */
  animateOnHover?: boolean;
  className?: string;
}

type Phase = "idle" | "reset" | "draw";

/**
 * The wordmark is typed, never redrawn: filled glyphs of JetBrains Mono 500.
 * The pencil animation reveals "geste" through a mask of 7 centre-line strokes
 * (stroke-dashoffset 1 -> 0 on pathLength=1). ".studio" never moves.
 */
export function Logo({ size = 12, variant = "full", tone = "ink", animateOnHover = false, className }: LogoProps) {
  const id = useId().replace(/:/g, "");
  const maskId = `geste-pen-${id}`;
  const ref = useRef<SVGSVGElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!animateOnHover || !ref.current) return;
    const host = ref.current.closest("a,button") ?? ref.current;
    const start = () => {
      if (prefersReducedMotion()) return;
      setPhase("reset");
      if (timer.current) clearTimeout(timer.current);
      // one frame at dashoffset 1 without transition, then animate to 0
      timer.current = setTimeout(() => setPhase("draw"), 40);
    };
    const stop = () => {
      if (timer.current) clearTimeout(timer.current);
      setPhase("idle");
    };
    host.addEventListener("mouseenter", start);
    host.addEventListener("focusin", start);
    host.addEventListener("mouseleave", stop);
    host.addEventListener("focusout", stop);
    return () => {
      host.removeEventListener("mouseenter", start);
      host.removeEventListener("focusin", start);
      host.removeEventListener("mouseleave", stop);
      host.removeEventListener("focusout", stop);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [animateOnHover]);

  const vbWidth = variant === "full" ? 6980 : 2900;
  const width = (vbWidth / 1000) * size;
  const ink = tone === "ink" ? "var(--color-fg)" : "var(--color-fg-inverse)";
  const grey = tone === "ink" ? "var(--color-fg-muted)" : "var(--color-fg-muted-on-dark)";

  const schedule = penSchedule(PEN_STROKES.map((s) => s.duration));
  const strokes = PEN_STROKES.map((s, i) => ({ ...s, delay: schedule[i]!.delay }));

  return (
    <svg
      ref={ref}
      width={width}
      height={size}
      viewBox={`0 -800 ${vbWidth} 1000`}
      role="img"
      aria-label={variant === "full" ? "geste.studio" : "geste"}
      className={className}
      style={{ display: "block", overflow: variant === "full" ? "visible" : "hidden" }}
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x={-200} y={-1000} width={7380} height={1400}>
          <rect x={-200} y={-1000} width={7380} height={1400} fill="#000" />
          {strokes.map((s, i) => (
            <path
              key={i}
              d={s.d}
              transform={`translate(${s.x},0) scale(1,-1)`}
              pathLength={1}
              fill="none"
              stroke="#fff"
              strokeWidth={150}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="1 2"
              style={{
                strokeDashoffset: phase === "reset" ? 1 : 0,
                transition:
                  phase === "draw" ? `stroke-dashoffset ${s.duration}ms ${ease.pen} ${s.delay}ms` : "none",
              }}
            />
          ))}
        </mask>
      </defs>
      <g mask={`url(#${maskId})`} fill={ink}>
        {GESTE_GLYPHS.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      {variant === "full" && (
        <g fill={grey}>
          {STUDIO_GLYPHS.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      )}
    </svg>
  );
}
