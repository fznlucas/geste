import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Formats by work (docs/decisions.md "Formats by work", "Product pictures to scale"): the work page draws
 * the selected canvas, and the print page the sheet, in centimetres on a scale common to the catalog,
 * inside a ground that never changes size. And the "Simplified version" below a work's base level.
 */

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1440) < 1200;

/** Box of an element once its size transition is over. */
async function settledBox(locator: Locator) {
  await locator.page().waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

async function canvasOf(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
  return { canvas: await settledBox(page.locator("[data-canvas]")), stage: await settledBox(page.locator("[data-stage]")) };
}

async function sheetOf(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
  return { sheet: await settledBox(page.locator("[data-sheet]")), stage: await settledBox(page.locator("[data-stage]")) };
}

test("work page: two works of the same family in the same size are the same size on screen", async ({ page }) => {
  // N°03 and N°13 are both 5:6, shown on their medium canvas, 50×60.
  const a = await canvasOf(page, "/works/n03/");
  await expect(page.getByText("Original palette, 50×60")).toHaveCount(1);
  const b = await canvasOf(page, "/works/n13/");
  expect(Math.abs(a.canvas.width - b.canvas.width)).toBeLessThan(0.5);
  expect(Math.abs(a.canvas.height - b.canvas.height)).toBeLessThan(0.5);
  // The canvas has the exact proportions of 50×60, and the ground did not move.
  expect(a.canvas.width / a.canvas.height).toBeCloseTo(50 / 60, 2);
  expect(b.stage).toEqual(a.stage);
});

test("work page: 80×100 is larger than 60×80 in the real ratio, and the ground keeps its size", async ({ page }) => {
  const big = await canvasOf(page, "/works/n09/?format=80x100");
  const small = await canvasOf(page, "/works/n06/?format=60x80");
  expect(big.canvas.height / small.canvas.height).toBeCloseTo(100 / 80, 2);
  expect(big.canvas.width / small.canvas.width).toBeCloseTo(80 / 60, 2);
  expect(big.stage).toEqual(small.stage);
  // Board size of the ground: 720 px high on desktop, 440 px on phones; 80×100 fits its inner 80 %.
  expect(big.stage.height).toBe(isPhone(page) ? 440 : 720);
  expect(big.canvas.height).toBeLessThanOrEqual(big.stage.height * 0.8 + 0.5);
  expect(big.canvas.width).toBeLessThanOrEqual(big.stage.width * 0.8 + 0.5);
});

test("work page: the smallest canvas is never under 35 % of the ground's height", async ({ page }) => {
  const { canvas, stage } = await canvasOf(page, "/works/n09/?format=24x30");
  expect(canvas.height).toBeGreaterThanOrEqual(stage.height * 0.35 - 0.5);
  expect(canvas.width / canvas.height).toBeCloseTo(24 / 30, 2);
});

test("work page: changing the size resizes the canvas, not the ground", async ({ page }) => {
  const { canvas: medium, stage } = await canvasOf(page, "/works/n06/");
  await page.getByRole("radio", { name: "60×80" }).click();
  await expect(page).toHaveURL(/format=60x80/);
  const large = await settledBox(page.locator("[data-canvas]"));
  expect(large.height).toBeGreaterThan(medium.height);
  expect(await settledBox(page.locator("[data-stage]"))).toEqual(stage);
});

test("print page: two sheets in M are the same size, L is larger than M in the real ratio", async ({ page }) => {
  const a = await sheetOf(page, "/prints/n03/?size=m");
  const b = await sheetOf(page, "/prints/n04/?size=m");
  expect(Math.abs(a.sheet.width - b.sheet.width)).toBeLessThan(0.5);
  expect(Math.abs(a.sheet.height - b.sheet.height)).toBeLessThan(0.5);
  // A2, 42 × 59 cm, white, the edition number printed at the bottom.
  expect(a.sheet.width / a.sheet.height).toBeCloseTo(42 / 59, 2);
  await expect(page.locator("[data-sheet]")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(page.locator("[data-sheet]")).toHaveCSS("box-shadow", "none");
  await expect(page.locator("[data-sheet]").getByText(/^N°04 · \d+\/50$/)).toBeVisible();

  const l = await sheetOf(page, "/prints/n03/?size=l");
  expect(l.sheet.height / a.sheet.height).toBeCloseTo(70 / 59, 2);
  expect(l.sheet.width / a.sheet.width).toBeCloseTo(50 / 42, 2);
  expect(l.stage).toEqual(a.stage);

  // A landscape work's sheet is turned: same scale, 59 × 42.
  const landscape = await sheetOf(page, "/prints/n07/?size=m");
  expect(Math.abs(landscape.sheet.width - a.sheet.height)).toBeLessThan(0.5);
  expect(Math.abs(landscape.sheet.height - a.sheet.width)).toBeLessThan(0.5);
});

test("Simplified version: below the work's base level, under the level and on the cart line", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  // N°03 is Intermediate on its medium canvas: no mention.
  await page.goto("/works/n03/");
  await page.waitForLoadState("networkidle");
  const mention = page.locator("main").getByText("Simplified version", { exact: true });
  await expect(mention).toHaveCount(0);
  if (!isPhone(page)) await expect(page.getByText("suggests Intermediate", { exact: true })).toBeVisible();

  // The small canvas suggests one level down: Beginner, a simplified version of the guide.
  await page.getByRole("radio", { name: "38×46" }).click();
  await expect(page).toHaveURL(/format=38x46/);
  await expect(mention).toBeVisible();
  // Custom at the work's own level or above: the full guide again, same price.
  await page.getByRole("radio", { name: "Custom" }).click();
  await page.getByRole("radio", { name: "Intermediate" }).click();
  await expect(mention).toHaveCount(0);
  await page.getByRole("radio", { name: "Beginner" }).click();
  await expect(mention).toBeVisible();

  if (isPhone(page)) await page.getByRole("button", { name: /^Add/ }).last().click();
  else await page.getByRole("button", { name: /Add to cart/ }).click();
  await page.getByRole("button", { name: "Cart, 1 item", exact: true }).click();
  const cart = isPhone(page) ? page.locator("main") : page.getByRole("dialog");
  await expect(cart.getByText("38×46 · Beginner · Original")).toBeVisible();
  await expect(cart.getByText("Simplified version", { exact: true })).toBeVisible();

  // The large canvas of an Advanced work stays Advanced: never above it, never simplified.
  await page.goto("/works/n04/?format=60x73");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("main").getByText("Simplified version", { exact: true })).toHaveCount(0);
});
