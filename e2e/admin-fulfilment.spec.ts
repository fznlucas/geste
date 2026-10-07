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

test("external lab: Send to lab, the copy waits at the lab and comes back printed after the turnaround", async ({ page }) => {
  await signIn(page);
  // In-house printing (default): no "Send to lab".
  await page.goto("/admin/fulfilment/");
  await expect(page.getByText(/^Print lab: in-house printer/)).toBeVisible();
  await expect(page.getByRole("button", { name: /to the lab$/ })).toHaveCount(0);
  await page.goto("/admin/settings/?tab=Shipping");
  await page.getByRole("switch", { name: "Print with an external lab (Atelier Tirage, Paris)" }).click();
  await page.goto("/admin/fulfilment/");
  await expect(page.getByText(/^Print lab: Atelier Tirage, Paris · 2 working days/)).toBeVisible();
  const card = column(page, "To print").getByRole("article", { name: new RegExp(`#${CAMILLE}`) });
  await card.getByRole("button", { name: new RegExp(`^Send #${CAMILLE} · .+ to the lab$`) }).click();
  // Sent on Friday Oct 2: back on Tuesday Oct 6 at 10:00 (two working days).
  await expect(page.getByText("Sent to Atelier Tirage, Paris · back Oct 6, 10:00")).toBeVisible();
  await expect(card).toContainText("At the lab · back Oct 6, 10:00");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("geste.admin.v2") ?? "{}"));
  expect(stored.inserts.integration_logs[0]).toMatchObject({ integration: "print-lab", operation: "send print file", ok: true });
  expect(stored.audit[0].summary).toMatch(new RegExp(`^Lucas sent N°07 S .+ \\(#${CAMILLE}\\) to Atelier Tirage, Paris$`));
  await expectNoAxeViolations(page);
  // After the turnaround it is printed: in Printed & signed, its certificate in the log.
  await page.goto("/admin/fulfilment/?simNow=2026-10-06T08:30:00Z");
  await expect(column(page, "Printed & signed").getByRole("article", { name: new RegExp(`#${CAMILLE}`) })).toBeVisible();
});

test("supplies: stock from what was used, a low item raises an alert, Reorder emails the supplier and books the purchase", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/fulfilment/");
  const supplies = page.getByRole("table", { name: "Supplies" });
  const tubes = supplies.getByRole("row", { name: /^Tubes/ });
  await expect(tubes).toContainText(/\d+ left/);
  await expect(tubes).toContainText("Low · reorder at 10");
  // The alert names it (desktop alerts popover; the phone's Alerts tab keeps the boards' urgent ones).
  if ((page.viewportSize()?.width ?? 1440) >= 768) {
    await page.getByRole("button", { name: /^Alerts/ }).click();
    await expect(page.getByRole("link", { name: /^Tubes: \d+ left · reorder/ })).toBeVisible();
    await page.keyboard.press("Escape");
  }
  await tubes.getByRole("button", { name: "Reorder 50 tubes · €90.00" }).click();
  await expect(page.getByText(/^50 tubes ordered · €90\.00 · arrives Oct 6 · email in the Outbox$/)).toBeVisible();
  await expect(tubes).toContainText("50 on their way · Oct 6");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("geste.admin.v2") ?? "{}"));
  expect(stored.inserts.supply_orders[0]).toMatchObject({ item: "tubes", quantity: 50, cents: 9000 });
  expect(stored.inserts.outbox[0]).toMatchObject({ to: "orders@papeterie-lemaire.example", subject: "Reorder · 50 tubes", template: "supplier_reorder" });
  expect(stored.audit[0].summary).toBe("Lucas reordered 50 tubes from Papeterie Lemaire · €90.00");
  await expectNoAxeViolations(page);
  // Arrived: back to OK.
  await page.goto("/admin/fulfilment/?simNow=2026-10-06T13:00:00Z");
  await expect(page.getByRole("table", { name: "Supplies" }).getByRole("row", { name: /^Tubes/ })).toContainText("OK · reorder at 10");
});

test("shipping from the board ships the order", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/fulfilment/");
  // Inès's print was packed by "Lucas · simulated" once out of the 48 h window (docs/decisions.md).
  await expect(column(page, "Packed").getByRole("article", { name: new RegExp(`#${INES}`) })).toBeVisible();
  await page.getByRole("button", { name: `Move #${INES} to Shipped` }).click();
  await expect(column(page, "Shipped").getByRole("article", { name: new RegExp(`#${INES}`) })).toBeVisible();
  // Not scanned by the carrier yet: it can come back to Packed, then leave again.
  await page.getByRole("button", { name: `Move #${INES} back to Packed` }).click();
  await expect(column(page, "Packed").getByRole("article", { name: new RegExp(`#${INES}`) })).toBeVisible();
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

test("edit an edition in its drawer, the one place: the work editor shows the summary and links there", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/editions/");
  const row = page.getByRole("row", { name: /N°07 M ·/ });
  await row.getByRole("button", { name: "Edit N°07 M" }).click();
  const drawer = page.getByRole("dialog", { name: /N°07 · Print M/ });
  await expect(drawer.getByLabel("Price")).toHaveValue("$95");
  // Never below the copies taken.
  await drawer.getByLabel("Edition size").fill("1");
  await expect(drawer.getByText(/^At least \d+$/)).toBeVisible();
  await expect(drawer.getByRole("button", { name: "Save edition" })).toBeDisabled();
  await drawer.getByLabel("Edition size").fill("60");
  await drawer.getByLabel("Price").fill("$99");
  await drawer.getByLabel("Paper").selectOption("Cotton rag 310 g · baryta");
  await expectNoAxeViolations(page);
  await drawer.getByRole("button", { name: "Save edition" }).click();
  await expect(page.getByText("N°07 M saved · price $95 → $99, edition 50 → 60, paper Cotton rag 310 g · baryta")).toBeVisible();
  await expect(row).toContainText("$99");
  await expect(row).toContainText("/60");
  // The work editor reads it, and links back to the drawer.
  await page.goto("/admin/works/n07/");
  await page.getByRole("button", { name: "Prints" }).click();
  const prints = page.getByRole("table", { name: "Print editions" });
  await expect(prints.getByRole("row", { name: /^M ·/ })).toContainText("60 copies");
  await expect(prints.getByRole("row", { name: /^M ·/ })).toContainText("$99");
  await prints.getByRole("link", { name: "Edit in Print editions · N°07 M" }).click();
  await expect(page.getByRole("dialog", { name: /N°07 · Print M/ }).getByLabel("Price")).toHaveValue("$99");
});

test("content reads an edition, fulfilment edits it", async ({ page }) => {
  await signIn(page, "content");
  await page.goto("/admin/editions/");
  await page.getByRole("row", { name: /N°07 M ·/ }).getByRole("button", { name: "View N°07 M" }).click();
  const drawer = page.getByRole("dialog", { name: /N°07 · Print M/ });
  await expect(drawer.getByLabel("Price")).toBeDisabled();
  await expect(drawer.getByText("Read only: the owner and Fulfilment edit editions.")).toBeVisible();
  await expect(drawer.getByRole("button", { name: "Save edition" })).toHaveCount(0);
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
  // The quota of one chosen guide.
  await page.getByLabel("Print quota of").selectOption({ label: "N°03 · 2 left" });
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByRole("button", { name: "Reset to 3" })).toBeVisible();
  await expect(n03).toContainText("3 prints left");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Camille’s data" }).click();
  expect((await download).suggestedFilename()).toBe("geste-cus-camille-martin.json");
  await page.getByRole("button", { name: "Delete account…" }).click();
  await expect(page.getByRole("button", { name: "Click again to confirm" })).toBeVisible();
  await page.getByRole("button", { name: "Click again to confirm" }).click();
  // A visible countdown, and it can be cancelled.
  await expect(page.getByRole("button", { name: /^Deletion on .+ · 30 days left$/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: /^Deletion on .+ · 30 days left$/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel the deletion" })).toBeVisible();
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
