import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { formatPrice, getAiPipeline } from "./helpers";

/** The AI pipeline at the e2e clock: board jobs and simulated ones (docs/admin-v2/01 §4). */
const AI = await getAiPipeline();
const APPROVED = AI.candidates.filter((c) => c.status === "approved").length;
const REJECTED = AI.candidates.filter((c) => c.status === "rejected").length;

/** M6: guide editor (edit, publish, the reader follows) and AI pipeline (jobs, approve, reject, badge). */

const N03 = "/admin/works/n03/guide/00000000-0000-0000-0000-0000000000a3/";
const STAFF = { customer: null, staff: { staffId: "staff-lucas", email: "lucas@geste.studio", fullName: "Lucas", role: "owner", aal2: true, signedInAt: "2026-10-02T08:00:00Z" } };
const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768;

async function asStaff(page: Page, role = "owner") {
  await page.goto("/");
  await page.evaluate((s) => {
    localStorage.clear();
    localStorage.setItem("geste.session.v1", JSON.stringify(s));
  }, { ...STAFF, staff: { ...STAFF.staff, role } });
}

async function expectNoAxeViolations(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
}

test("edit a step, publish, the reader reads the new version", async ({ page }) => {
  await asStaff(page);
  await page.goto(`${N03}?step=2c`);
  await expect(page.getByText("Step c · layer 02")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Published/ })).toBeVisible();
  await expectNoAxeViolations(page);

  const text = "Top right: one wide block of ultramarine, then two strokes of night over it.";
  await page.getByLabel("Instruction", { exact: true }).fill(text);
  await page.getByLabel("Brush", { exact: true }).selectOption("Palette knife");
  await expect(page.getByRole("button", { name: /^Publish changes/ })).toBeVisible();
  // Autosaved: a reload keeps the draft.
  await page.reload();
  await expect(page.getByLabel("Instruction", { exact: true })).toHaveValue(text);
  await expect(page.getByLabel("Brush", { exact: true })).toHaveValue("Palette knife");
  await page.getByRole("button", { name: /^Publish changes/ }).click();
  await expect(page.getByRole("button", { name: /^Published/ })).toBeVisible();
  await expect(page.getByText(/^Version 2 · autosaved/)).toBeVisible();

  // Camille's reader, same browser: the published version 2.
  await page.evaluate(() => {
    localStorage.setItem("geste.session.v1", JSON.stringify({ customer: { userId: "cus-camille-martin", email: "camille.martin@mail.com", fullName: "Camille Martin", firstName: "Camille", method: "password", signedInAt: "2026-10-01T10:00:00Z" }, staff: null }));
  });
  await page.goto("/learn/ent-2041-1/?step=2c");
  await expect(page.getByText(text).first()).toBeVisible();
});

test("add a step: empty steps block Publish", async ({ page }) => {
  test.skip(isPhone(page), "desktop editor flow");
  await asStaff(page, "content");
  await page.goto(`${N03}?step=3e`);
  await page.getByRole("button", { name: "+ Add a step" }).click();
  await expect(page).toHaveURL(/step=3f/);
  await expect(page.getByText("Step f · layer 03")).toBeVisible();
  await page.getByRole("button", { name: /^Publish changes/ }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Write step 3f before publishing" })).toBeVisible();
  // The layer's own fields: painting time and drying time.
  await page.getByRole("button", { name: "02 Gestures" }).click();
  await expect(page.getByText("Layer 02", { exact: true })).toBeVisible();
  await page.getByLabel("Painting time").fill("50");
  await page.getByLabel("Drying timer").fill("40 min");
  await page.reload();
  await expect(page.getByLabel("Painting time")).toHaveValue("50");
  await expect(page.getByLabel("Drying timer")).toHaveValue("40 min");
});

test("roles: support cannot open the guide editor or the AI pipeline", async ({ page }) => {
  await asStaff(page, "support");
  await page.goto(`${N03}?step=1a`);
  await expect(page.getByText("The Support role cannot open this page.")).toBeVisible();
  await page.goto("/admin/ai/");
  await expect(page.getByText("The Support role cannot open this page.")).toBeVisible();
});

test("AI pipeline: start a job, approve and reject, the badge follows", async ({ page }) => {
  await asStaff(page);
  await page.goto("/admin/ai/");
  await expect(page.getByText(`To validate · ${AI.toValidate}`).first()).toBeVisible();
  await expectNoAxeViolations(page);
  const badge = page.getByRole("link", { name: /^AI pipeline/ });
  if (!isPhone(page)) await expect(badge).toHaveText(new RegExp(`${AI.toValidate}$`));

  await page.getByRole("button", { name: "Approve C-115-a" }).click();
  await page.getByRole("button", { name: "Reject C-115-b" }).click();
  await expect(page.getByText(`To validate · ${AI.toValidate - 2}`).first()).toBeVisible();
  // Decided cards leave the list for "Decided"; an approved one links to its draft work.
  await page.getByRole("button", { name: /^Decided/ }).click();
  await expect(page.getByText("✓ Approved → Works (draft)")).toHaveCount(APPROVED + 1);
  await expect(page.getByText("✕ Rejected")).toHaveCount(REJECTED + 1);
  await page.getByRole("button", { name: /^To validate/ }).click();
  if (!isPhone(page)) await expect(badge).toHaveText(new RegExp(`${AI.toValidate - 2}$`));

  // New job: queued with its estimate, then running.
  await page.getByLabel("Candidates").fill("4");
  await expect(page.getByRole("button", { name: /Generate 4 candidates/ })).toContainText("≈ $0.70 GPU");
  await page.getByRole("button", { name: /Generate 4 candidates/ }).click();
  await expect(page.getByRole("button", { name: new RegExp(`Queued · Job ${AI.nextJobNumber}`) })).toBeVisible();
  await expect(page.getByRole("cell", { name: `Job ${AI.nextJobNumber}` })).toBeVisible();
  await expect(page.getByText(`GPU this month: ${formatPrice(AI.budget.spentCents + 70)} of ${formatPrice(AI.budget.budgetCents)} budget`)).toBeVisible();

  // Over the budget: blocked.
  // At most 10 candidates: what the worker returns.
  await page.getByLabel("Candidates").fill("24");
  await expect(page.getByText("Between 1 and 10")).toBeVisible();
  await page.getByLabel("Candidates").fill("10");
  await page.getByLabel("Max strokes").fill("400");
  await expect(page.getByRole("button", { name: /Generate 10 candidates/ })).toBeEnabled();
  // This month's spend near the budget (set away from the page: its worker writes the same store).
  await page.goto("/");
  // The job just started costs what is left of the budget but $1: 10 candidates no longer fit.
  await page.evaluate((cents) => {
    const raw = JSON.parse(localStorage.getItem("geste.admin.v2") ?? "{}");
    raw.inserts.ai_jobs[0].costCents = cents;
    localStorage.setItem("geste.admin.v2", JSON.stringify(raw));
  }, AI.budget.budgetCents - AI.budget.spentCents - 100);
  await page.goto("/admin/ai/");
  await page.getByLabel("Candidates").fill("10");
  await expect(page.getByRole("button", { name: /Generate 10 candidates/ })).toBeDisabled();
  await expect(page.getByRole("alert").filter({ hasText: "Budget reached" })).toBeVisible();

  // The simulated worker ends job 116 (88 %): its candidates arrive.
  await expect(page.getByText("C-116-a")).toBeVisible({ timeout: 40_000 });
});
