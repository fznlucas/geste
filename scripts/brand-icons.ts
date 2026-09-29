// Writes the favicon and app icons of BrandFavicon from src/components/brand/appIconSvg.ts.
// Run after changing the icon: `node scripts/brand-icons.ts` (needs Chrome for Playwright), then commit the files.
//   src/app/icon.svg          browsers that take an SVG favicon (drawn at 32 px)
//   src/app/favicon.ico       16, 32 and 48 px
//   src/app/apple-icon.png    180 px (iOS rounds the corners itself)
//   public/icons/icon-*.png   192 and 512 px for the web app manifest ("any maskable": the letter
//                             stays inside the 80 % safe zone)
import fs from "node:fs";
import { chromium } from "@playwright/test";
import { appIconSvg } from "../src/components/brand/appIconSvg.ts";

const root = new URL("..", import.meta.url).pathname;
const out = (p: string) => `${root}${p}`;

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ deviceScaleFactor: 1 });

async function png(size: number): Promise<Buffer> {
  // Drawn on a canvas: its PNGs are RGBA (an .ico must hold RGBA images; screenshots come out RGB).
  const url = await page.evaluate(async (svg) => {
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext("2d")!.drawImage(img, 0, 0);
    return canvas.toDataURL("image/png");
  }, appIconSvg(size));
  return Buffer.from(url.split(",")[1]!, "base64");
}

/** An .ico holding PNG images (supported everywhere since Windows Vista). */
function ico(images: { size: number; data: Buffer }[]): Buffer {
  const head = Buffer.alloc(6 + 16 * images.length);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(images.length, 4);
  let offset = head.length;
  images.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(size % 256, e);
    head.writeUInt8(size % 256, e + 1);
    head.writeUInt16LE(1, e + 4);
    head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(data.length, e + 8);
    head.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([head, ...images.map((i) => i.data)]);
}

fs.mkdirSync(out("public/icons"), { recursive: true });
fs.writeFileSync(out("src/app/icon.svg"), appIconSvg(32) + "\n");
const small = [];
for (const size of [16, 32, 48]) small.push({ size, data: await png(size) });
fs.writeFileSync(out("src/app/favicon.ico"), ico(small));
fs.writeFileSync(out("src/app/apple-icon.png"), await png(180));
for (const size of [192, 512]) fs.writeFileSync(out(`public/icons/icon-${size}.png`), await png(size));

await browser.close();
console.log("icons written");
