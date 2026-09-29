/** Web app manifest of the guide reader (docs/screens/reader.md §PWA; icons from BrandFavicon, scripts/brand-icons.ts). */
import type { MetadataRoute } from "next";
import tokens from "../../tokens/tokens.json" with { type: "json" };
import { BASE_PATH } from "@/lib/asset";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: `${BASE_PATH}/learn/`,
    name: "Geste",
    short_name: "Geste",
    description: "Three layers, step by step, on your phone. Even offline.",
    start_url: `${BASE_PATH}/learn/`,
    scope: `${BASE_PATH}/learn/`,
    display: "standalone",
    background_color: tokens.brand.paper.$value,
    theme_color: tokens.brand.ink.$value,
    icons: [
      { src: `${BASE_PATH}/icons/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${BASE_PATH}/icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      // The letter stays inside the 80 % safe zone, so the same square works as a maskable icon.
      { src: `${BASE_PATH}/icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
