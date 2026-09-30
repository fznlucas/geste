import { expect, test, type Page } from "@playwright/test";

/**
 * Captions under the works (Shop, Home, /prints) are one line each, as wide as their image, the price
 * never wrapped or cut (docs/decisions.md "Captions on one line"). Runs at 1440 and 390.
 */

async function checkVisibleCaptions(page: Page) {
  const problems = await page.locator("main [data-fit-line]").evaluateAll((lines) =>
    lines.flatMap((line) => {
      const box = line.getBoundingClientRect();
      const style = getComputedStyle(line);
      // Hidden at this breakpoint, or the desktop shop line before its hover morph.
      if (box.width === 0 || Number(style.opacity) === 0) return [];
      const parts = Array.from(line.children).filter((c) => !c.hasAttribute("data-fit-measure")).map((c) => c.getBoundingClientRect());
      const lineHeight = Number.parseFloat(style.lineHeight) || 20;
      const text = (line.textContent ?? "").slice(0, 40);
      const out: string[] = [];
      if (parts.some((p) => p.right > box.right + 0.5)) out.push(`${text}: wider than its image (${Math.round(box.width)} px)`);
      if (parts.some((p) => Math.abs(p.top - parts[0]!.top) > 0.5 || p.height > lineHeight * 1.5)) out.push(`${text}: more than one line`);
      return out;
    }),
  );
  expect(problems).toEqual([]);
}

const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 1440) >= 1200;

test("shop captions are one line", async ({ page }) => {
  await page.goto("/shop/");
  await page.waitForFunction(() => document.fonts.status === "loaded");
  await checkVisibleCaptions(page);
  if (isDesktop(page)) {
    // The desktop line morphs in on hover: check each card with its line shown.
    const cards = page.locator("main a[href^='/works/']");
    for (let i = 0; i < (await cards.count()); i++) {
      await cards.nth(i).hover();
      await page.waitForTimeout(100);
      await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));
      await checkVisibleCaptions(page);
    }
  }
});

test("home captions are one line", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => document.fonts.status === "loaded");
  await checkVisibleCaptions(page);
});

test("print gallery captions are one line", async ({ page }) => {
  await page.goto("/prints/");
  await page.waitForFunction(() => document.fonts.status === "loaded");
  await checkVisibleCaptions(page);
});

test("print page: other editions captions are one line", async ({ page }) => {
  await page.goto("/prints/n07/");
  await page.waitForFunction(() => document.fonts.status === "loaded");
  await checkVisibleCaptions(page);
});
