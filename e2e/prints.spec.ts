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
  // The caption printed on the sheet shows only at 9 px or more: not at gallery size (it is in the card's caption).
  await expect(page.getByText("N°06 · Edition of 100")).toBeHidden();

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

test("shop and /prints: one image height for the whole grid, widths follow the work", async ({ page }) => {
  const heights = async (selector: string) =>
    page.locator(selector).evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => ({ h: Math.round(r.height * 2) / 2, w: Math.round(r.width) })));
  await page.goto("/shop/");
  const works = await heights("main a[href^='/works/'] img");
  expect(works).toHaveLength(15);
  // Every work exactly the same height (±0.5 px of rounding), N°01 (landscape) wider than tall.
  for (const b of works) expect(Math.abs(b.h - works[0]!.h)).toBeLessThanOrEqual(0.5);
  expect(works[0]!.w).toBeGreaterThan(works[0]!.h);
  if ((page.viewportSize()?.width ?? 1440) >= 1200) expect(works[0]!.h).toBeLessThanOrEqual(260);

  await page.goto("/prints/");
  const sheets = await heights("main a[href^='/prints/n'] > span:first-child");
  expect(sheets).toHaveLength(15);
  for (const b of sheets) expect(Math.abs(b.h - sheets[0]!.h)).toBeLessThanOrEqual(0.5);
});

test("print page: sizes turned for a landscape work, to scale, then the bundle in the cart", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/prints/n07/");
  await expect(page.getByText("42 × 30 cm · A3").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText("89 of 100 left")).toBeVisible();
  // The print page's sheet always carries its printed caption.
  await expect(page.getByText("N°07 · 12/100").first()).toBeVisible();

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
