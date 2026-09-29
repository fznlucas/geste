// Tailwind CSS v3 preset (only if the project uses v3; v4 uses tokens/theme.css).
import type { Config } from "tailwindcss";

const px = (n: number) => `${n}px`;
const spacing = Object.fromEntries([0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32, 40, 48, 56, 64, 72, 80].map((n) => [n, px(n)]));

const preset: Partial<Config> = {
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      "bg": "var(--color-bg)",
      "surface": "var(--color-surface)",
      "surface-muted": "var(--color-surface-muted)",
      "surface-sunk": "var(--color-surface-sunk)",
      "surface-hover": "var(--color-surface-hover)",
      "fg": "var(--color-fg)",
      "fg-muted": "var(--color-fg-muted)",
      "fg-inverse": "var(--color-fg-inverse)",
      "fg-muted-on-dark": "var(--color-fg-muted-on-dark)",
      "fg-muted-print": "var(--color-fg-muted-print)",
      "border": "var(--color-border)",
      "border-field": "var(--color-border-field)",
      "border-dashed": "var(--color-border-dashed)",
      "action-hover": "var(--color-action-hover)",
      "danger": "var(--color-danger)",
      scrim: "var(--color-scrim)",
      "scrim-sheet": "var(--color-scrim-sheet)",
    },
    fontFamily: { mono: ["var(--font-mono)"], sans: ["var(--font-mono)"] },
    fontSize: {
      "xs": ["12px", { lineHeight: "20px", fontWeight: "400" }],
      "sm": ["14px", { lineHeight: "22px", fontWeight: "400" }],
      "body": ["14px", { lineHeight: "24px", fontWeight: "400" }],
      "code": ["16px", { lineHeight: "20px", fontWeight: "400" }],
      "md": ["22px", { lineHeight: "30px", fontWeight: "500" }],
      "reader": ["22px", { lineHeight: "34px", fontWeight: "400" }],
      "lg": ["28px", { lineHeight: "1.2", fontWeight: "500" }],
      "xl": ["40px", { lineHeight: "1.2", fontWeight: "500" }],
      "timer": ["64px", { lineHeight: "64px", fontWeight: "400" }],
      "2xl": ["96px", { lineHeight: "96px", fontWeight: "500" }],
      "print": ["13px", { lineHeight: "1.6", fontWeight: "400" }],
      "print-sm": ["12px", { lineHeight: "16px", fontWeight: "400" }],
      sheet: ["clamp(9px, var(--sheet-type, 3.6cqw), 12px)", { lineHeight: "1.2", fontWeight: "400" }],
      "print-h2": ["20px", { lineHeight: "1.3", fontWeight: "500" }],
      "print-title": ["40px", { lineHeight: "1.1", fontWeight: "500" }],
      "admin-title": ["20px", { lineHeight: "24px", fontWeight: "500" }],
      stat: ["24px", { lineHeight: "1.2", fontWeight: "400" }],
    },
    spacing,
    borderRadius: { none: "0", bar: "3px", full: "9999px" },
    boxShadow: { none: "none", pop: "var(--shadow-pop)", modal: "var(--shadow-modal)", mat: "var(--shadow-mat)", "mat-sm": "var(--shadow-mat-sm)", card: "var(--shadow-card)", "card-sm": "var(--shadow-card-sm)" },
    screens: { md: "768px", lg: "1200px" },
    extend: {
      transitionTimingFunction: { standard: "var(--ease-standard)", pen: "var(--ease-pen)" },
      transitionDuration: { fast: "150ms", base: "240ms", step: "320ms", morph: "380ms", panel: "420ms" },
      zIndex: { sticky: "10", popover: "20", drawer: "30", modal: "40", toast: "50" },
    },
  },
};
export default preset;
