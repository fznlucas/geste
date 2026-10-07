import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** M6 catalog: /admin/works (AdminCatalog) and the work editor (AdminWorkEditor). */

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768;

async function asStaff(page: Page, role = "owner") {
  await page.goto("/admin/login/");
  await page.evaluate((r) => {
    localStorage.clear();
    localStorage.setItem(
      "geste.session.v1",
      JSON.stringify({ customer: null, staff: { staffId: "staff-lucas", email: "lucas@geste.studio", fullName: "Lucas", role: r, aal2: true, signedInAt: "2026-10-02T08:00:00Z" } }),
    );
  }, role);
}

async function expectNoAxeViolations(page: Page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
}

const cards = (page: Page) => page.locator("main [data-grid-item]");

test("works: filter tabs and grid / list", async ({ page }) => {
  await asStaff(page);
  await page.goto("/admin/works/");
  await expect(cards(page)).toHaveCount(15);
  await page.getByRole("button", { name: "Needs test" }).click();
  await expect(cards(page)).toHaveCount(2); // N°06 and N°09 are not painted yet
  await expect(page.getByText("Not painted").filter({ visible: true })).toHaveCount(2);
  await page.getByRole("button", { name: "Drafts" }).click();
  await expect(page.getByText("No works here yet.")).toBeVisible();
  await page.getByRole("button", { name: /^All · \d+$/ }).click();
  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(page.getByRole("button", { name: "List", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("table", { name: "Works" }).getByRole("row")).toHaveCount(16);
  await expectNoAxeViolations(page);
  await page.getByRole("link", { name: "N°03" }).click();
  await expect(page).toHaveURL(/\/admin\/works\/n03\/?$/);
});

test("work editor: edit and save, the catalog shows the change", async ({ page }) => {
  await asStaff(page);
  await page.goto("/admin/works/n03/");
  await expect(page.getByRole("heading", { name: "N°03" })).toBeVisible();
  await expect(page.getByText("3 layers · 15 steps")).toBeVisible();
  await page.getByLabel("Description").fill("Wide strokes over a thin underlayer.");
  await page.getByRole("button", { name: "Formats & prices" }).click();
  // N°03 is 5:6, Intermediate: 38×46 Beginner, 50×60 Intermediate, 60×73 Advanced.
  await expect(page.getByLabel("Base level (medium)")).toHaveValue("intermediate");
  const formats = page.getByRole("table", { name: "Formats and prices" });
  await expect(formats.getByRole("row", { name: /^38×46/ })).toContainText("Beginner");
  await expect(formats.getByRole("row", { name: /^60×73/ })).toContainText("Advanced");
  await expect(page.getByLabel("Price 60×73")).toHaveValue("$25");
  await page.getByLabel("Price 60×73").fill("$27");
  await page.getByLabel("Signature work · +$6 on every format").check();
  await expect(formats.getByRole("row", { name: /^60×73/ })).toContainText("$33");
  await expect(page.getByLabel("Price S")).toHaveValue("$55");
  await page.getByRole("button", { name: "SEO" }).click();
  await page.getByLabel("Page title").fill("N°03 — paint it · Geste");
  await page.getByRole("button", { name: /Save changes/ }).click();
  await expect(page.getByRole("button", { name: /Saved · live/ })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Description")).toHaveValue("Wide strokes over a thin underlayer.");
  await page.getByRole("button", { name: "Formats & prices" }).click();
  await expect(page.getByLabel("Price 60×73")).toHaveValue("$27");
  await expect(page.getByLabel("Signature work · +$6 on every format")).toBeChecked();
  await expectNoAxeViolations(page);
  const log = await page.evaluate(() => JSON.parse(localStorage.getItem("geste.admin.v2") ?? "{}").audit?.[0]?.summary);
  expect(log).toBe("Lucas edited N°03 · General, Formats & prices, SEO");
});

test("the checklist blocks Live until the real result photo is there", async ({ page }) => {
  test.skip(isPhone(page), "same flow on desktop");
  await asStaff(page);
  await page.goto("/admin/works/n09/");
  await page.getByLabel("Status").selectOption("draft");
  await page.getByRole("button", { name: /Save changes/ }).click();
  await expect(page.getByRole("button", { name: /Saved · draft/ })).toBeVisible();
  await page.getByLabel("Status").selectOption("live");
  await expect(page.getByText("Complete the checklist before going live.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Save changes/ })).toBeDisabled();
  // Painted by the studio + a submitted photo complete the checklist.
  await page.locator('input[type="file"]').nth(1).setInputFiles({ name: "test.jpg", mimeType: "image/jpeg", buffer: Buffer.from("x") });
  await expect(page.getByText("Painted by the studio")).toBeVisible();
  await page.getByRole("button", { name: "Pick from submitted results" }).click();
  await page.getByRole("button", { name: "Photo by Tom Laurent" }).click();
  await expect(page.getByText("Real result photo", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Save changes/ })).toBeEnabled();
  await page.getByRole("button", { name: /Save changes/ }).click();
  await expect(page.getByRole("button", { name: /Saved · live/ })).toBeVisible();
  await page.goto("/admin/works/");
  await page.getByRole("button", { name: "Drafts" }).click();
  await expect(page.getByText("No works here yet.")).toBeVisible();
});

test("new work: a draft with its own editor", async ({ page }) => {
  await asStaff(page, "content");
  await page.goto("/admin/works/");
  await page.getByRole("button", { name: /New work/ }).first().click();
  await expect(page).toHaveURL(/\/admin\/works\/draft\/?\?slug=n16/);
  await expect(page.getByRole("heading", { name: "N°16" })).toBeVisible();
  await expect(page.getByText("Preview image missing")).toBeVisible();
  await page.goto("/admin/works/");
  await page.getByRole("button", { name: "Drafts" }).click();
  await expect(cards(page)).toHaveCount(1);
  await expect(page.getByText("No preview yet")).toBeVisible();
});

test("works are hidden from the support role", async ({ page }) => {
  await asStaff(page, "support");
  await page.goto("/admin/works/");
  await expect(page.getByText("The Support role cannot open this page.")).toBeVisible();
});
