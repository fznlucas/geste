import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** /prints gallery and /prints/[slug]: filters, sizes, to scale, and the guide + print bundle in the cart (docs/screens/store.md §Prints). */


async function expectNoAxeViolations(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(r.violations.map((v) => v.id)).toEqual([]);
}

test("gallery: every edition, filters in the URL, sold out last", async ({ page }) => {
  await page.goto("/prints/");
  await expect(page.getByText("45 prints")).toBeVisible();
  const cards = page.locator("main a[href*='/prints/n']");
  await expect(cards.last()).toHaveAttribute("aria-label", /sold out/);

  await page.getByRole("radio", { name: "Landscape" }).click();
  await expect(page).toHaveURL(/orientation=landscape/);
  await expect(page.getByText("9 prints")).toBeVisible();

  await page.getByRole("radio", { name: "L", exact: true }).click();
  await expect(page).toHaveURL(/size=l/);
  await expect(page.getByText("3 prints")).toBeVisible();
  await expect(cards.first()).toHaveAttribute("aria-label", /N°01 print, size L/);
  await expectNoAxeViolations(page);
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
