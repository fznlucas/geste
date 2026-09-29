import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** /checkout: every payment outcome of the Checkout board with Stripe's test cards (docs/screens/checkout.md). */

const CART = [
  { id: "l1", addedAt: "2026-10-01T10:00:00Z", kind: "guide", workId: "00000000-0000-0000-0000-000000000003", format: "60x80", level: "match", palette: "original" },
  { id: "l2", addedAt: "2026-10-01T10:01:00Z", kind: "print", editionId: "ed-07-s", quantity: 1 },
];

async function open(page: Page, query = "") {
  await page.goto("/");
  await page.evaluate((cart) => {
    localStorage.clear();
    localStorage.setItem("geste.cart.v2", JSON.stringify(cart));
  }, CART);
  await page.goto(`/checkout/${query}`);
}

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1440) < 1200;

async function toPayment(page: Page) {
  // A mock customer who does not own the N°03 guide yet (Camille does: GS-2041).
  await page.locator("#co-email").fill("sarah.cohen@mail.com");
  await page.locator("#co-fn").fill("Sarah");
  await page.locator("#co-ln").fill("Cohen");
  await page.getByRole("button", { name: /Continue to shipping/ }).click();
  await page.locator("#co-a1").fill("12 rue Mercière");
  await page.locator("#co-zip").fill("69002");
  await page.locator("#co-city").fill("Lyon");
  await page.getByRole("button", { name: /Continue to payment/ }).click();
}

async function fillCard(page: Page, number: string) {
  await page.locator("#co-card").fill(number);
  if (!isPhone(page)) await page.locator("#co-cname").fill("Sarah Cohen");
  await page.locator("#co-exp").fill("1228");
  await page.locator("#co-cvc").fill("123");
  await page.locator("label", { hasText: "I accept the" }).locator("input").check();
}

const pay = (page: Page) => page.getByRole("button", { name: /^Pay now/ }).click();

async function expectNoAxeViolations(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
}

test("incomplete contact step is flagged, then fixed", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: /Continue to shipping/ }).click();
  if (isPhone(page)) await expect(page.locator("main").getByRole("alert").first()).toContainText("Contact is incomplete");
  else {
    await expect(page.getByRole("alertdialog")).toContainText("Step 01 · Contact is incomplete");
    await expectNoAxeViolations(page);
    await page.getByRole("button", { name: /OK, let me fix it/ }).click();
    await expect(page.locator("#co-email")).toBeFocused();
  }
  await expect(page.locator("#co-email-err")).toHaveText("Enter your email");
});

test("declined card, then 3D Secure, then paid", async ({ page }) => {
  await open(page);
  await toPayment(page);
  await fillCard(page, "4000 0000 0000 0002");
  await pay(page);
  await expect(page.locator("main").getByRole("alert")).toContainText("Your card was declined");
  await expectNoAxeViolations(page);

  await page.locator("#co-card").fill("4000 0027 6000 3184");
  await pay(page);
  await page.getByRole("button", { name: "Fail" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("Your bank could not confirm the payment");

  await pay(page);
  await page.getByRole("button", { name: /Complete/ }).click();
  await expect(page).toHaveURL(/\/checkout\/success\/\?order=GS-2042/);
  await expect(page.getByRole("heading", { name: "Thank you, Sarah." })).toBeVisible();
  await expect(page.getByText(/N°07, 12\/100/).first()).toBeVisible();
  await expectNoAxeViolations(page);
  const stored = await page.evaluate(() => ({ cart: localStorage.getItem("geste.cart.v2"), purchases: JSON.parse(localStorage.getItem("geste.purchases.v2") ?? "{}") }));
  expect(stored.cart).toBeNull();
  expect(stored.purchases.orders).toHaveLength(1);
  expect(stored.purchases.entitlements[0].id).toMatch(/^local-/);
});

test("a double click on Pay places one order", async ({ page }) => {
  await open(page);
  await toPayment(page);
  await fillCard(page, "4242 4242 4242 4242");
  await page.getByRole("button", { name: /^Pay now/ }).dblclick();
  await expect(page).toHaveURL(/checkout\/success/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("geste.purchases.v2")!).orders.length)).toBe(1);
});

test("sold-out number: take the next one and pay", async ({ page }) => {
  await open(page, "?paymentOutcome=soldout");
  await toPayment(page);
  await fillCard(page, "4242 4242 4242 4242");
  await pay(page);
  await expect(page.locator("main").getByRole("alert")).toContainText("Edition 12/100 of N°07 just sold out");
  await page.getByRole("button", { name: /Take 13\/100 and pay/ }).click();
  await expect(page).toHaveURL(/checkout\/success/);
  await expect(page.getByText(/N°07, 13\/100/).first()).toBeVisible();
});

test("express checkout goes straight to the confirmation", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Apple Pay" }).click();
  await expect(page).toHaveURL(/checkout\/success/);
  await expect(page.getByRole("heading", { name: "Thank you, Camille." })).toBeVisible();
});
