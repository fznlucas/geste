import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** M6: fulfilment board, print editions, customers (docs/screens/admin.md). */

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
  await expect(column(page, "To print").getByRole("article")).toHaveCount(3);
  await page.getByRole("button", { name: "Move #GS-2041 to Printed & signed" }).click();
  await expect(column(page, "Printed & signed").getByRole("article", { name: /#GS-2041/ })).toBeVisible();
  await expect(column(page, "To print").getByRole("article")).toHaveCount(2);
  // Printed & signed: the certificate is in the log.
  await page.getByRole("link", { name: "Edition stock" }).click();
  await expect(page.getByRole("list", { name: "Certificates" }).getByRole("listitem").first()).toContainText("#C-07-010");
  await page.goBack();
  await page.getByRole("button", { name: "Move #GS-2041 back to To print" }).click();
  await expect(column(page, "To print").getByRole("article", { name: /#GS-2041/ })).toBeVisible();
  await expectNoAxeViolations(page);
});

test("shipping from the board ships the order", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/fulfilment/");
  await page.getByRole("button", { name: "Move #GS-2038 to Packed" }).click();
  await page.getByRole("button", { name: "Move #GS-2038 to Shipped" }).click();
  await expect(column(page, "Shipped").getByRole("article", { name: /#GS-2038/ })).toBeVisible();
  await page.goto("/admin/customers/cus-ines-moreau/");
  await expect(page.getByRole("link", { name: /#GS-2038/ })).toContainText("Shipped");
});

test("a print bought at checkout lands in To print and in the edition stock", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("geste.cart.v2", JSON.stringify([{ id: "l2", addedAt: "2026-10-01T10:01:00Z", kind: "print", editionId: "ed-07-s", quantity: 1 }]));
  });
  await page.goto("/checkout/");
  await page.getByRole("button", { name: "Apple Pay" }).click();
  await expect(page).toHaveURL(/checkout\/success\/?\?order=GS-2042/);
  await signIn(page, "fulfilment", true);
  await page.goto("/admin/fulfilment/");
  const card = column(page, "To print").getByRole("article", { name: /#GS-2042/ });
  await expect(card).toContainText("N°07 · S · 12/100");
  await expect(card).toContainText("Camille Martin · Lyon");
  await page.goto("/admin/editions/");
  await expect(page.getByRole("row", { name: /N°07 S ·/ })).toContainText("12/100");
});

test("close and reopen an edition", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/editions/");
  const row = page.getByRole("row", { name: /N°07 M ·/ });
  await row.getByRole("button", { name: "Close edition N°07 M" }).click();
  await expect(row).toContainText("closed");
  await row.getByRole("button", { name: "Reopen N°07 M" }).click();
  await expect(row).toContainText("38");
  await expect(page.getByRole("row", { name: /N°08 L ·/ }).getByRole("cell").nth(5)).toHaveClass(/text-danger/);
  await expectNoAxeViolations(page);
});

test("customers: segments, detail, print quota and GDPR in two clicks", async ({ page }) => {
  await signIn(page, "support");
  await page.goto("/admin/customers/");
  await expect(page.getByText("14 customers")).toBeVisible();
  await page.getByRole("button", { name: "Abroad" }).click();
  await expect(page.getByText("7 customers")).toBeVisible();
  await expectNoAxeViolations(page);
  await page.getByRole("button", { name: "All", exact: true }).click();
  await page.getByRole("link", { name: /Camille Martin/ }).click();
  await expect(page).toHaveURL(/\/admin\/customers\/cus-camille-martin\/?$/);
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
