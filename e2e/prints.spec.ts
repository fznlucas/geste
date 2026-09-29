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

/** Rows of a justified grid: the image (or sheet) boxes of its items grouped by top edge, with the grid's box. */
async function gridRows(page: Page) {
  return page.locator("main [data-grid-item]").first().locator("xpath=..").evaluate((grid) => {
    const g = grid.getBoundingClientRect();
    const boxes = Array.from(grid.querySelectorAll(":scope > [data-grid-item]")).map((item) => {
      const r = item.querySelector("a > span")!.getBoundingClientRect();
      return { left: r.left, right: r.right, top: Math.round(r.top), height: r.height };
    });
    const rows: Array<typeof boxes> = [];
    for (const b of boxes) {
      const row = rows.find((x) => x[0]!.top === b.top);
      if (row) row.push(b);
      else rows.push([b]);
    }
    return { left: g.left, right: g.right, rows };
  });
}

for (const path of ["/shop/", "/prints/"]) {
  test(`${path}: justified rows, left and right edges on the content, equal gaps`, async ({ page }) => {
    await page.goto(path);
    const { left, right, rows } = await gridRows(page);
    const desktop = (page.viewportSize()?.width ?? 1440) >= 1200;
    expect(rows.flat()).toHaveLength(15);
    for (const row of rows) {
      const h = row[0]!.height;
      for (const b of row) expect(Math.abs(b.height - h)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(row[0]!.left - left)).toBeLessThanOrEqual(0.5);
      const gaps = row.slice(1).map((b, k) => b.left - row[k]!.right);
      for (const g of gaps) expect(Math.abs(g - (desktop ? 40 : 14))).toBeLessThanOrEqual(0.5);
      if (desktop && h > 279.5) {
        // Guard-rail: a row that would be taller than 280 px stays at 280, left-aligned (docs/decisions.md).
        expect(Math.abs(h - 280)).toBeLessThanOrEqual(0.5);
        continue;
      }
      expect(Math.abs(row[row.length - 1]!.right - right)).toBeLessThanOrEqual(0.5);
      if (desktop) {
        expect(row).toHaveLength(5);
        expect(h).toBeGreaterThanOrEqual(190);
      } else {
        // Phones: a landscape work alone on the full width, portraits in pairs.
        expect(row.length === 1 ? row[0]!.right - row[0]!.left > row[0]!.height : row.length === 2).toBe(true);
      }
    }
  });
}

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
