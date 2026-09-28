"use client";

import { Segmented } from "../primitives/Segmented";
import { Button } from "../primitives/Button";
import { FORMATS, LEVELS, PRINT_A3_PRICE, estimatedTime, materialsEstimateUsd, resolveLevel, totalCents, type FormatKey, type GuideConfig, type LevelKey } from "@/lib/pricing";
import { formatPrice } from "@/lib/format";
import type { Palette } from "@/lib/types";

export interface GuideConfiguratorProps {
  value: GuideConfig;
  onChange: (next: GuideConfig) => void;
  palettes: Palette[];
  onAdd: () => void;
  adding?: boolean;
  added?: boolean;
}

/**
 * Product page right column (boards Product, MProduct), in this order:
 *   Format (cm) — "suggests Intermediate"  ·  Level — "set by format": Match format | Custom (Custom reveals the 3 levels)
 *   Palette — swatch chips  ·  What you get — Guide + list | Guide + list + print
 *   Summary "3 layers · ~3h30 · 5 colours · Intermediate"  ·  primary "Add to cart   $19"
 * The Buy button must stay above the fold at 1440×900 and 390×844: details live in the Accordion below.
 * Keep the configuration in the URL (?format=&level=&palette=&print=1) so links reproduce it.
 */
export function GuideConfigurator({ value, onChange, palettes, onAdd, adding, added }: GuideConfiguratorProps) {
  const lvl = resolveLevel(value);
  const custom = value.level !== "match";
  const colours = palettes.find((p) => p.id === value.palette)?.swatches.length ?? 4;
  return (
    <div className="flex flex-col gap-20">
      <Row label="Format (cm)" note={`suggests ${LEVELS[FORMATS[value.format].defaultLevel].label}`}>
        <Segmented<FormatKey>
          label="Format"
          value={value.format}
          onChange={(format) => onChange({ ...value, format })}
          options={(Object.keys(FORMATS) as FormatKey[]).map((f) => ({ value: f, label: FORMATS[f].label }))}
        />
      </Row>
      <Row label="Level" note={custom ? "your choice" : "set by format"}>
        <div className="flex flex-col gap-6">
          <Segmented<"match" | "custom">
            label="Level mode"
            value={custom ? "custom" : "match"}
            onChange={(m) => onChange({ ...value, level: m === "match" ? "match" : FORMATS[value.format].defaultLevel })}
            options={[{ value: "match", label: "Match format" }, { value: "custom", label: "Custom" }]}
          />
          {custom && (
            <Segmented<LevelKey>
              label="Level"
              value={lvl}
              onChange={(level) => onChange({ ...value, level })}
              options={(Object.keys(LEVELS) as LevelKey[]).map((l) => ({ value: l, label: LEVELS[l].label, note: LEVELS[l].surcharge ? `+${formatPrice(LEVELS[l].surcharge)}` : undefined }))}
            />
          )}
        </div>
      </Row>
      <Row label="Palette">
        <div role="radiogroup" aria-label="Palette" className="flex flex-wrap gap-8">
          {palettes.map((p) => {
            const on = p.id === value.palette;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={`${p.name} palette`}
                onClick={() => onChange({ ...value, palette: p.id })}
                className={`flex min-h-32 items-center gap-6 px-6 outline outline-1 ${on ? "outline-fg" : "outline-transparent hover:outline-border-field"}`}
              >
                <span className="flex" aria-hidden="true">
                  {p.swatches.slice(0, 3).map((c) => (
                    <span key={c} className="size-12" style={{ background: c }} />
                  ))}
                </span>
                <span className={on ? "text-fg" : "text-fg-muted"}>{p.name}</span>
              </button>
            );
          })}
        </div>
      </Row>
      <Row label="What you get">
        <Segmented<"list" | "print">
          label="What you get"
          value={value.withPrint ? "print" : "list"}
          onChange={(v) => onChange({ ...value, withPrint: v === "print" })}
          options={[{ value: "list", label: "Guide + list" }, { value: "print", label: "Guide + list + print", note: `+${formatPrice(PRINT_A3_PRICE)}` }]}
        />
      </Row>
      <p className="text-fg-muted">
        {LEVELS[lvl].layers} layers · ~{estimatedTime(value)} · {colours + 1} colours · {LEVELS[lvl].label}
      </p>
      <Button onClick={onAdd} loading={adding} trailing={added ? "✓" : formatPrice(totalCents(value))} fullWidth>
        {added ? "Added" : "Add to cart"}
      </Button>
      <p className="text-fg-muted">
        Digital preview. Guide unlocks instantly{value.withPrint ? ", prints ship in 3–5 days" : ""}. Materials ~${materialsEstimateUsd(value)} at partner stores.
      </p>
    </div>
  );
}

function Row({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[112px_1fr] items-start gap-12">
      <span className="flex min-h-32 flex-col justify-center leading-[16px]">
        <span className="text-fg-muted">{label}</span>
        {note && <span className="text-fg-muted opacity-80">{note}</span>}
      </span>
      {children}
    </div>
  );
}
