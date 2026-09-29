import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * M6 admin orders (docs/screens/admin.md): a checkout order reaches the admin, is shipped and refunded;
 * Support's $50 refund limit; the phone "To ship" list.
 */

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768;

async function expectNoAxeViolations(page: Page) {
  await page.waitForTimeout(300); // toasts and dialogs finish fading in
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
}

async function fresh(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
}

/** /admin/login: password, then any 6 digits. */
async function adminLogin(page: Page) {
  await page.goto("/admin/login/");
  await page.getByLabel("Password").fill("correct horse");
  await page.getByRole("button", { name: /^Continue/ }).click();
  await page.getByLabel("Code").fill("123456");
  await page.getByRole("button", { name: /^Log in/ }).click();
  await expect(page).toHaveURL(/\/admin\/?$/);
}

/** Guide N°03 + print N°07 A3, paid by Sarah Cohen with the Stripe success card. */
async function buyAsSarah(page: Page): Promise<string> {
  await page.evaluate(() =>
    localStorage.setItem(
      "geste.cart.v1",
      JSON.stringify([
        { id: "l1", addedAt: "2026-10-01T10:00:00Z", kind: "guide", workId: "00000000-0000-0000-0000-000000000003", format: "60x80", level: "match", palette: "original" },
        { id: "l2", addedAt: "2026-10-01T10:01:00Z", kind: "print", editionId: "ed-07-a3", quantity: 1 },
      ]),
    ),
  );
  await page.goto("/checkout/");
  await page.locator("#co-email").fill("sarah.cohen@mail.com");
  await page.locator("#co-fn").fill("Sarah");
  await page.locator("#co-ln").fill("Cohen");
  await page.getByRole("button", { name: /Continue to shipping/ }).click();
  await page.locator("#co-a1").fill("22 rue Oberkampf");
  await page.locator("#co-zip").fill("75011");
  await page.locator("#co-city").fill("Paris");
  await page.getByRole("button", { name: /Continue to payment/ }).click();
  await page.locator("#co-card").fill("4242 4242 4242 4242");
  await page.locator("#co-cname").fill("Sarah Cohen");
  await page.locator("#co-exp").fill("1228");
  await page.locator("#co-cvc").fill("123");
  await page.locator("label", { hasText: "I accept the" }).locator("input").check();
  await page.getByRole("button", { name: /^Pay now/ }).click();
  await expect(page).toHaveURL(/\/checkout\/success\/\?order=GS-\d+/);
  return new URL(page.url()).searchParams.get("order")!;
}

const ordersTable = (page: Page) => page.getByRole("table", { name: "Orders" });

test("a checkout order reaches the admin, ships, then is refunded", async ({ page }) => {
  test.skip(isPhone(page), "desktop flow");
  await fresh(page);
  const number = await buyAsSarah(page);
  await adminLogin(page);

  await page.goto("/admin/orders/");
  const first = ordersTable(page).getByRole("row").nth(1);
  await expect(first).toContainText(`#${number}`);
  await expect(first).toContainText("Sarah Cohen");
  await expect(first).toContainText("Guide N°03 · Print N°07 A3");
  await expect(first).toContainText("To ship");
  await expectNoAxeViolations(page);

  await first.getByRole("link", { name: `#${number}` }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/orders/detail/?\\?number=${number}`));
  await expect(page.getByRole("heading", { name: `Order #${number}` })).toBeVisible();
  await expect(page.getByText(/Print to ship · paid/)).toBeVisible();

  await page.getByRole("button", { name: "Create shipping label" }).click();
  await expect(page.getByRole("button", { name: "Label ready · PDF" })).toBeVisible();
  await expect(page.getByLabel("Tracking number")).toHaveValue(/^6A /);
  await page.getByRole("button", { name: /Mark as shipped and notify/ }).click();
  await expect(page.getByRole("button", { name: /Shipped · customer notified/ })).toBeVisible();
  await expect(page.getByText(/Shipped · Colissimo — home · 6A/)).toBeVisible();
  await expectNoAxeViolations(page);

  await page.goto("/admin/orders/");
  await expect(ordersTable(page).getByRole("row").nth(1)).toContainText("Shipped");

  // Refund the whole order: the guide leaves Sarah's library.
  await ordersTable(page).getByRole("link", { name: `#${number}` }).click();
  await page.getByRole("button", { name: "Refund…" }).click();
  const dialog = page.getByRole("dialog", { name: `Refund #${number}` });
  await expect(dialog).toBeVisible();
  await expectNoAxeViolations(page);
  await dialog.getByRole("button", { name: /Full order/ }).click();
  await dialog.getByRole("button", { name: /^Refund \$70/ }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(/^Refunded · paid/)).toBeVisible();
  await expect(page.getByText("Library access revoked")).toBeVisible();
  await expect(page.getByRole("button", { name: "Refunded" })).toBeDisabled();

  await page.goto("/admin/orders/");
  await expect(ordersTable(page).getByRole("row").nth(1)).toContainText("Refunded");
  await page.goto("/account/");
  await expect(page.getByRole("heading", { name: "Hi Sarah" })).toBeVisible();
  await expect(page.locator("main")).not.toContainText("N°03");
});

test("Support refunds up to $50 only", async ({ page }) => {
  test.skip(isPhone(page), "desktop flow");
  await fresh(page);
  await adminLogin(page);
  await page.getByRole("button", { name: /Demo data/ }).click();
  await page.getByRole("menuitemradio", { name: /^Support/ }).click();
  await expect(page.getByText("Lucas · Support")).toBeVisible();

  await page.goto("/admin/orders/detail/?number=GS-2038");
  await page.getByRole("button", { name: "Refund…" }).click();
  const dialog = page.getByRole("dialog", { name: "Refund #GS-2038" });
  await dialog.getByRole("button", { name: /Full order/ }).click();
  await expect(dialog.getByRole("alert")).toContainText("Support can refund up to $50");
  await expect(dialog.getByRole("button", { name: /^Refund \$106/ })).toBeDisabled();
  await dialog.getByRole("button", { name: /Guide only/ }).click();
  await dialog.getByRole("button", { name: /^Refund \$25/ }).click();
  await expect(page.getByText(/^Partly refunded · paid/)).toBeVisible();
  // Support does not ship prints.
  await expect(page.getByRole("button", { name: /Mark as shipped/ })).toHaveCount(0);
});

test("unknown order number", async ({ page }) => {
  await fresh(page);
  await adminLogin(page);
  await page.goto("/admin/orders/detail/?number=GS-9999");
  await expect(page.getByText("There is no order #GS-9999.")).toBeVisible();
  await page.getByRole("link", { name: "Back to orders" }).click();
  await expect(page).toHaveURL(/\/admin\/orders\/?$/);
});

test("phone: one-tap mark as shipped", async ({ page }) => {
  test.skip(!isPhone(page), "phone board");
  await fresh(page);
  await adminLogin(page);
  await page.goto("/admin/orders/");
  await expect(page.getByRole("heading", { name: "To ship · 3" })).toBeVisible();
  await expectNoAxeViolations(page);
  await page.getByRole("button", { name: "Mark as shipped" }).first().click();
  await expect(page.getByRole("button", { name: /Shipped · customer notified/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "To ship · 2" })).toBeVisible();

  await page.getByRole("link", { name: "#GS-2036" }).click();
  await expect(page.getByRole("heading", { name: "#GS-2036 · $49" })).toBeVisible();
  await page.getByLabel("Tracking number").fill("6A 123 456 789 01");
  await page.getByRole("button", { name: "Mark as shipped" }).click();
  await expect(page.getByRole("button", { name: "Shipped · Sarah notified" })).toBeVisible();
  await expectNoAxeViolations(page);
});
