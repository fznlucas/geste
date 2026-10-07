import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { customerSpentEur, formatMoney, formatPrice, getOrders, orderMoney, orderNumber, orderTab } from "./helpers";

/** Orders at the e2e clock: numbers in payment order, the phone's "To ship" list (docs/admin-v2/01 §2). */
const INES = orderNumber("order-2038");
const TO_SHIP_LIST = (await getOrders()).filter((o) => orderTab(o) === "to_ship");
const TO_SHIP = TO_SHIP_LIST.length;
/** The second print to ship (the first is shipped with one tap before). */
const SECOND = TO_SHIP_LIST[1]!;

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

/** Guide N°03 + print N°07 S, paid by Sarah Cohen with the Stripe success card. */
async function buyAsSarah(page: Page): Promise<string> {
  await page.evaluate(() =>
    localStorage.setItem(
      "geste.cart.v2",
      JSON.stringify([
        { id: "l1", addedAt: "2026-10-01T10:00:00Z", kind: "guide", workId: "00000000-0000-0000-0000-000000000003", format: "50x60", level: "match", palette: "original" },
        { id: "l2", addedAt: "2026-10-01T10:01:00Z", kind: "print", editionId: "ed-07-s", quantity: 1 },
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
  await expect(first).toContainText("Guide N°03 · Print N°07 S");
  await expect(first).toContainText("To ship");
  await expectNoAxeViolations(page);

  await first.getByRole("link", { name: `#${number}` }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/orders/detail/?\\?number=${number}`));
  await expect(page.getByRole("heading", { name: `Order #${number}` })).toBeVisible();
  await expect(page.getByText(/Print to ship · paid/)).toBeVisible();

  // One step at a time (docs/admin-v2/05): no label before the print is signed and packed.
  await expect(page.getByRole("button", { name: "Create shipping label" })).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByRole("button", { name: /Mark as shipped and notify/ })).toHaveAttribute("aria-disabled", "true");
  await page.getByRole("button", { name: "Mark printed & signed" }).click();
  await page.getByRole("button", { name: "Mark packed" }).click();
  await expect(page.getByRole("button", { name: "Mark packed" })).toHaveCount(0);
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
  await dialog.getByRole("button", { name: /^Refund \$80/ }).click();
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

  await page.goto(`/admin/orders/detail/?number=${INES}`);
  await page.getByRole("button", { name: "Refund…" }).click();
  const dialog = page.getByRole("dialog", { name: `Refund #${INES}` });
  await dialog.getByRole("button", { name: /Full order/ }).click();
  await expect(dialog.getByRole("alert")).toContainText("Support can refund up to $50");
  await expect(dialog.getByRole("button", { name: /^Refund \$126/ })).toBeDisabled();
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
  await expect(page.getByRole("heading", { name: `To ship · ${TO_SHIP}` })).toBeVisible();
  await expectNoAxeViolations(page);
  await page.getByRole("button", { name: "Mark as shipped" }).first().click();
  await expect(page.getByRole("button", { name: /Shipped · customer notified/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: `To ship · ${TO_SHIP - 1}` })).toBeVisible();

  await page.getByRole("link", { name: `#${SECOND.number}` }).click();
  await expect(page.getByRole("heading", { name: `#${SECOND.number} · ${formatPrice(SECOND.totalCents)}` })).toBeVisible();
  // A print still to print: sign it, pack it, then it ships with the typed tracking number.
  await page.getByRole("button", { name: "Mark printed & signed" }).click();
  await page.getByRole("button", { name: "Mark packed" }).click();
  await page.getByLabel("Tracking number").fill("6A 123 456 789 01");
  await page.getByRole("button", { name: "Mark as shipped" }).click();
  await expect(page.getByRole("button", { name: `Shipped · ${SECOND.customer.fullName.split(" ")[0]} notified` })).toBeVisible();
  await expectNoAxeViolations(page);
});

test("money display: EUR excl. VAT by default, USD as charged on demand, on the orders and customers pages", async ({ page }) => {
  test.skip(isPhone(page), "the switch is in the desktop top bar");
  const latest = [...(await getOrders())].sort((a, b) => b.paidAt.localeCompare(a.paidAt))[0]!;
  const eurCents = orderMoney([latest]).get(latest.id)!.totalExVatEurCents;
  await fresh(page);
  await adminLogin(page);
  await page.goto("/admin/orders/");
  const money = page.getByLabel("Money shown in");
  await expect(money).toHaveValue("eur");
  await expect(page.getByText(/totals in EUR excl\. VAT$/)).toBeVisible();
  const row = ordersTable(page).getByRole("row", { name: new RegExp(`#${latest.number}`) });
  await expect(row).toContainText(formatMoney(eurCents, "EUR"));
  await money.selectOption("usd");
  await expect(row).toContainText(formatMoney(latest.totalCents));
  await expect(page.getByText(/totals in USD as charged$/)).toBeVisible();
  // Kept for this viewer.
  await page.reload();
  await expect(page.getByLabel("Money shown in")).toHaveValue("usd");
  // Order detail: in euros, the books' figures.
  await page.getByLabel("Money shown in").selectOption("eur");
  await page.goto(`/admin/orders/detail?number=${latest.number}`);
  await expect(page.getByText("Total excl. VAT")).toBeVisible();
  await expect(page.getByText(formatMoney(eurCents, "EUR"), { exact: true }).first()).toBeVisible();
  // Customers: spent in EUR excl. VAT.
  await page.goto(`/admin/customers/detail/?id=${latest.customer.id}`);
  await expect(page.getByText(`${formatMoney(customerSpentEur().get(latest.customer.id) ?? 0, "EUR")} excl. VAT`)).toBeVisible();
  await expectNoAxeViolations(page);
});
