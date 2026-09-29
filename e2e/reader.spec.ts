import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** M5: guide reader, drying timer, print preview, and the Library following the reader (docs/screens/reader.md). */

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1440) < 1024;

async function signedIn(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/login/");
  await page.getByRole("button", { name: /passkey|Face ID/ }).click();
  await expect(page).toHaveURL(/\/account\/?$/);
}

async function expectNoAxeViolations(page: Page) {
  // Step changes and the sheet fade in: check the settled page, not a half-transparent frame.
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
}

async function swipe(page: Page, from: number, to: number) {
  const main = page.locator("main");
  await main.dispatchEvent("pointerdown", { pointerType: "touch", clientX: from, clientY: 400, isPrimary: true });
  await main.dispatchEvent("pointerup", { pointerType: "touch", clientX: to, clientY: 405, isPrimary: true });
}

test("Continue resumes the guide, every way of moving saves the step, the Library follows", async ({ page }) => {
  await signedIn(page);
  await page.getByRole("link", { name: "Continue N°03", exact: true }).click();
  await expect(page).toHaveURL(/\/learn\/ent-2041-1\/\?step=2a$/);
  await expect(page.getByText("Step a of e")).toBeVisible();
  await expect(page.getByRole("heading", { name: isPhone(page) ? "Layer 2 · Gestures" : "N°03 · Layer 02 · Gestures" })).toBeVisible();

  await page.getByRole("button", { name: /Next step/ }).click();
  await expect(page).toHaveURL(/step=2b$/);
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/step=2c$/);
  await page.keyboard.press("ArrowLeft");
  await expect(page).toHaveURL(/step=2b$/);
  await expectNoAxeViolations(page);

  if (isPhone(page)) {
    await swipe(page, 320, 80);
    await expect(page).toHaveURL(/step=2c$/);
    await page.getByRole("slider", { name: "Steps" }).locator('[data-step="2e"]').click();
    await expect(page).toHaveURL(/step=2e$/);
    await page.keyboard.press("ArrowRight");
  } else {
    await page.getByRole("slider", { name: "Steps" }).locator('[data-step="3a"]').click();
  }
  await expect(page).toHaveURL(/step=3a$/);
  const bar = page.getByRole("slider", { name: "Steps" });
  await expect(bar).toHaveAttribute("aria-valuetext", /^Layer 03, step a · 11 of 15$/);
  // The bar's own keys move one step (and one layer with Page Up / Page Down) without the reader's listener doubling them.
  await bar.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page).toHaveURL(/step=2e$/);
  await page.keyboard.press("PageUp");
  await expect(page).toHaveURL(/step=3a$/);

  // Reopening resumes, and the Library shows the new layer.
  await page.goto("/account/");
  await expect(page.getByText(/Layer 3 of 3/)).toBeVisible();
  await page.goto("/learn/ent-2041-1/");
  await expect(page).toHaveURL(/step=3a$/);
});

test("the drying timer keeps its time through a reload and unlocks the next layer", async ({ page }) => {
  await signedIn(page);
  await page.goto("/learn/ent-2041-1/?step=2e");
  await page.getByRole("button", { name: /Start drying timer/ }).click();
  await expect(page).toHaveURL(/\/learn\/ent-2041-1\/timer\/\?layer=2$/);
  await expect(page.getByText(isPhone(page) ? "Layer 2 is drying" : "Layer 02 is drying")).toBeVisible();
  await page.getByRole("button", { name: "Pause" }).click();
  const clock = await page.getByRole("timer").textContent();
  expect(clock).toMatch(/^4[45]:\d\d$/);
  await page.reload();
  await expect(page.getByRole("timer")).toHaveText(clock!);
  await expect(page.getByRole("button", { name: "Start timer" })).toBeVisible();
  await expectNoAxeViolations(page);
  await page.getByRole("button", { name: isPhone(page) ? /It is dry, go to layer 3/ : /It is dry, start layer 03/ }).click();
  await expect(page).toHaveURL(/\/learn\/ent-2041-1\/\?step=3a$/);
  await expect(page.getByText("Step a of e")).toBeVisible();
});

test("Print opens the sheet, Prepare PDF shows the watermarked pages", async ({ page }) => {
  await signedIn(page);
  await page.getByRole("link", { name: isPhone(page) ? "Print N°03, 2 left" : "Print · 2 left" }).first().click();
  const sheet = page.getByRole("dialog", { name: "Print this guide" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("2 of 3 prints left")).toBeVisible();
  await expect(sheet.getByText(/Camille M\. · #GS-2041/)).toBeVisible();
  await expectNoAxeViolations(page);
  await sheet.getByRole("button", { name: /Prepare PDF/ }).click();
  await expect(page.getByRole("region", { name: "Page 1 of 8" })).toBeVisible();
  await expect(page.getByRole("region", { name: /^Page \d of 8$/ })).toHaveCount(8);
  await expect(page.getByText("Licensed to Camille M. · camille.martin@mail.com").first()).toBeVisible();
  await expect(page.getByText("order #GS-2041").first()).toBeVisible();

  await page.getByRole("button", { name: "← Print options" }).click();
  await page.getByLabel("Current layer only · 1 page").check();
  await page.getByRole("button", { name: /Prepare PDF/ }).click();
  await expect(page.getByRole("region", { name: /^Page \d of 8$/ })).toHaveCount(1);
  await expect(page.getByRole("region", { name: "Page 6 of 8" })).toBeVisible();
});

test("the last step finishes the guide", async ({ page }) => {
  await signedIn(page);
  await page.goto("/learn/ent-2041-1/?step=3e");
  await page.getByRole("button", { name: /I signed it\. Finish/ }).click();
  await expect(page).toHaveURL(/\/account\/?$/);
  await expect(page.getByRole("link", { name: "Open N°03", exact: true })).toBeVisible();
});

test("the reader is private and shows only the customer's guides", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/learn/ent-2041-1/");
  await expect(page).toHaveURL(/\/login\/?\?next=%2Flearn%2Fent-2041-1/);
  await page.getByRole("button", { name: /passkey|Face ID/ }).click();
  await expect(page).toHaveURL(/\/learn\/ent-2041-1\//);
  await expect(page.getByText(/Step . of e/)).toBeVisible();
  await page.goto("/learn/ent-2040-1/"); // Hugo's guide
  await expect(page.getByRole("heading", { name: "This guide is not in your library." })).toBeVisible();
});
