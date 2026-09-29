"use client";

import type { ReactNode } from "react";
import { Segmented } from "../primitives/Segmented";
import { Button } from "../primitives/Button";
import { BUNDLE_DISCOUNT_PCT, FORMATS, LEVELS, estimatedTime, formatLabel, resolveLevel, type FormatKey, type GuideConfig, type LevelKey, type Orientation } from "@/lib/pricing";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";
import type { Palette } from "@/lib/types";

export interface GuideConfiguratorProps {
  value: GuideConfig;
  onChange: (next: GuideConfig) => void;
  palettes: Palette[];
  /** Formats the work sells (default: all four). */
  formats?: FormatKey[];
  /** The work has an S edition with copies left. Otherwise "Guide + list + print" is disabled. */
  printAvailable?: boolean;
  /** Landscape works sell the formats turned (40×30 … 100×80). */
  orientation?: Orientation;
  /** Total of the configuration, computed by the page with pricing.ts (Signature, bundle discount). */
  priceCents: number;
  onAdd: () => void;
  adding?: boolean;
  added?: boolean;
}

/**
 * Work page configurator (boards Product, MProduct), in this order:
 *   Format (cm) — "suggests Intermediate"  ·  Level — "set by format": Match format | Custom (Custom reveals the 3 levels, same price)
 *   Palette — 44 px swatch buttons, name on the right  ·  What you get — Guide + list | Guide + list + print ("−15% on both")
 *   "3 layers   ~3h30   5 colours   Intermediate"  ·  primary "Add to cart   $19" (desktop; phones use StickyBuyBar)
 * Desktop: label and note on one line above the choices. Phone: "Format (cm) · suggests Intermediate".
 * Keep the configuration in the URL (?format=&level=&palette=&print=1) so links reproduce it.
 */
export function GuideConfigurator({ value, onChange, palettes, formats = Object.keys(FORMATS) as FormatKey[], printAvailable = true, orientation = "portrait", priceCents, onAdd, adding, added }: GuideConfiguratorProps) {
  const lvl = resolveLevel(value);
  const custom = value.level !== "match";
  const palette = palettes.find((p) => p.id === value.palette) ?? palettes[0];
  // Palette colours + white.
  const colours = (palette?.swatches.length ?? 4) + 1;
  const choices = "gap-x-16 lg:gap-x-20";
  return (
    <div className="flex flex-col gap-22 lg:gap-24">
      <Row label="Format (cm)" note={`suggests ${LEVELS[FORMATS[value.format].defaultLevel].label}`}>
        <Segmented<FormatKey>
          label="Format"
          gap={choices}
          value={value.format}
          onChange={(format) => onChange({ ...value, format })}
          options={formats.map((f) => ({ value: f, label: formatLabel(f, orientation) }))}
        />
      </Row>
      <Row label="Level" note={custom ? "your choice" : "set by format"} phoneNote={false}>
        <div className="flex flex-col gap-2 lg:gap-8">
          <Segmented<"match" | "custom">
            label="Level mode"
            gap={choices}
            value={custom ? "custom" : "match"}
            onChange={(m) => onChange({ ...value, level: m === "match" ? "match" : FORMATS[value.format].defaultLevel })}
            options={[{ value: "match", label: "Match format" }, { value: "custom", label: "Custom" }]}
          />
          {custom && (
            <Segmented<LevelKey>
              label="Level"
              gap={choices}
              value={lvl}
              onChange={(level) => onChange({ ...value, level })}
              options={(Object.keys(LEVELS) as LevelKey[]).map((l) => ({ value: l, label: LEVELS[l].label }))}
            />
          )}
        </div>
      </Row>
      <Row label="Palette" note={palette?.name} noteInk gap="gap-6 lg:gap-8">
        <div role="radiogroup" aria-label="Palette" className="-ml-12 flex gap-4">
          {palettes.map((p) => {
            const on = p.id === value.palette;
            // Board: colours 1, 3 and 4 of the palette, in three stripes.
            const stripes = [p.swatches[0], p.swatches[2] ?? p.swatches[1], p.swatches[3] ?? p.swatches[2]];
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={`${p.name} palette`}
                onClick={() => onChange({ ...value, palette: p.id })}
                className="group flex size-44 items-center justify-center focus-visible:outline focus-visible:outline-1 focus-visible:outline-fg"
              >
                <span aria-hidden="true" className={cn("flex size-24 outline outline-1 outline-offset-3 lg:size-22", on ? "outline-fg" : "outline-transparent group-hover:outline-border-field")}>
                  {stripes.map((c, i) => <span key={i} className="flex-1" style={{ background: c }} />)}
                </span>
              </button>
            );
          })}
        </div>
      </Row>
      <Row label="What you get" note={value.withPrint ? `−${BUNDLE_DISCOUNT_PCT}% on both` : undefined}>
        <Segmented<"list" | "print">
          label="What you get"
          gap={choices}
          value={value.withPrint ? "print" : "list"}
          onChange={(v) => onChange({ ...value, withPrint: v === "print" })}
          options={[
            { value: "list", label: "Guide + list" },
            { value: "print", label: <><span className="lg:hidden">+ print</span><span className="hidden lg:inline">Guide + list + print</span></>, disabled: !printAvailable },
          ]}
        />
      </Row>
      <div className="flex flex-col gap-22 lg:gap-10">
        <p className="flex flex-wrap gap-x-16 text-fg-muted lg:gap-x-24">
          <span>{LEVELS[lvl].layers} layers</span>
          <span>~{estimatedTime(value)}</span>
          <span className="hidden lg:inline">{colours} colours</span>
          <span>{LEVELS[lvl].label}</span>
        </p>
        {/* Phones buy from StickyBuyBar. Button sets its own display, so the breakpoint sits on a wrapper. */}
        <div className="hidden lg:block">
          <Button onClick={onAdd} loading={adding} trailing={added ? "✓" : formatPrice(priceCents)} fullWidth>
            {added ? "Added" : "Add to cart"}
          </Button>
        </div>
        <p className="text-fg-muted">
          Digital preview. A similar original sells from $600: yours will be signed by you.
          <span className="hidden lg:inline"> Guide unlocks instantly, prints ship in 3–5 days.</span>
        </p>
      </div>
    </div>
  );
}

/**
 * Label line + choices. Desktop: label left, note right (Stone, or Ink for the palette name).
 * Phone: "Label · note" in Stone on one line; the Level note is desktop only.
 */
function Row({ label, note, noteInk, phoneNote = true, gap = "gap-2 lg:gap-8", children }: { label: string; note?: string; noteInk?: boolean; phoneNote?: boolean; gap?: string; children: ReactNode }) {
  return (
    <div className={cn("flex flex-col", gap)}>
      <span className="flex justify-between text-fg-muted">
        <span>
          {label}
          {note && phoneNote && <span className="lg:hidden"> · {note}</span>}
        </span>
        {note && <span className={cn("hidden lg:inline", noteInk && "text-fg")}>{note}</span>}
      </span>
      {children}
    </div>
  );
}
