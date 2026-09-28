/** Sample content for N°03 · 60×80 · Intermediate · Original — seed data and Storybook fixture.
 * In production this comes from guide_layers.diagram and guide_steps (see supabase/seed.sql). */
import type { DiagramStroke } from "./CanvasDiagram";

export const N03_STROKES: DiagramStroke[] = [
 {
  "layer": 1,
  "kind": "rect",
  "x": 24.0,
  "y": 24.0,
  "w": 552.0,
  "h": 752.0,
  "color": "#F3C9A6",
  "opacity": 0.9
 },
 {
  "layer": 1,
  "kind": "path",
  "d": "M60 260 Q180 220 300 280",
  "color": "#F0A83A",
  "width": 70,
  "opacity": 0.95
 },
 {
  "layer": 1,
  "kind": "path",
  "d": "M80 340 Q160 305 260 355",
  "color": "#F2B632",
  "width": 50,
  "opacity": 0.95
 },
 {
  "layer": 1,
  "kind": "path",
  "d": "M300 130 Q360 105 430 150",
  "color": "#E8862E",
  "width": 60,
  "opacity": 0.9
 },
 {
  "layer": 1,
  "kind": "path",
  "d": "M60 80 L200 145",
  "color": "#3FA58A",
  "width": 26,
  "opacity": 0.85
 },
 {
  "layer": 1,
  "kind": "path",
  "d": "M95 60 L240 170",
  "color": "#3FA58A",
  "width": 18,
  "opacity": 0.8
 },
 {
  "layer": 1,
  "kind": "path",
  "d": "M150 60 L270 120",
  "color": "#3FA58A",
  "width": 16,
  "opacity": 0.8
 },
 {
  "layer": 2,
  "kind": "path",
  "d": "M60 480 L300 440",
  "color": "#22A6C9",
  "width": 60,
  "opacity": 0.95
 },
 {
  "layer": 2,
  "kind": "path",
  "d": "M50 545 L320 505",
  "color": "#8FD0E2",
  "width": 50,
  "opacity": 0.95
 },
 {
  "layer": 2,
  "kind": "path",
  "d": "M70 605 L280 565",
  "color": "#22A6C9",
  "width": 55,
  "opacity": 0.95
 },
 {
  "layer": 2,
  "kind": "path",
  "d": "M60 665 L300 705",
  "color": "#3FA58A",
  "width": 40,
  "opacity": 0.9
 },
 {
  "layer": 2,
  "kind": "path",
  "d": "M100 470 L180 625",
  "color": "#8FD0E2",
  "width": 14,
  "opacity": 0.9
 },
 {
  "layer": 2,
  "kind": "path",
  "d": "M160 460 L240 640",
  "color": "#8FD0E2",
  "width": 12,
  "opacity": 0.9
 },
 {
  "layer": 2,
  "kind": "path",
  "d": "M380 70 L560 70",
  "color": "#2B4DA8",
  "width": 110,
  "opacity": 0.92
 },
 {
  "layer": 2,
  "kind": "path",
  "d": "M400 170 L560 205",
  "color": "#2B4DA8",
  "width": 80,
  "opacity": 0.9
 },
 {
  "layer": 2,
  "kind": "path",
  "d": "M390 70 L410 330",
  "color": "#22294A",
  "width": 70,
  "opacity": 0.95
 },
 {
  "layer": 2,
  "kind": "path",
  "d": "M440 90 L475 300",
  "color": "#22294A",
  "width": 36,
  "opacity": 0.95
 },
 {
  "layer": 2,
  "kind": "path",
  "d": "M44 330 L44 250 Q60 190 200 182 Q320 175 400 232",
  "color": "#1F2433",
  "width": 14,
  "opacity": 1
 },
 {
  "layer": 3,
  "kind": "path",
  "d": "M320 420 Q420 400 560 432",
  "color": "#F7F3EE",
  "width": 40,
  "opacity": 0.6
 },
 {
  "layer": 3,
  "kind": "path",
  "d": "M300 522 L560 522",
  "color": "#F7F3EE",
  "width": 30,
  "opacity": 0.5
 },
 {
  "layer": 3,
  "kind": "path",
  "d": "M332 478 L312 642",
  "color": "#E8862E",
  "width": 10,
  "opacity": 0.95
 },
 {
  "layer": 3,
  "kind": "path",
  "d": "M470 560 L480 702",
  "color": "#E8862E",
  "width": 12,
  "opacity": 0.95
 },
 {
  "layer": 3,
  "kind": "path",
  "d": "M420 522 L560 542",
  "color": "#1F2433",
  "width": 12,
  "opacity": 1
 },
 {
  "layer": 3,
  "kind": "path",
  "d": "M432 580 L462 742",
  "color": "#22294A",
  "width": 18,
  "opacity": 1
 },
 {
  "layer": 3,
  "kind": "path",
  "d": "M480 602 Q540 582 560 622",
  "color": "#1F2433",
  "width": 10,
  "opacity": 1
 },
 {
  "layer": 3,
  "kind": "path",
  "d": "M522 545 L522 602",
  "color": "#1F2433",
  "width": 3,
  "opacity": 1
 }
];

export const N03_LAYERS = [
 {
  "n": "01",
  "t": "Underlayer",
  "time": "30 min, then dry 30 min",
  "brush": "50 mm flat",
  "plate": [
   [
    "#F3C9A6",
    "Peach ground"
   ],
   [
    "#F0A83A",
    "Warm yellow"
   ],
   [
    "#F2B632",
    "Yellow"
   ],
   [
    "#E8862E",
    "Orange"
   ],
   [
    "#3FA58A",
    "Sea green"
   ]
  ],
  "steps": [
   "Cover most of the canvas with the peach ground in wide, loose strokes. Leave a few gaps of raw canvas near the edges.",
   "While it is still wet, brush the warm yellow across the left side, a little above the middle. Two or three strokes, slightly curved.",
   "Add a patch of orange at the top, in the middle. It will peek through later.",
   "With the edge of the brush, scratch a few diagonal strokes of sea green in the top left corner.",
   "Wash the brush. Let it dry: 30 minutes, or 10 with a hair dryer on cool."
  ],
  "tip": "Thin is good. This layer should look almost like watercolour.",
  "dry": 1800
 },
 {
  "n": "02",
  "t": "Gestures",
  "time": "45 min, then dry 45 min",
  "brush": "50 mm · 25 mm · round n°6",
  "plate": [
   [
    "#22A6C9",
    "Turquoise"
   ],
   [
    "#8FD0E2",
    "Sky"
   ],
   [
    "#3FA58A",
    "Sea green"
   ],
   [
    "#2B4DA8",
    "Ultramarine"
   ],
   [
    "#22294A",
    "Night"
   ]
  ],
  "steps": [
   "Bottom left: four wide horizontal strokes, alternating turquoise and sky. Push, do not paint twice.",
   "With the 25 mm brush, cross them with short diagonal strokes of sky. Like quick hatching.",
   "Top right: fill a large block with ultramarine, then drag night down in two vertical strokes over it.",
   "Load the round brush with night. In one breath, draw the long line from the left edge across the top.",
   "Step back two metres. If it already feels balanced, stop here and let it dry."
  ],
  "tip": "The dark line is the only moment to go slowly. Rest your little finger on the canvas edge.",
  "dry": 2700
 },
 {
  "n": "03",
  "t": "Veils & marks",
  "time": "30 min, then stop",
  "brush": "25 mm flat · round n°6",
  "plate": [
   [
    "#F7F3EE",
    "White"
   ],
   [
    "#8FD0E2",
    "Sky"
   ],
   [
    "#E8862E",
    "Orange"
   ],
   [
    "#1F2433",
    "Payne’s grey"
   ],
   [
    "#22294A",
    "Night"
   ]
  ],
  "steps": [
   "Load the 25 mm brush with white and almost no water. Drag it lightly across the middle right.",
   "Add two thin vertical sparks of orange, below the veil.",
   "With the round brush, place a few dark marks in the bottom right: a short line, a hook, a small curve.",
   "For a drip: thin a drop of night with water, touch the canvas, let gravity do the rest.",
   "Stop. Put the brushes in water and leave the room for ten minutes before deciding anything."
  ],
  "tip": "If you want to add more, add less.",
  "dry": 0
 }
] as const;
