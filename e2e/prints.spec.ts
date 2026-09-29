import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** /prints gallery and /prints/[slug]: filters, sizes, to scale, and the guide + print bundle in the cart (docs/screens/store.md §Prints). */


async function expectNoAxeViolations(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(r.violations.map((v) => v.id)).toEqual([]);
}

test("gallery: one print per work, filters in the URL, a work sold out in every size last", async ({ page }) => {
  await page.goto("/prints/");
  await expect(page.getByText("15 prints")).toBeVisible();
  const cards = page.locator("main a[href^='/prints/n']");
  await expect(cards.first()).toHaveAttribute("aria-label", /^N°01 print, S, M, L, from \$55$/);
  // N°13 has sold every size: last, struck sizes, "Sold out". N°12 has only S sold out: it stays in place.
  await expect(cards.last()).toHaveAttribute("aria-label", "N°13 print, S sold out, M sold out, L sold out, Sold out");
  await expect(page.locator("main a[aria-label^='N°12 print']")).toHaveAttribute("aria-label", /S sold out, M, L, from \$95/);
  // The sheet: Sand, "N°06 · Edition of 100" and "Geste Studio" printed on it.
  await expect(page.getByText("N°06 · Edition of 100")).toBeVisible();

  await page.getByRole("radio", { name: "Landscape" }).click();
  await expect(page).toHaveURL(/orientation=landscape/);
  await expect(page.getByText("3 prints")).toBeVisible();

  await page.getByRole("radio", { name: "All", exact: true }).first().click();
  await page.getByRole("radio", { name: "L", exact: true }).click();
  await expect(page).toHaveURL(/size=l/);
  // Every work that still has an L: all but N°13.
  await expect(page.getByText("14 prints")).toBeVisible();
  await expect(cards.first()).toHaveAttribute("href", /\/prints\/n01\/?\?size=l/);
  await expectNoAxeViolations(page);
});

test("shop: the works of a row share one image height, widths follow the work", async ({ page }) => {
  await page.goto("/shop/");
  const imgs = page.locator("main a[href^='/works/'] img");
  await expect(imgs).toHaveCount(15);
  const boxes = await imgs.evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => ({ y: Math.round(r.y), h: Math.round(r.height), w: Math.round(r.width) })));
  const perRow = (page.viewportSize()?.width ?? 1440) >= 1200 ? 5 : 2;
  for (let i = 0; i + 1 < boxes.length; i++) {
    if (Math.floor(i / perRow) !== Math.floor((i + 1) / perRow)) continue;
    expect(Math.abs(boxes[i]!.h - boxes[i + 1]!.h)).toBeLessThanOrEqual(1);
    expect(boxes[i]!.y).toBe(boxes[i + 1]!.y);
  }
  // N°01 is landscape: wider than tall. Desktop rows stay within 260 px.
  expect(boxes[0]!.w).toBeGreaterThan(boxes[0]!.h);
  if (perRow === 5) for (const b of boxes) expect(b.h).toBeLessThanOrEqual(260);
});

test("print page: sizes turned for a landscape work, to scale, then the bundle in the cart", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/prints/n07/");
  await expect(page.getByText("42 × 30 cm · A3").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText("89 of 100 left")).toBeVisible();

  await page.getByRole("radio", { name: "M", exact: true }).click();
  await expect(page).toHaveURL(/size=m/);
  await expect(page.getByText("59 × 42 cm · A2").filter({ visible: true }).first()).toBeVisible();

  await page.getByRole("radio", { name: "To scale" }).click();
  await expect(page.getByRole("img", { name: /N°07 in M, 59 × 42 cm, above a 160 cm sideboard/ })).toBeVisible();
  await expectNoAxeViolations(page);

  await page.getByRole("button", { name: /Add to cart/ }).click();
  await page.goto("/works/n07/");
  await page.getByRole("button", { name: /^Add/ }).filter({ visible: true }).first().click();
  await page.goto("/cart/");
  // Guide 40×30 $15 and print M $95: −15% on both.
  await expect(page.getByText("−15% with the print")).toBeVisible();
  await expect(page.getByText("−15% with the guide")).toBeVisible();
  await expect(page.getByText("Guide + print −15%")).toBeVisible();
  await expect(page.getByText("−$16.50")).toBeVisible();
});
