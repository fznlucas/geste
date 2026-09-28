/** Domain types shared by components. Mirror of supabase/migrations/0001_init.sql. */
export type Level = "beginner" | "intermediate" | "advanced" | "custom";
export type Format = "30x40" | "40x50" | "60x80" | "80x100";
export type WorkStatus = "draft" | "scheduled" | "live" | "archived";

export interface Work {
  id: string;
  number: string; // "N°03"
  slug: string; // "n03"
  imageUrl: string;
  imageAlt: string;
  fromPriceCents: number;
  defaultFormat: Format;
  levelLabel: string; // "Intermediate"
  duration: string; // "3h30"
  soldOut?: boolean;
}

export interface Palette {
  id: string;
  name: string; // "Original", "Warm", "Cool", "Earth"
  swatches: string[]; // hex, paint colours are content, not UI tokens
}

export interface FormatOption {
  format: Format;
  label: string; // "60×80"
  priceCents: number;
  defaultLevel: Level;
  duration: string;
}

export interface CartItem {
  id: string;
  kind: "guide" | "print" | "gift_card";
  title: string; // "Guide N°03"
  detail: string; // "60×80 · Intermediate · Original"
  imageUrl?: string;
  unitPriceCents: number;
  quantity: number;
}

export interface PlateColour {
  hex: string;
  name: string;
}

export interface GuideStep {
  id: string; // "2c"
  layer: number; // 1..3
  layerName: string; // "Gestures"
  text: string;
  brush: string;
  plate: PlateColour[];
  tip?: string;
  drySeconds?: number; // only on the last step of a layer
}

export type StatusState = "done" | "todo" | "issue" | "off";
export type StaffRole = "owner" | "support" | "fulfilment" | "content";
