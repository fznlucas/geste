import type { ReactNode, SVGProps } from "react";

/**
 * Geste icon set — 20 icons drawn on a 12 px grid with the stroke of JetBrains Mono at 12 px:
 * 1.1 px, flat (butt) ends, sharp (miter) corners, round only where letters are round.
 * Always currentColor. Sizes: 12 (UI), 16, 24, 48 (illustration).
 */
const PATHS = {
  "account": (
    <><rect x="4.1" y="0.9" width="3.8" height="4.6" rx="1.9"/><path d="M2.2 11.1v-1.3c0-1.3 1-2.3 2.3-2.3h3c1.3 0 2.3 1 2.3 2.3v1.3"/></>
  ),
  "cart": (
    <><path d="M0.8 1.4h1.4l1.3 6.2h5.9l1.3-4.4H2.7"/><circle cx="4.3" cy="10.1" r="0.8"/><circle cx="8.8" cy="10.1" r="0.8"/></>
  ),
  "close": (
    <><path d="M2.2 2.2L9.8 9.8M9.8 2.2L2.2 9.8"/></>
  ),
  "menu": (
    <><path d="M1 4.2H11M1 7.8H11"/></>
  ),
  "arrow-right": (
    <><path d="M1.5 6H10.3M6.8 2.5L10.3 6L6.8 9.5"/></>
  ),
  "arrow-left": (
    <><path d="M10.5 6H1.7M5.2 2.5L1.7 6L5.2 9.5"/></>
  ),
  "check": (
    <><path d="M1.8 6.3L4.6 9.1L10.2 2.9"/></>
  ),
  "plus": (
    <><path d="M6 1.5V10.5M1.5 6H10.5"/></>
  ),
  "minus": (
    <><path d="M1.5 6H10.5"/></>
  ),
  "search": (
    <><rect x="1.4" y="1.4" width="7.2" height="7.2" rx="3.6"/><path d="M7.7 7.7L10.8 10.8"/></>
  ),
  "show": (
    <><path d="M0.8 6C2.3 3.4 4 2.4 6 2.4S9.7 3.4 11.2 6C9.7 8.6 8 9.6 6 9.6S2.3 8.6 0.8 6Z"/><rect x="4.3" y="4.3" width="3.4" height="3.4" rx="1.7"/></>
  ),
  "lock": (
    <><rect x="2" y="5.4" width="8" height="5.4"/><path d="M3.9 5.4V3.9C3.9 2.7 4.8 1.8 6 1.8S8.1 2.7 8.1 3.9V5.4"/></>
  ),
  "play": (
    <><path d="M3 1.8L10 6L3 10.2Z"/></>
  ),
  "pause": (
    <><path d="M4 2V10M8 2V10"/></>
  ),
  "timer": (
    <><rect x="1.8" y="2.6" width="8.4" height="8.4" rx="4.2"/><path d="M6 4.6V6.8L7.5 8.1M4.5 0.9H7.5"/></>
  ),
  "print": (
    <><path d="M3 4V1.2H9V4M3 8.6H1V4H11V8.6H9"/><path d="M3 6.8H9V10.8H3Z"/></>
  ),
  "download": (
    <><path d="M6 1.2V7.8M3 5L6 8L9 5M1.2 10.6H10.8"/></>
  ),
  "external": (
    <><path d="M5 1.8H1.8V10.2H10.2V7M7 1.8H10.2V5M10.2 1.8L5.4 6.6"/></>
  ),
  "brush": (
    <><path d="M10.6 1.4L6 6"/><path d="M6 6C4.2 5.6 2.8 6.6 2.7 8.2C2.6 9.4 2 10.2 1.2 10.7C3.8 11.2 6.4 10 6.2 7.6Z"/></>
  ),
  "palette": (
    <><path d="M6 1.2C2.9 1.2 1 3.3 1 6S3 10.8 5.6 10.8C6.6 10.8 6.8 10 6.4 9.2C6 8.4 6.5 7.6 7.4 7.6H9C10.2 7.6 11 6.8 11 5.6C11 3.1 8.9 1.2 6 1.2Z"/><rect x="3" y="4.6" width="1.4" height="1.4"/><rect x="5.3" y="3" width="1.4" height="1.4"/><rect x="7.6" y="4" width="1.4" height="1.4"/></>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;
export const ICON_NAMES = Object.keys(PATHS) as IconName[];

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: 12 | 16 | 24 | 48;
  /** Accessible name. Omit when the icon sits next to visible text (it is then aria-hidden). */
  label?: string;
}

export function Icon({ name, size = 12, label, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.1}
      strokeLinecap="butt"
      strokeLinejoin="miter"
      strokeMiterlimit={4}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
