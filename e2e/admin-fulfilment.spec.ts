import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { copiesLeft, getCustomers, nextCopyNumber, nextOrderNumber, orderCopy, orderNumber, todoCounts } from "./helpers";

/** M6: fulfilment board, print editions, customers (docs/screens/admin.md). */

/** Numbers and counts of the simulated history at the e2e clock, read through the app (docs/admin-v2/01 §2). */
const CAMILLE = orderNumber("order-2041");
const INES = orderNumber("order-2038");
const NEXT = nextOrderNumber();
const TO_PRINT = (await todoCounts()).fulfilment;
const CAMILLE_COPY = await orderCopy("order-2041");
const N07_S = await nextCopyNumber("ed-07-s");
const N07_M_LEFT = await copiesLeft("ed-07-m");
const CUSTOMERS = await getCustomers();

const STAFF = (role = "owner") => ({ customer: null, staff: { staffId: "staff-lucas", email: "lucas@geste.studio", fullName: "Lucas", role, aal2: true, signedInAt: "2026-10-02T08:00:00Z" } });

async function signIn(page: Page, role = "owner", keep = false) {
  await page.goto("/");
  await page.evaluate(([session, keep]) => {
    if (!keep) localStorage.clear();
    localStorage.setItem("geste.session.v1", JSON.stringify(session));
  }, [STAFF(role), keep] as const);
}

async function expectNoAxeViolations(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
}

const column = (page: Page, title: string) => page.locator("section", { has: page.getByRole("heading", { name: title, exact: true }) });

test("a print moves along the fulfilment board and back", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/fulfilment/");
  await expect(column(page, "To print").getByRole("article")).toHaveCount(TO_PRINT);
  await page.getByRole("button", { name: `Move #${CAMILLE} to Printed & signed` }).click();
  await expect(column(page, "Printed & signed").getByRole("article", { name: new RegExp(`#${CAMILLE}`) })).toBeVisible();
  await expect(column(page, "To print").getByRole("article")).toHaveCount(TO_PRINT - 1);
  // Printed & signed: the certificate is in the log.
  await page.getByRole("link", { name: "Edition stock" }).click();
  await expect(page.getByRole("list", { name: "Certificates" }).getByRole("listitem").first()).toContainText(`#${CAMILLE_COPY.certificateNo}`);
  await page.goBack();
  await page.getByRole("button", { name: `Move #${CAMILLE} back to To print` }).click();
  await expect(column(page, "To print").getByRole("article", { name: new RegExp(`#${CAMILLE}`) })).toBeVisible();
  await expectNoAxeViolations(page);
});

test("shipping from the board ships the order", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/fulfilment/");
  await page.getByRole("button", { name: `Move #${INES} to Packed` }).click();
  await page.getByRole("button", { name: `Move #${INES} to Shipped` }).click();
  await expect(column(page, "Shipped").getByRole("article", { name: new RegExp(`#${INES}`) })).toBeVisible();
  await page.goto("/admin/customers/detail/?id=cus-ines-moreau");
  await expect(page.getByRole("link", { name: new RegExp(`#${INES}`) })).toContainText("Shipped");
});

test("a print bought at checkout lands in To print and in the edition stock", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("geste.cart.v2", JSON.stringify([{ id: "l2", addedAt: "2026-10-01T10:01:00Z", kind: "print", editionId: "ed-07-s", quantity: 1 }]));
  });
  await page.goto("/checkout/");
  await page.getByRole("button", { name: "Apple Pay" }).click();
  await expect(page).toHaveURL(new RegExp(`checkout/success/?\\?order=${NEXT}`));
  await signIn(page, "fulfilment", true);
  await page.goto("/admin/fulfilment/");
  const card = column(page, "To print").getByRole("article", { name: new RegExp(`#${NEXT}`) });
  await expect(card).toContainText(`N°07 · S · ${N07_S}/100`);
  await expect(card).toContainText("Camille Martin · Lyon");
  await page.goto("/admin/editions/");
  await expect(page.getByRole("row", { name: /N°07 S ·/ })).toContainText(`${N07_S}/100`);
});

test("close and reopen an edition", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/editions/");
  const row = page.getByRole("row", { name: /N°07 M ·/ });
  await row.getByRole("button", { name: "Close edition N°07 M" }).click();
  await expect(row).toContainText("closed");
  await row.getByRole("button", { name: "Reopen N°07 M" }).click();
  await expect(row).toContainText(String(N07_M_LEFT));
  await expect(page.getByRole("row", { name: /N°08 L ·/ }).getByRole("cell").nth(5)).toHaveClass(/text-danger/);
  await expectNoAxeViolations(page);
});

test("customers: segments, detail, print quota and GDPR in two clicks", async ({ page }) => {
  await signIn(page, "support");
  await page.goto("/admin/customers/");
  await expect(page.getByText(`${CUSTOMERS.length} customers`)).toBeVisible();
  await page.getByRole("button", { name: "Abroad" }).click();
  await expect(page.getByText(`${CUSTOMERS.filter((c) => c.country !== "FR").length} customers`)).toBeVisible();
  await expectNoAxeViolations(page);
  await page.getByRole("button", { name: "All", exact: true }).click();
  // Simulated customers can share her name: open the fixture Camille by her row's link.
  await page.locator('a[href*="id=cus-camille-martin"]').click();
  await expect(page).toHaveURL(/\/admin\/customers\/detail\/?\?id=cus-camille-martin$/);
  await expect(page.getByRole("heading", { name: "Camille Martin", level: 1 })).toBeVisible();
  const n03 = page.getByRole("row", { name: /N°03/ });
  await expect(n03).toContainText("2 prints left");
  await page.getByRole("button", { name: "Reset print quota" }).click();
  await expect(page.getByRole("button", { name: "Print quota reset to 3" })).toBeVisible();
  await expect(n03).toContainText("3 prints left");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Camille’s data" }).click();
  expect((await download).suggestedFilename()).toBe("geste-cus-camille-martin.json");
  await page.getByRole("button", { name: "Delete account…" }).click();
  await expect(page.getByRole("button", { name: "Click again to confirm" })).toBeVisible();
  await page.getByRole("button", { name: "Click again to confirm" }).click();
  await expect(page.getByRole("button", { name: "Deletion scheduled (30 days)" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Deletion scheduled (30 days)" })).toBeVisible();
  await expectNoAxeViolations(page);
});

test("roles: fulfilment cannot open customers, support cannot open fulfilment", async ({ page }) => {
  await signIn(page, "fulfilment");
  await page.goto("/admin/customers/");
  await expect(page.getByText("The Fulfilment role cannot open this page.")).toBeVisible();
  await signIn(page, "support");
  await page.goto("/admin/fulfilment/");
  await expect(page.getByText("The Support role cannot open this page.")).toBeVisible();
});
