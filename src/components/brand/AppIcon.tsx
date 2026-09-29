import { appIconSvg } from "./appIconSvg.ts";

/** The favicon / app icon (BrandFavicon) inline, e.g. in /kit. The files themselves come from scripts/brand-icons.ts. */
export function AppIcon({ size = 32, rounded = false }: { size?: 16 | 32 | 64 | 128; rounded?: boolean }) {
  return (
    <span
      role="img"
      aria-label={`Geste app icon, ${size} px`}
      // Home screen preview: iOS / Android round the square file (28 px radius at 128 on the board).
      className="block overflow-hidden"
      style={{ width: size, height: size, borderRadius: rounded ? (size * 28) / 128 : 0 }}
      dangerouslySetInnerHTML={{ __html: appIconSvg(size) }}
    />
  );
}
