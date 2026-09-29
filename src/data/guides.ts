/**
 * Guides. Only N°03 · 60×80 · Intermediate has real content (supabase/seed.sql, version 1).
 * Every other work × format × level exists as a guide row so it can be bought and opened; the API
 * serves N°03's content as a stand-in for them (flagged `isStandIn`).
 */
import { FORMATS, LEVELS, type FormatKey, type LevelKey } from "@/lib/pricing";
import { works } from "./works";
import type { GuidePrintContent, GuideRow, GuideVersionRow } from "./types";

export const N03_GUIDE_ID = "00000000-0000-0000-0000-0000000000a3";

export function guideId(slug: string, format: FormatKey, level: LevelKey): string {
  return slug === "n03" && format === "60x80" && level === "intermediate" ? N03_GUIDE_ID : `guide-${slug}-${format}-${level}`;
}

export const guides: GuideRow[] = works.flatMap((w) =>
  (Object.keys(FORMATS) as FormatKey[]).flatMap((format) =>
    (Object.keys(LEVELS) as LevelKey[]).map((level) => ({
      id: guideId(w.slug, format, level),
      workId: w.id,
      format,
      level,
      currentVersion: 1,
    })),
  ),
);

/** The printed guide's own copy (Guide01–08 boards). */
const N03_PRINT: GuidePrintContent = {
  boxTools: ["Flat brush 50 mm", "Flat brush 25 mm", "Round brush n°6"],
  kitchen: ["Two jars of water: one to rinse, one clean", "A large plate as a palette", "Paper towels or an old rag", "Newspaper to protect the table", "An old t-shirt"],
  rules: [
    "Let each layer dry before the next. Touch the canvas: if it feels cool, wait.",
    "Move fast, do not scrub. One stroke, then lift the brush.",
    "Stop earlier than you think. An unfinished look is the style.",
  ],
  tubes: [
    { hex: "#F2B632", name: "Cadmium yellow" },
    { hex: "#E8862E", name: "Orange" },
    { hex: "#22A6C9", name: "Turquoise" },
    { hex: "#2B4DA8", name: "Ultramarine" },
    { hex: "#1F2433", name: "Payne's grey" },
    { hex: "#F7F3EE", name: "Titanium white" },
  ],
  mixes: [
    { name: "Peach ground", hex: "#F3C9A6", parts: [{ hex: "#E8862E", name: "1 orange" }, { hex: "#F7F3EE", name: "4 white" }, { hex: "#BFE3F0", name: "a splash of water" }] },
    { name: "Sea green", hex: "#3FA58A", parts: [{ hex: "#22A6C9", name: "2 turquoise" }, { hex: "#F2B632", name: "1 yellow" }] },
    { name: "Warm yellow", hex: "#F0A83A", parts: [{ hex: "#F2B632", name: "yellow" }, { hex: "#E8862E", name: "a touch of orange" }] },
    { name: "Sky", hex: "#8FD0E2", parts: [{ hex: "#22A6C9", name: "1 turquoise" }, { hex: "#F7F3EE", name: "2 white" }] },
    { name: "Night", hex: "#22294A", parts: [{ hex: "#1F2433", name: "Payne's grey" }, { hex: "#2B4DA8", name: "a touch of ultramarine" }] },
  ],
  mixNote: "Mix with the tip of the brush, not the whole bristle. Wipe the brush on the rag between two colours, rinse between two mixes.",
  plan: "Three layers, each one on a dry canvas. The first sets the warmth, the second places the big blue masses and the dark line, the third adds light and a few marks. Keep this page open next to you.",
  brushes: [
    { name: "50 mm flat", use: "Ground and big masses. Layers 1 and 2." },
    { name: "25 mm flat", use: "Crosshatching, veils. Layers 2 and 3." },
    { name: "Round n°6", use: "The dark line, marks, drips and your signature." },
  ],
  layers: [
    {
      summary: "Peach ground, warm yellow and sea green, top left.",
      brush: "50 mm flat",
      colour: "#F3C9A6",
      tip: "Thin is good. This layer should look almost like watercolour. If the paint feels thick, add a little water to the plate, not to the canvas.",
      steps: [
        "Cover most of the canvas with the peach ground in wide, loose strokes. Leave a few gaps of raw canvas near the edges.",
        "While it is still wet, brush the warm yellow across the left side, a little above the middle. Two or three strokes, slightly curved.",
        "Add a patch of orange at the top, in the middle. It will peek through later.",
        "With the edge of the brush, scratch a few diagonal strokes of sea green in the top left corner.",
        "Wash the brush. Let it dry: 30 minutes, or 10 with a hair dryer on cool.",
      ],
    },
    {
      summary: "Turquoise and sky bottom left, ultramarine and night top right, one dark line.",
      brush: "50 mm flat · 25 mm flat · round n°6",
      colour: "#22A6C9",
      tip: "The dark line is the only moment to go slowly. Rest your little finger on the canvas edge to steady your hand, then keep moving.",
      steps: [
        "Bottom left: four wide horizontal strokes, alternating turquoise and sky. Push, do not paint twice.",
        "With the 25 mm brush, cross them with short diagonal strokes of sky. Like quick hatching.",
        "Top right: fill a large block with ultramarine, then drag night down in two vertical strokes over it.",
        "Load the round brush with night. In one breath, draw the long line: up from the left edge, then across the top, landing in the dark mass.",
        "Step back two metres. If it already feels balanced, skip to the tip. Let it dry.",
      ],
    },
    {
      summary: "White veils in the middle, orange sparks, dark marks bottom right.",
      brush: "25 mm flat · round n°6",
      colour: "#1F2433",
      tip: "If you want to add more, add less. Most paintings are ruined in the last fifteen minutes.",
      steps: [
        "Load the 25 mm brush with white and almost no water. Drag it lightly across the middle right: it should skip over the texture.",
        "Add two thin vertical sparks of orange, below the veil.",
        "With the round brush, place a few dark marks in the bottom right: a short line, a hook, a small curve. Payne's grey, straight from the tube.",
        "For a drip: thin a drop of night with water, touch the canvas, let gravity do the rest.",
        "Stop. Put the brushes in water and leave the room for ten minutes before deciding anything.",
      ],
    },
  ],
  mud: {
    first: "#E8862E",
    second: "#22A6C9",
    mixed: "#7A6D63",
    clean: "Blue laid over dry orange. Both colours stay alive.",
    muddy: "Blue scrubbed into wet orange. They cancel into grey-brown.",
  },
  fixes: [
    { problem: "It turned grey", fix: "Let it dry completely, then paint the colour again on top, in one stroke." },
    { problem: "Too dark", fix: "A dry-brushed veil of white lifts it without covering it." },
    { problem: "Too busy", fix: "Cover one area with peach ground. Empty space makes the rest breathe." },
    { problem: "It looks unfinished", fix: "It is probably done." },
  ],
  sign: [
    "Sign bottom right with the round brush and Payne's grey. Small.",
    "Let it dry 24 hours before hanging.",
    "Photograph it by a window, in daylight, straight on.",
    "Share it with @geste.studio. Yours will not look like the preview, and that is the point.",
  ],
};

export const guideVersions: GuideVersionRow[] = [
  {
    guideId: N03_GUIDE_ID,
    version: 1,
    publishedAt: "2026-09-01T09:00:00Z",
    content: {
      layers: [
        {
          position: 1,
          name: "Underlayer",
          brush: "50 mm flat",
          plate: [
            { hex: "#F3C9A6", name: "Peach ground" },
            { hex: "#F0A83A", name: "Warm yellow" },
            { hex: "#F2B632", name: "Yellow" },
            { hex: "#E8862E", name: "Orange" },
            { hex: "#3FA58A", name: "Sea green" },
          ],
          tip: "Thin is good. This layer should look almost like watercolour.",
          minutes: 30,
          drySeconds: 1800,
          diagram: [
            { layer: 1, kind: "rect", x: 24, y: 24, w: 552, h: 752, color: "#F3C9A6", opacity: 0.9 },
            { layer: 1, kind: "path", d: "M60 260 Q180 220 300 280", color: "#F0A83A", width: 70, opacity: 0.95 },
            { layer: 1, kind: "path", d: "M80 340 Q160 305 260 355", color: "#F2B632", width: 50, opacity: 0.95 },
            { layer: 1, kind: "path", d: "M300 130 Q360 105 430 150", color: "#E8862E", width: 60, opacity: 0.9 },
            { layer: 1, kind: "path", d: "M60 80 L200 145", color: "#3FA58A", width: 26, opacity: 0.85 },
            { layer: 1, kind: "path", d: "M95 60 L240 170", color: "#3FA58A", width: 18, opacity: 0.8 },
            { layer: 1, kind: "path", d: "M150 60 L270 120", color: "#3FA58A", width: 16, opacity: 0.8 },
          ],
          steps: [
            { position: 1, text: "Cover most of the canvas with the peach ground in wide, loose strokes. Leave a few gaps of raw canvas near the edges." , brush: "50 mm flat" },
            { position: 2, text: "While it is still wet, brush the warm yellow across the left side, a little above the middle. Two or three strokes, slightly curved." , brush: "50 mm flat" },
            { position: 3, text: "Add a patch of orange at the top, in the middle. It will peek through later." , brush: "50 mm flat" },
            { position: 4, text: "With the edge of the brush, scratch a few diagonal strokes of sea green in the top left corner." , brush: "50 mm flat" },
            { position: 5, text: "Wash the brush. Let it dry: 30 minutes, or 10 with a hair dryer on cool." , brush: "—" },
          ],
        },
        {
          position: 2,
          name: "Gestures",
          brush: "50 mm · 25 mm · round n°6",
          plate: [
            { hex: "#22A6C9", name: "Turquoise" },
            { hex: "#8FD0E2", name: "Sky" },
            { hex: "#3FA58A", name: "Sea green" },
            { hex: "#2B4DA8", name: "Ultramarine" },
            { hex: "#22294A", name: "Night" },
          ],
          tip: "The dark line is the only moment to go slowly. Rest your little finger on the canvas edge.",
          minutes: 45,
          drySeconds: 2700,
          diagram: [
            { layer: 2, kind: "path", d: "M60 480 L300 440", color: "#22A6C9", width: 60, opacity: 0.95 },
            { layer: 2, kind: "path", d: "M50 545 L320 505", color: "#8FD0E2", width: 50, opacity: 0.95 },
            { layer: 2, kind: "path", d: "M70 605 L280 565", color: "#22A6C9", width: 55, opacity: 0.95 },
            { layer: 2, kind: "path", d: "M60 665 L300 705", color: "#3FA58A", width: 40, opacity: 0.9 },
            { layer: 2, kind: "path", d: "M100 470 L180 625", color: "#8FD0E2", width: 14, opacity: 0.9 },
            { layer: 2, kind: "path", d: "M160 460 L240 640", color: "#8FD0E2", width: 12, opacity: 0.9 },
            { layer: 2, kind: "path", d: "M380 70 L560 70", color: "#2B4DA8", width: 110, opacity: 0.92 },
            { layer: 2, kind: "path", d: "M400 170 L560 205", color: "#2B4DA8", width: 80, opacity: 0.9 },
            { layer: 2, kind: "path", d: "M390 70 L410 330", color: "#22294A", width: 70, opacity: 0.95 },
            { layer: 2, kind: "path", d: "M440 90 L475 300", color: "#22294A", width: 36, opacity: 0.95 },
            { layer: 2, kind: "path", d: "M44 330 L44 250 Q60 190 200 182 Q320 175 400 232", color: "#1F2433", width: 14, opacity: 1 },
          ],
          steps: [
            { position: 1, text: "Bottom left: four wide horizontal strokes, alternating turquoise and sky. Push, do not paint twice." , brush: "50 mm flat" },
            { position: 2, text: "With the 25 mm brush, cross them with short diagonal strokes of sky. Like quick hatching." , brush: "25 mm flat" },
            { position: 3, text: "Top right: fill a large block with ultramarine, then drag night down in two vertical strokes over it." , brush: "50 mm flat" },
            { position: 4, text: "Load the round brush with night. In one breath, draw the long line from the left edge across the top." , brush: "Round n°6" },
            { position: 5, text: "Step back two metres. If it already feels balanced, stop here and let it dry." , brush: "—" },
          ],
        },
        {
          position: 3,
          name: "Veils & marks",
          brush: "25 mm flat · round n°6",
          plate: [
            { hex: "#F7F3EE", name: "White" },
            { hex: "#8FD0E2", name: "Sky" },
            { hex: "#E8862E", name: "Orange" },
            { hex: "#1F2433", name: "Payne’s grey" },
            { hex: "#22294A", name: "Night" },
          ],
          tip: "If you want to add more, add less.",
          minutes: 30,
          drySeconds: 0,
          diagram: [
            { layer: 3, kind: "path", d: "M320 420 Q420 400 560 432", color: "#F7F3EE", width: 40, opacity: 0.6 },
            { layer: 3, kind: "path", d: "M300 522 L560 522", color: "#F7F3EE", width: 30, opacity: 0.5 },
            { layer: 3, kind: "path", d: "M332 478 L312 642", color: "#E8862E", width: 10, opacity: 0.95 },
            { layer: 3, kind: "path", d: "M470 560 L480 702", color: "#E8862E", width: 12, opacity: 0.95 },
            { layer: 3, kind: "path", d: "M420 522 L560 542", color: "#1F2433", width: 12, opacity: 1 },
            { layer: 3, kind: "path", d: "M432 580 L462 742", color: "#22294A", width: 18, opacity: 1 },
            { layer: 3, kind: "path", d: "M480 602 Q540 582 560 622", color: "#1F2433", width: 10, opacity: 1 },
            { layer: 3, kind: "path", d: "M522 545 L522 602", color: "#1F2433", width: 3, opacity: 1 },
          ],
          steps: [
            { position: 1, text: "Load the 25 mm brush with white and almost no water. Drag it lightly across the middle right." , brush: "25 mm flat" },
            { position: 2, text: "Add two thin vertical sparks of orange, below the veil." , brush: "Round n°6" },
            { position: 3, text: "With the round brush, place a few dark marks in the bottom right: a short line, a hook, a small curve." , brush: "Round n°6" },
            { position: 4, text: "For a drip: thin a drop of night with water, touch the canvas, let gravity do the rest." , brush: "Round n°6" },
            { position: 5, text: "Stop. Put the brushes in water and leave the room for ten minutes before deciding anything." , brush: "—" },
          ],
        },
      ],
      print: N03_PRINT,
    },
  },
];
