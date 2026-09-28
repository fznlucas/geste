import type { PlateColour } from "@/lib/types";

/** 14 px square of paint with a 1 px #D8D3CC inset outline (so white paint shows) + the colour name. */
export function PlateSwatch({ colour }: { colour: PlateColour }) {
  return (
    <span className="inline-flex items-center gap-6">
      <span aria-hidden="true" className="size-14 outline outline-1 -outline-offset-1 outline-border-field" style={{ background: colour.hex }} />
      {colour.name}
    </span>
  );
}

export function Plate({ colours }: { colours: PlateColour[] }) {
  return (
    <div className="flex flex-wrap gap-x-12 gap-y-6" aria-label="On the plate">
      {colours.map((c) => (
        <PlateSwatch key={c.name} colour={c} />
      ))}
    </div>
  );
}
