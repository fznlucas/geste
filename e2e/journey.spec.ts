import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * M7: the buyer's whole path on the export, through the interface only (docs/mock-plan.md §4):
 * add a guide → checkout → success → open the guide → progress in the Library.
 */

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1440) < 1200;

async function expectNoAxeViolations(page: Page) {
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
}

test("add a guide, pay, open it, and the Library follows the reader", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());

  // Work page: the default configuration, straight to the cart.
  await page.goto("/works/n05/");
  await page.waitForLoadState("networkidle"); // the button works once the page is hydrated
  if (isPhone(page)) await page.getByRole("button", { name: /^Add/ }).last().click();
  else await page.getByRole("button", { name: /Add to cart/ }).click();
  // The header's cart: the drawer on desktop, /cart on a phone.
  await page.getByRole("button", { name: "Cart, 1 item", exact: true }).click();
  const cart = isPhone(page) ? page.locator("main") : page.getByRole("dialog");
  if (isPhone(page)) await expect(page).toHaveURL(/\/cart\/?$/);
  await expect(cart.getByText("N°05 — Guide")).toBeVisible();
  await expectNoAxeViolations(page);
  await cart.getByRole("link", { name: /^Checkout/ }).click();
  await expect(page).toHaveURL(/\/checkout\/?$/);

  // A mock customer who owns no N°05 guide yet.
  await page.locator("#co-email").fill("sarah.cohen@mail.com");
  await page.locator("#co-fn").fill("Sarah");
  await page.locator("#co-ln").fill("Cohen");
  // A guide alone ships nothing: contact, then payment.
  await page.getByRole("button", { name: /Continue to payment/ }).click();
  await page.locator("#co-card").fill("4242424242424242");
  if (!isPhone(page)) await page.locator("#co-cname").fill("Sarah Cohen");
  await page.locator("#co-exp").fill("1228");
  await page.locator("#co-cvc").fill("123");
  await page.locator("label", { hasText: "I accept the" }).locator("input").check();
  await page.getByRole("button", { name: /^Pay now/ }).click();

  await expect(page).toHaveURL(/\/checkout\/success\/?\?order=GS-\d+/);
  await expect(page.getByText("Thank you, Sarah.")).toBeVisible();
  await expectNoAxeViolations(page);
  await page.getByRole("link", { name: "Open my library" }).first().click();
  await expect(page).toHaveURL(/\/account\/?$/);

  // The new guide is not started; open it and read two steps.
  await page.getByRole("link", { name: "Start N°05", exact: true }).first().click();
  await expect(page).toHaveURL(/\/learn\/local-[^/]+\/\?step=1a$/);
  await expect(page.getByText("Step a of e")).toBeVisible();
  await page.getByRole("button", { name: /Next step/ }).click();
  await expect(page).toHaveURL(/step=1b$/);
  await page.getByRole("button", { name: /Next step/ }).click();
  await expect(page).toHaveURL(/step=1c$/);
  await expectNoAxeViolations(page);

  // Back in the Library, N°05 continues where the painter stopped.
  await page.goto("/account/");
  await expect(page.getByRole("link", { name: "Continue N°05", exact: true }).first()).toBeVisible();
  await page.getByRole("link", { name: "Continue N°05", exact: true }).first().click();
  await expect(page).toHaveURL(/step=1c$/);
});
