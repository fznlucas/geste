import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { analytics, eur, finance, financePeriodSlug, getSocialWeek, orderNumber } from "./helpers";

/** The analytics of the simulated history at the e2e clock (docs/admin-v2/01 §2). */
const A = await analytics("30 days");
const DROPS = A.completion.steps.filter((s) => s.drop);
/** The books of the default period (last full month) at the e2e clock, EUR excl. VAT. */
const F = await finance();
const FIN_ROW = (key: string) => F.pnl.find((r) => r.key === key)!;

/** M6 growth: /admin/analytics, /admin/finance, /admin/marketing, /admin/settings (owner only). */

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768;

async function asStaff(page: Page, role = "owner", extra: Record<string, unknown> = {}) {
  await page.goto("/admin/login/");
  await page.evaluate(
    ([r, x]) => {
      localStorage.clear();
      localStorage.setItem(
        "geste.session.v1",
        JSON.stringify({ customer: null, staff: { staffId: "staff-lucas", email: "lucas@geste.studio", fullName: "Lucas", role: r, aal2: true, signedInAt: "2026-10-02T08:00:00Z" } }),
      );
      for (const [k, v] of Object.entries(x as Record<string, unknown>)) localStorage.setItem(k, JSON.stringify(v));
    },
    [role, extra] as const,
  );
}

async function expectNoAxeViolations(page: Page) {
  // Admin toasts fade in and leave after 1.6 s: check the page without them.
  await expect(page.locator('[class*="rise-in"]')).toHaveCount(0, { timeout: 4000 });
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
}

const tab = (page: Page, name: string) => page.getByRole("button", { name, exact: true });

test("analytics: funnel, completion drops and ranges", async ({ page }) => {
  await asStaff(page);
  await page.goto("/admin/analytics/");
  await expect(page.getByRole("heading", { name: "Funnel · last 30 days" })).toBeVisible();
  await expect(page.getByText(`Biggest leak: ${A.leak.from} → ${A.leak.to} (${A.leak.pct}%).`, { exact: false })).toBeVisible();
  await expect(page.getByText(`Drops at ${DROPS.map((d) => `${d.step} (−${d.drop!.points} pts)`).join(" and ")}`)).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit these steps" })).toHaveAttribute("href", /\/admin\/works\/n03\/guide\//);
  await expectNoAxeViolations(page);
  await tab(page, "7 days").click();
  await expect(tab(page, "7 days")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "Funnel · last 7 days" })).toBeVisible();
});

test("finance: P&L adds up and the CSV downloads", async ({ page }) => {
  await asStaff(page);
  await page.goto("/admin/finance/");
  await expect(page.getByRole("rowheader", { name: "Gross margin" })).toBeVisible();
  await expect(page.getByRole("row", { name: /^Operating result/ })).toContainText(eur(F.netCents));
  await expect(page.getByRole("row", { name: /^Turnover \(excl\. VAT\)/ })).toContainText(eur(F.revenueCents));
  await expectNoAxeViolations(page);
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export for accountant (CSV)" }).click()]);
  expect(download.suggestedFilename()).toBe(`geste-finance-${financePeriodSlug(F.period)}.csv`);
  const csv = await (await download.createReadStream()).toArray().then((c) => Buffer.concat(c).toString("utf8"));
  const op = FIN_ROW("operating");
  expect(csv).toContain(`Operating result,${(op.cents / 100).toFixed(2)},${op.sharePct}`);
  const be = F.vat.find((v) => v.country.startsWith("Belgium"))!;
  expect(csv).toContain(`${be.country},${be.rate},${(be.cents! / 100).toFixed(2)}`);
  await expect(page.getByRole("button", { name: "CSV downloaded" })).toBeVisible();
});

test("marketing: tabs, create a promo code, gift cards bought here", async ({ page }) => {
  // A gift card bought at checkout in this browser (what purchases.ts keeps).
  const order = {
    id: "order-local-2042", number: "GS-2042", userId: "cus-camille-martin", email: "camille.martin@mail.com", status: "paid",
    subtotalCents: 3000, discountCents: 0, shippingCents: 0, shippingMethod: null, taxCents: 500, totalCents: 3000, shippingAddress: null,
    stripePaymentIntent: "pi_mock_local_2042", cardLast4: "4242", risk: "low", withdrawalWaived: false,
    paidAt: "2026-10-02T11:59:59.999Z", createdAt: "2026-10-02T11:59:59.999Z",
    items: [{ id: "item-local-2042-1", kind: "gift_card", workId: null, guideId: null, editionId: null, config: {}, title: "Gift card $30", detail: "Sent by email", unitPriceCents: 3000, quantity: 1, discountCents: 0, fulfilment: "not_required" }],
  };
  await asStaff(page, "owner", { "geste.purchases.v2": { orders: [order], entitlements: [], copies: [], receipts: [] } });
  await page.goto("/admin/marketing/");
  await expect(page.getByRole("rowheader", { name: "FIRSTCANVAS" })).toBeVisible();
  await expectNoAxeViolations(page);

  const code = page.getByLabel("Code", { exact: true });
  await code.fill("fall20");
  await expect(code).toHaveValue("FALL20");
  await page.getByLabel("Discount").selectOption("−20%");
  await page.getByRole("button", { name: /Create code/ }).click();
  await expect(page.getByRole("row", { name: /FALL20/ })).toContainText("−20% guides");
  await expect(page.getByRole("row", { name: /FALL20/ })).toContainText("Not shared yet");
  await page.getByLabel("Code", { exact: true }).fill("FALL20");
  await page.getByRole("button", { name: /Create code/ }).click();
  await expect(page.getByText("This code already exists")).toBeVisible();

  await tab(page, "Gift cards").click();
  await expect(page.getByRole("row", { name: /GESTE-2042-0001/ })).toContainText("Camille Martin → by email");
  await expect(page.getByRole("row", { name: /GESTE-4F2K-91AA/ })).toContainText("Sent, unused");

  await tab(page, "Newsletter").click();
  await expect(page.getByLabel("Subject")).toHaveValue("N°10 is out, and a trick for layer 2");
  await page.getByRole("button", { name: /Schedule for Tuesday/ }).click();
  await expect(page.getByRole("button", { name: /Scheduled · Tue 9:00/ })).toHaveAttribute("aria-pressed", "true");
  await expectNoAxeViolations(page);

  await tab(page, "Affiliate").click();
  await expect(page.getByRole("rowheader", { name: "Art supply store A" })).toBeVisible();
  await tab(page, "Social calendar").click();
  // The week's posts come from the social rows (read through the app at the e2e clock).
  const post = (await getSocialWeek()).days.flatMap((d) => d.posts)[0];
  if (post) await expect(page.getByText(`${{ tiktok: "TikTok", instagram: "Instagram", pinterest: "Pinterest", youtube: "YouTube" }[post.network]} · ${post.title}`).first()).toBeVisible();
  await page.getByRole("button", { name: /^Plan a post on/ }).first().click();
  await page.getByLabel("Title").fill("Reel · layer 2 in 30 s");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText("TikTok · Reel · layer 2 in 30 s")).toBeVisible();
});

test("settings: invite, audit log, remove", async ({ page }) => {
  await asStaff(page);
  await page.goto("/admin/settings/");
  await expect(page.getByLabel("Store name")).toHaveValue("Geste Studio");
  await expectNoAxeViolations(page);

  await tab(page, "Team & roles").click();
  await page.getByRole("button", { name: /^Invite/ }).click();
  await expect(page.locator("#tm-mail-err")).toHaveText("Enter an email");
  await page.getByLabel("Email").fill("Nora@Example.com");
  await page.getByRole("combobox", { name: "Role" }).selectOption("content");
  await page.getByRole("button", { name: /^Invite/ }).click();
  const row = page.getByRole("row", { name: /nora@example\.com/ });
  await expect(row).toContainText("Content editor");
  await expect(row).toContainText("Invite sent");
  await expect(page.getByRole("table", { name: "Permissions by role" })).toBeVisible();
  await expectNoAxeViolations(page);

  await tab(page, "Security").click();
  const log = page.getByRole("table", { name: "Audit log, newest first" });
  await expect(log.getByRole("row").first()).toContainText("Lucas invited nora@example.com as Content editor");
  await expect(log).toContainText(`Lucas marked #${orderNumber("order-2033")} as shipped`);

  await tab(page, "Team & roles").click();
  await page.getByRole("button", { name: "Remove nora@example.com" }).click();
  await expect(page.getByRole("row", { name: /nora@example\.com/ })).toHaveCount(0);
  await tab(page, "Security").click();
  await expect(log.getByRole("row").first()).toContainText("Lucas removed nora@example.com from the team");
});

test("an invited member signs in with the invite's role and 2FA", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 1440) < 768, "desktop flow");
  await asStaff(page);
  await page.goto("/admin/settings/");
  await tab(page, "Team & roles").click();
  await page.getByLabel("Email").fill("nora@example.com");
  await page.getByRole("combobox", { name: "Role" }).selectOption("content");
  await page.getByRole("button", { name: /^Invite/ }).click();
  await expect(page.getByRole("row", { name: /nora@example\.com/ })).toContainText("Invite sent");

  // Nora signs in on this browser: email, password, the code of her authenticator app.
  await page.evaluate(() => localStorage.removeItem("geste.session.v1"));
  await page.goto("/admin/login/");
  await page.getByLabel("Email").fill("nora@example.com");
  await page.getByRole("button", { name: /^Continue/ }).click();
  await page.getByLabel("Password").fill("anything");
  await page.getByRole("button", { name: /^Continue/ }).click();
  await page.getByLabel("Code").fill("123456");
  await page.getByRole("button", { name: /^Log in/ }).click();
  await expect(page.getByText("Nora · Content")).toBeVisible();
  await page.goto("/admin/finance/");
  await expect(page.getByText("The Content role cannot open this page.")).toBeVisible();

  // The owner now sees her as a member with 2FA on (same browser: the invite is kept).
  await page.evaluate(() =>
    localStorage.setItem("geste.session.v1", JSON.stringify({ customer: null, staff: { staffId: "staff-lucas", email: "lucas@geste.studio", fullName: "Lucas", role: "owner", aal2: true, signedInAt: "2026-10-02T08:00:00Z" } })),
  );
  await page.goto("/admin/settings/");
  await tab(page, "Team & roles").click();
  await expect(page.getByRole("row", { name: /nora@example\.com/ })).toContainText("On");
  await expect(page.getByRole("row", { name: /nora@example\.com/ })).not.toContainText("Invite sent");
});

test("a Support role cannot open the growth pages", async ({ page }) => {
  await asStaff(page, "support");
  for (const path of ["/admin/analytics/", "/admin/finance/", "/admin/marketing/", "/admin/settings/"]) {
    await page.goto(path);
    await expect(page.getByText("The Support role cannot open this page.")).toBeVisible();
  }
  if (!isPhone(page)) {
    const nav = page.getByRole("navigation", { name: "Admin" });
    await expect(nav.getByRole("link", { name: "Analytics" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Settings & team" })).toHaveCount(0);
  }
});
