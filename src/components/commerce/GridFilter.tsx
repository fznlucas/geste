"use client";

import { cn } from "@/lib/cn";
import { Segmented } from "../primitives/Segmented";

export interface GridFilterProps<V extends string> {
  /** "Level", "Palette", "Orientation", "Size" */
  label: string;
  value: V;
  options: Array<{ value: V; label: string }>;
  onChange: (v: V) => void;
  /** Phone label column, wide enough for the longest label of the row: "w-56" (Shop), "w-88" ("Orientation"). */
  labelWidth?: "w-56" | "w-88";
}

/** One filter of a grid (boards Shop, MShop; /prints): Stone label, then text segments. Fixed label column on phones so rows align. */
export function GridFilter<V extends string>({ label, value, options, onChange, labelWidth = "w-56" }: GridFilterProps<V>) {
  return (
    <div className="flex items-center gap-12 lg:gap-14">
      <span className={cn(labelWidth, "shrink-0 text-fg-muted lg:w-auto")}>{label}</span>
      <Segmented<V> label={label} value={value} options={options} onChange={onChange} gap="gap-x-12 lg:gap-x-14" />
    </div>
  );
}
