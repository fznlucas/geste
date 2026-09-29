import type { PlateColour } from "@/lib/types";

/** 20 px square of paint with a 1 px Line-field inset outline (so white paint shows) + the colour name (GuideReader). */
export function PlateSwatch({ colour }: { colour: PlateColour }) {
  return (
    <span className="flex items-center gap-8">
      <span aria-hidden="true" className="size-20 shrink-0 outline outline-1 -outline-offset-1 outline-border-field" style={{ background: colour.hex }} />
      <span>{colour.name}</span>
    </span>
  );
}

/** "On the plate" and the layer's colours, 10 px rows, 18 px apart (GuideReader). */
export function Plate({ colours }: { colours: PlateColour[] }) {
  return (
    <div className="flex flex-col gap-10">
      <span className="text-fg-muted">On the plate</span>
      <ul className="m-0 flex list-none flex-wrap gap-x-18 gap-y-10 p-0">
        {colours.map((c) => (
          <li key={c.name}>
            <PlateSwatch colour={c} />
          </li>
        ))}
      </ul>
    </div>
  );
}
