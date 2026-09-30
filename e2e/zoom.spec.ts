import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Levitation shadow of the work page's canvas, and the loupe (LightboxZoom) of the work and print
 * pages: open, zoom, move, close, with the mouse, the fingers and the keyboard (docs/decisions.md
 * "Levitation shadow", "Loupe"). Runs at 1440 × 900 and 390 × 844.
 */

async function expectNoAxeViolations(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(r.violations.map((v) => v.id)).toEqual([]);
}

const layer = (page: Page) => page.locator("[data-zoom-layer]");
const transformOf = (page: Page) => layer(page).evaluate((el) => (el as HTMLElement).style.transform);

/** Touch pointers on the picture's box (Playwright has no multi-touch): `steps` of [pointerId, x, y] from the box's centre. */
async function touch(page: Page, type: "pointerdown" | "pointermove" | "pointerup", points: Array<[number, number, number]>) {
  await page.locator("[data-zoom]").evaluate(
    (el, { type, points }) => {
      const r = el.getBoundingClientRect();
      for (const [id, dx, dy] of points) {
        el.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: "touch", isPrimary: id === 1, clientX: r.left + r.width / 2 + dx, clientY: r.top + r.height / 2 + dy, bubbles: true }));
      }
    },
    { type, points },
  );
}

test("work page: the canvas floats above its ground, nothing clips the shadow; prints and grids stay flat", async ({ page }) => {
  await page.goto("/works/n08/");
  const canvas = page.locator("[data-canvas]");
  await expect(canvas).toHaveCSS("box-shadow", /rgba\(17, 17, 17, 0\.65\) 0px 40px 60px -30px/);
  const stage = page.locator("[data-stage]");
  await expect(stage).toHaveCSS("overflow", "visible");
  // The shadow's visible part (offset 40 − spread 30 + half the blur, 30) ends inside the ground.
  const [c, s] = [await canvas.boundingBox(), await stage.boundingBox()];
  expect(c!.y + c!.height + 40).toBeLessThanOrEqual(s!.y + s!.height);
  // The palette filter is on the image, so the shadow is never tinted.
  await expect(canvas).toHaveCSS("filter", "none");

  // The largest canvas (80×100) leaves room too.
  await page.goto("/works/n07/?format=80x100");
  const big = page.locator("[data-canvas]");
  const [b, g] = [await big.boundingBox(), await page.locator("[data-stage]").boundingBox()];
  expect(b!.y + b!.height + 40).toBeLessThanOrEqual(g!.y + g!.height);

  for (const url of ["/prints/n07/", "/shop/", "/prints/"]) {
    await page.goto(url);
    const floating = await page.evaluate(() => [...document.querySelectorAll("main *")].filter((el) => getComputedStyle(el).boxShadow.includes("-30px")).length);
    expect(floating, url).toBe(0);
  }
});

test("loupe on a work: opens whole, zooms, moves, closes beside the picture", async ({ page }, info) => {
  await page.goto("/works/n08/");
  await page.getByRole("button", { name: "Zoom", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "N°08, digital preview" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Close" })).toBeVisible();
  const picture = dialog.getByRole("button", { name: "Zoom in" });
  await expect(picture).toBeVisible();
  // Full definition: the file itself, never a thumbnail.
  await expect(dialog.locator("img")).toHaveJSProperty("complete", true);
  expect(await dialog.locator("img").evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(1500);
  await expectNoAxeViolations(page);

  const box = (await picture.boundingBox())!;
  if (info.project.name === "desktop") {
    // A click zooms ×2.5 where it points; the picture then follows the cursor; a click shows it whole.
    await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.25);
    await expect(dialog.getByRole("button", { name: "Zoom out" })).toBeVisible();
    expect(await transformOf(page)).toMatch(/scale\(2\.5\)/);
    const before = await transformOf(page);
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.7);
    await expect.poll(() => transformOf(page)).not.toBe(before);
    // At the box's right edge the picture's right edge shows: translation = −(2.5 − 1) × half the width.
    await page.mouse.move(box.x + box.width - 0.5, box.y + box.height / 2);
    await expect.poll(async () => Number((await transformOf(page)).match(/translate\((-?[\d.]+)px/)![1])).toBeCloseTo((-1.5 * box.width) / 2, -1);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(dialog.getByRole("button", { name: "Zoom in" })).toBeVisible();
    await page.mouse.click(8, box.y + box.height / 2); // beside the picture
  } else {
    // A tap does nothing; two fingers pinch; one finger moves.
    await touch(page, "pointerdown", [[1, 0, 0]]);
    await touch(page, "pointerup", [[1, 0, 0]]);
    await page.locator("[data-zoom]").dispatchEvent("click", { detail: 1 });
    await expect(dialog.getByRole("button", { name: "Zoom in" })).toBeVisible();
    await touch(page, "pointerdown", [[1, -20, 0], [2, 20, 0]]);
    for (let i = 1; i <= 6; i++) await touch(page, "pointermove", [[1, -20 - i * 12, 0], [2, 20 + i * 12, 0]]);
    await touch(page, "pointerup", [[1, -92, 0], [2, 92, 0]]);
    await expect(dialog.getByRole("button", { name: "Zoom out" })).toBeVisible();
    const scale = Number((await transformOf(page)).match(/scale\(([\d.]+)\)/)![1]);
    expect(scale).toBeGreaterThan(3);
    const before = await transformOf(page);
    await touch(page, "pointerdown", [[3, 0, 0]]);
    await touch(page, "pointermove", [[3, 40, 30]]);
    await touch(page, "pointerup", [[3, 40, 30]]);
    await expect.poll(() => transformOf(page)).not.toBe(before);
    // The picture never leaves a gap: the translation stays within (scale − 1) × half the box.
    const x = Number((await transformOf(page)).match(/translate\((-?[\d.]+)px/)![1]);
    expect(Math.abs(x)).toBeLessThanOrEqual(((scale - 1) * box.width) / 2 + 0.5);
    await page.mouse.click(4, 4); // beside the picture, under the top gutter
  }
  await expect(dialog).toBeHidden();

  // A click on the canvas opens it too.
  await page.locator("[data-canvas]").click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();
});

/** Two taps of one finger at [dx, dy] from the box's centre, `gap` ms apart, as a phone sends them (pointer events, then click). */
async function doubleTap(page: Page, [dx, dy]: [number, number], gap = 80, second: [number, number] = [dx, dy]) {
  const taps: Array<[number, number]> = [[dx, dy], second];
  for (const [i, [x, y]] of taps.entries()) {
    if (i === 1) await page.waitForTimeout(gap);
    await touch(page, "pointerdown", [[10 + i, x, y]]);
    await touch(page, "pointerup", [[10 + i, x, y]]);
    await page.locator("[data-zoom]").dispatchEvent("click", { detail: 1 });
  }
}

test("phone: a double-tap zooms ×2.5 on the point touched, the next one shows the picture whole", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "touch gesture");
  await page.goto("/works/n08/");
  await page.getByRole("button", { name: "Zoom", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "N°08, digital preview" });
  await expect(dialog.getByRole("button", { name: "Zoom in" })).toBeVisible();

  // Too slow, or too far apart: two single taps, nothing happens.
  await doubleTap(page, [0, 0], 450);
  await doubleTap(page, [-100, 0], 80, [100, 0]);
  await expect(dialog.getByRole("button", { name: "Zoom in" })).toBeVisible();
  expect(await transformOf(page)).toBe("translate(0px, 0px) scale(1)");

  // 60 px left and 40 px below the centre: that point of the picture stays under the finger (× (1 − 2.5)).
  await page.waitForTimeout(400);
  await doubleTap(page, [-60, 40]);
  await expect(dialog.getByRole("button", { name: "Zoom out" })).toBeVisible();
  await expect.poll(() => transformOf(page)).toBe("translate(90px, -60px) scale(2.5)");

  await page.waitForTimeout(400);
  await doubleTap(page, [30, -20]);
  await expect(dialog.getByRole("button", { name: "Zoom in" })).toBeVisible();
  await expect.poll(() => transformOf(page)).toBe("translate(0px, 0px) scale(1)");

  // On a print too.
  await page.keyboard.press("Escape");
  await page.goto("/prints/n07/");
  await page.getByRole("button", { name: "Zoom", exact: true }).click();
  await doubleTap(page, [0, 0]);
  await expect(page.getByRole("dialog").getByRole("button", { name: "Zoom out" })).toBeVisible();
});

test("loupe with the keyboard: open, zoom, move, Escape, focus back on Zoom", async ({ page }) => {
  await page.goto("/works/n07/");
  const zoom = page.getByRole("button", { name: "Zoom", exact: true });
  await zoom.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "N°07, digital preview" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Close" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Zoom in" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(dialog.getByRole("button", { name: "Zoom out" })).toBeFocused();
  await expect.poll(() => transformOf(page)).toBe("translate(0px, 0px) scale(2.5)");
  await page.keyboard.press("ArrowLeft");
  await expect.poll(() => transformOf(page)).not.toBe("translate(0px, 0px) scale(2.5)");
  await expectNoAxeViolations(page);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(zoom).toBeFocused();
});

test("loupe on a print: the whole white sheet, margin and number", async ({ page }) => {
  await page.goto("/prints/n07/");
  await page.locator("[data-stage] [data-sheet]").click();
  const dialog = page.getByRole("dialog", { name: "N°07, limited print, S" });
  await expect(dialog).toBeVisible();
  const picture = dialog.getByRole("button", { name: "Zoom in" });
  // The sheet (A3 turned, 42 × 30) with its printed number, not only the image.
  await expect(dialog.getByText("N°07 · 12/100")).toBeVisible();
  const [p, img] = [await picture.boundingBox(), await dialog.locator("img").boundingBox()];
  expect(p!.width / p!.height).toBeCloseTo(42 / 30, 2);
  expect(img!.width).toBeLessThan(p!.width * 0.9);
  await expectNoAxeViolations(page);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  // Not on "To scale".
  await page.getByRole("radio", { name: "To scale" }).click();
  await expect(page.getByRole("button", { name: "Zoom", exact: true })).toHaveCount(0);
});
