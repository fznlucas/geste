import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** M4: log in, library, orders, settings, tracking, and a checkout order landing in the account (docs/screens/account.md). */

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1440) < 1200;

async function fresh(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
}

async function expectNoAxeViolations(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
}

test("the account is guarded, login honours next", async ({ page }) => {
  await fresh(page);
  await page.goto("/account/orders/");
  await expect(page).toHaveURL(/\/login\/?\?next=%2Faccount%2Forders/);
  await page.getByLabel("Email", { exact: true }).fill("camille.martin@mail.com");
  await page.getByLabel("Password", { exact: true }).fill("anything");
  await page.getByRole("button", { name: /^Log in/ }).click();
  await expect(page).toHaveURL(/\/account\/orders\/?$/);
  await expect(page.getByRole("heading", { name: "Hi Camille" })).toBeVisible();
  await expect(page.getByRole("button", { name: /#GS-2041/ })).toHaveAttribute("aria-expanded", "true");
  await expectNoAxeViolations(page);
});

test("login with an email code", async ({ page }) => {
  await fresh(page);
  await page.goto("/login/");
  await page.getByRole("button", { name: "Email me a login code" }).click();
  await page.getByLabel("Email", { exact: true }).fill("sarah.cohen@mail.com");
  await page.getByRole("button", { name: /Send me a code/ }).click();
  await page.getByLabel("6-digit code").fill("123456"); // auto-submits
  await expect(page).toHaveURL(/\/account\/?$/);
  await expect(page.getByRole("heading", { name: "Hi Sarah" })).toBeVisible();
});

test("library shows progress, logging out goes home", async ({ page }) => {
  await fresh(page);
  await page.goto("/login/");
  await page.getByRole("button", { name: /passkey|Face ID/ }).click();
  await expect(page).toHaveURL(/\/account\/?$/);
  await expect(page.getByText(/Layer 2 of 3/)).toBeVisible();
  await expect(page.getByText(/Not started/)).toBeVisible();
  await expect(page.getByText(/Finished · signed/)).toBeVisible();
  await expectNoAxeViolations(page);
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("settings: password change and delete confirmation", async ({ page }) => {
  await fresh(page);
  await page.goto("/login/?next=%2Faccount%2Fsettings");
  await page.getByRole("button", { name: /passkey|Face ID/ }).click();
  await expect(page).toHaveURL(/\/account\/settings\/?$/);
  await page.getByRole("button", { name: "Change password" }).click();
  await page.getByRole("button", { name: /Save password/ }).click();
  await expect(page.getByText("Enter your current password")).toBeVisible();
  await page.getByLabel(isPhone(page) ? "Current" : "Current password", { exact: true }).fill("old-one-1");
  await page.getByLabel(isPhone(page) ? "New" : /^New password/, { exact: isPhone(page) }).fill("paint2026");
  if (!isPhone(page)) await page.getByLabel("Confirm new password").fill("paint2026");
  await page.getByRole("button", { name: /Save password/ }).click();
  await expect(page.getByText(/updated just now/i)).toBeVisible();
  await page.getByRole("button", { name: "Delete my account" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "This deletes your library" })).toBeVisible();
  await expectNoAxeViolations(page);
});

test("an order paid at checkout shows in the library, the orders and the tracking", async ({ page }) => {
  await fresh(page);
  await page.goto("/works/n05/");
  await page.evaluate(() =>
    localStorage.setItem(
      "geste.cart.v1",
      JSON.stringify([
        { id: "l1", addedAt: "2026-10-01T10:00:00Z", kind: "guide", workId: "00000000-0000-0000-0000-000000000005", format: "40x50", level: "match", palette: "original" },
        { id: "l2", addedAt: "2026-10-01T10:01:00Z", kind: "print", editionId: "ed-07-a3", quantity: 1 },
      ]),
    ),
  );
  await page.goto("/checkout/");
  await page.locator("#co-email").fill("camille.martin@mail.com");
  await page.locator("#co-fn").fill("Camille");
  await page.locator("#co-ln").fill("Martin");
  await page.getByRole("button", { name: /Continue to shipping/ }).click();
  await page.locator("#co-country").selectOption("BE");
  await page.locator("#co-a1").fill("56 rue Haute");
  await page.locator("#co-zip").fill("1000");
  await page.locator("#co-city").fill("Bruxelles");
  await page.getByRole("button", { name: /Continue to payment/ }).click();
  // Phone: the compact method choice; PayPal needs no card.
  await page.getByRole("radio", { name: "PayPal" }).check({ force: true }); // desktop: sr-only native radio under its row
  await page.locator("label", { hasText: "I accept the" }).locator("input").check();
  await page.getByRole("button", { name: /^Pay now/ }).click();
  await expect(page).toHaveURL(/\/checkout\/success\/?\?order=GS-2042/);

  await page.getByRole("link", { name: "Open my library" }).click();
  await expect(page).toHaveURL(/\/account\/?$/);
  await expect(page.getByText("N°05", { exact: true })).toBeVisible();

  await page.goto("/account/orders/");
  const first = page.getByRole("button", { name: /#GS-2042/ });
  await expect(first).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText("N°05 — Guide, 40×50")).toBeVisible();
  await expect(page.getByText(/N°07 — Print A3, \d+\/50/).first()).toBeVisible();
  await page.getByRole("link", { name: /^Track/ }).first().click();
  await expect(page).toHaveURL(/\/track\/?\?order=GS-2042/);
  await expect(page.getByRole("listitem").filter({ hasText: "Ordered" })).toHaveAttribute("aria-current", "step");
  if (!isPhone(page)) await expect(page.getByText("1000 Bruxelles, Belgium")).toBeVisible();
});
