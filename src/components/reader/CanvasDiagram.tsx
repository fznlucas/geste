export interface DiagramStroke {
  layer: number;
  kind: "rect" | "path";
  d?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  color: string; // paint colour: content, not a UI token
  width?: number;
  opacity: number;
}

export interface CanvasDiagramProps {
  strokes: DiagramStroke[];
  /** Draw layers 1..upTo. */
  upTo: number;
  /** Layer being painted: full strength. Earlier layers fade to 30% so the new strokes read. */
  current?: number;
  width?: number;
  className?: string;
}

/**
 * The plan of the canvas, drawn in a 600×800 viewBox (3:4 like 60×80 / 30×40) on white with a 2 px Ink frame.
 * Same component in the reader, the PDF (server-rendered to SVG) and the admin guide editor.
 */
export function CanvasDiagram({ strokes, upTo, current, width = 420, className }: CanvasDiagramProps) {
  const h = Math.round((width * 800) / 600);
  return (
    <svg width={width} height={h} viewBox="0 0 600 800" role="img" aria-label={`Diagram of the canvas after layer ${upTo}`} className={className} style={{ display: "block", maxWidth: "100%", height: "auto" }}>
      <rect x={0} y={0} width={600} height={800} fill="#FFFFFF" stroke="var(--color-fg)" strokeWidth={2} />
      {strokes
        .filter((s) => s.layer <= upTo)
        .map((s, i) => {
          const o = s.opacity * (current !== undefined && s.layer !== current ? 0.3 : 1);
          return s.kind === "rect" ? (
            <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} fill={s.color} opacity={o} />
          ) : (
            <path key={i} d={s.d} fill="none" stroke={s.color} strokeWidth={s.width} strokeLinecap="round" strokeLinejoin="round" opacity={o} />
          );
        })}
    </svg>
  );
}
