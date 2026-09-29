/** Domain types shared by components. Mirror of supabase/migrations/0001_init.sql (+ 0003). */
import type { Orientation } from "./pricing";

export type { Orientation };
export type Level = "beginner" | "intermediate" | "advanced" | "custom";
export type Format = "30x40" | "40x50" | "60x80" | "80x100";
export type WorkStatus = "draft" | "scheduled" | "live" | "archived";

export interface Work {
  id: string;
  number: string; // "N°03"
  slug: string; // "n03"
  imageUrl: string;
  imageAlt: string;
  /** Landscape works are shown landscape; in grids they sit whole in the same 4:5 frame. */
  orientation: Orientation;
  /** "Signature" works: noted on the card. */
  signature?: boolean;
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
  /** Of the work in `imageUrl` (landscape thumbs are turned). */
  orientation?: Orientation;
  unitPriceCents: number;
  quantity: number;
  /** Bundle discount on the whole line (guide + print of the same work). */
  discountCents?: number;
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
