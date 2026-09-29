import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import tokens from "../../tokens/tokens.json" with { type: "json" };
import { GESTE_GLYPHS, STUDIO_GLYPHS } from "@/components/brand/logoPaths";
import { BASE_PATH } from "@/lib/asset";

/** 1200 × 630, BrandFavicon's "Link preview" drawn at 2× (its 600 × 315 frame). */
export const OG_SIZE = { width: 1200, height: 630 };

const INK = tokens.brand.ink.$value;
const PAPER = tokens.brand.paper.$value;
const STONE = tokens.brand.stone.$value;
const MIST = tokens.brand.mist.$value;

const font = (file: string) => fs.readFile(path.join(process.cwd(), "src/assets/fonts", file));

/** A public URL from `asset()` ("/<base>/mock/work-03.jpg") as a data URL read from public/ at build time. */
async function publicDataUrl(url: string): Promise<string> {
  const rel = url.slice(BASE_PATH.length).replace(/^\/+/, "");
  const data = await fs.readFile(path.join(process.cwd(), "public", rel));
  const type = rel.endsWith(".png") ? "image/png" : "image/jpeg";
  return `data:${type};base64,${data.toString("base64")}`;
}

/**
 * The link preview: wordmark, title (26 px on the board) and a Stone detail line on the left,
 * the work on the right: cropped to the half as drawn, or whole on Mist for a landscape work.
 * Built at deploy time for every work (and the site).
 */
export async function linkPreview({ title, detail, imageUrl, orientation = "portrait" }: { title: string; detail: string; imageUrl: string; orientation?: "portrait" | "landscape" }) {
  const [regular, medium, image] = await Promise.all([font("JetBrainsMono-Regular.ttf"), font("JetBrainsMono-Medium.ttf"), publicDataUrl(imageUrl)]);
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: PAPER, color: INK, fontFamily: "JetBrains Mono" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 600, padding: 56 }}>
          {/* The wordmark at 28 px (14 px on the board). */}
          <svg width="195.4" height="28" viewBox="0 -800 6980 1000">
            <g fill={INK}>
              {GESTE_GLYPHS.map((d) => (
                <path key={d.slice(0, 16)} d={d} />
              ))}
            </g>
            <g fill={STONE}>
              {STUDIO_GLYPHS.map((d) => (
                <path key={d.slice(0, 16)} d={d} />
              ))}
            </g>
          </svg>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span style={{ fontSize: 52, lineHeight: 1.2, fontWeight: 500, letterSpacing: "-0.02em" }}>{title}</span>
            <span style={{ fontSize: 24, lineHeight: "40px", color: STONE }}>{detail}</span>
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not the browser */}
        <img src={image} alt="" width={600} height={630} style={{ width: 600, height: 630, objectFit: orientation === "landscape" ? "contain" : "cover", background: MIST }} />
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "JetBrains Mono", data: regular, weight: 400, style: "normal" },
        { name: "JetBrains Mono", data: medium, weight: 500, style: "normal" },
      ],
    },
  );
}
