import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** M6 dashboard: admin login (password + code, passkey), guard, role switch, dashboard, phone Today, alerts. */

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768;

const STAFF = { customer: null, staff: { staffId: "staff-lucas", email: "lucas@geste.studio", fullName: "Lucas", role: "owner", aal2: true, signedInAt: "2026-10-02T08:00:00Z" } };

/** A guide bought at checkout in this browser (what src/lib/client/purchases.ts keeps). */
const PURCHASE = {
  orders: [{
    id: "order-local-2042", number: "GS-2042", userId: "cus-camille-martin", email: "camille.martin@mail.com", status: "paid",
    subtotalCents: 2500, discountCents: 0, shippingCents: 0, shippingMethod: null, taxCents: 417, totalCents: 2500, shippingAddress: null,
    stripePaymentIntent: "pi_mock_local_2042", cardLast4: "4242", risk: "low", withdrawalWaived: true, paidAt: "2026-10-02T12:05:00Z", createdAt: "2026-10-02T12:05:00Z",
    items: [{ id: "item-local-2042-1", kind: "guide", workId: "00000000-0000-0000-0000-000000000003", guideId: "00000000-0000-0000-0000-0000000000a3", editionId: null, config: { format: "60x80", level: "intermediate", palette: "original" }, title: "Guide N°03", detail: "60×80 · Intermediate · Original", unitPriceCents: 2500, quantity: 1, discountCents: 0, fulfilment: "not_required" }],
  }],
  entitlements: [], copies: [], receipts: [],
};

async function fresh(page: Page, opts: { staff?: boolean; purchase?: boolean } = {}) {
  await page.goto("/admin/login/");
  await page.evaluate(({ staff, purchase, S, P }) => {
    localStorage.clear();
    if (staff) localStorage.setItem("geste.session.v1", JSON.stringify(S));
    if (purchase) localStorage.setItem("geste.purchases.v2", JSON.stringify(P));
  }, { staff: !!opts.staff, purchase: !!opts.purchase, S: STAFF, P: PURCHASE });
}

async function expectNoAxeViolations(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
}

test("the admin is guarded; password + 6-digit code signs in and honours next", async ({ page }) => {
  await fresh(page);
  await page.goto("/admin/alerts/");
  await expect(page).toHaveURL(/\/admin\/login\/?\?next=%2Fadmin%2Falerts/, { timeout: 15_000 });
  await expectNoAxeViolations(page);
  await expect(page.getByLabel("Email")).toHaveValue("lucas@geste.studio");
  await page.getByRole("button", { name: /^Continue/ }).click();
  await expect(page.getByText("Enter your password")).toBeVisible();
  await page.getByLabel("Password").fill("anything");
  await page.getByRole("button", { name: /^Continue/ }).click();
  await expect(page.getByText("Enter the 6-digit code from your authenticator app.")).toBeVisible();
  await page.getByLabel("Code").fill("123456");
  await page.getByRole("button", { name: /^Log in/ }).click();
  await expect(page).toHaveURL(/\/admin\/alerts\/?$/);
});

test("a passkey signs in straight to the dashboard", async ({ page }) => {
  await fresh(page);
  await page.goto("/admin/login/");
  await page.getByRole("button", { name: "Use a passkey" }).click();
  await expect(page).toHaveURL(/\/admin\/?$/);
  if (isPhone(page)) await expect(page.getByRole("heading", { name: "Today · Oct 2" })).toBeVisible();
  else await expect(page.getByRole("heading", { name: /^Good (morning|afternoon|evening), Lucas$/ })).toBeVisible();
});

test("dashboard: KPIs, chart ranges, to-do counts, latest orders", async ({ page }) => {
  test.skip(isPhone(page), "desktop board");
  await fresh(page, { staff: true });
  await page.goto("/admin/");
  await expect(page.getByRole("link", { name: /Revenue · 30 d\s*\$5,472\s*\+38% vs Aug/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Orders · 30 d\s*187/ })).toHaveAttribute("href", /\/admin\/orders\/?$/);
  await expect(page.getByRole("heading", { name: "Revenue per day, September" })).toBeVisible();
  await page.getByRole("button", { name: "7 d" }).click();
  await expect(page.getByRole("button", { name: "7 d" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("img", { name: /^Sep \d+ · / })).toHaveCount(7);
  await page.getByRole("button", { name: "90 d" }).click();
  await expect(page.getByRole("heading", { name: "Revenue per day, July–September" })).toBeVisible();
  await expect(page.getByRole("img", { name: /^(Jul|Aug|Sep) \d+ · / })).toHaveCount(90);
  await page.getByRole("img", { name: /^Sep 22 · / }).hover();
  await expect(page.getByRole("tooltip")).toHaveText(/^Sep 22 · \$\d+ · \d+ orders$/);
  await expect(page.getByRole("link", { name: /3 prints to pack and ship/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /4 reviews to moderate/ })).toHaveAttribute("href", /\/admin\/reviews\/?$/);
  await expect(page.getByRole("link", { name: /#GS-2041\s*Camille Martin\s*Guide N°03 · Print N°07\s*\$86\s*Print to ship/ })).toHaveAttribute("href", /\/admin\/orders\/detail\/?\?number=GS-2041/);
  await expect(page.getByRole("link", { name: /^N°03\s.*62$/ })).toBeVisible();
  await expectNoAxeViolations(page);
});

test("an order paid at checkout tops the dashboard and moves the numbers", async ({ page }) => {
  await fresh(page, { staff: true, purchase: true });
  await page.goto("/admin/");
  if (isPhone(page)) {
    await expect(page.getByRole("link", { name: /#GS-2042 · Camille M\.\s*Guide N°03\s*\$25/ })).toBeVisible();
    await expect(page.getByText("12", { exact: true })).toBeVisible(); // orders today: 11 + 1
    return;
  }
  await expect(page.getByRole("link", { name: /Orders · 30 d\s*188/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Revenue · 30 d\s*\$5,497/ })).toBeVisible();
  const latest = page.getByRole("list", { name: "Latest orders" }).getByRole("link");
  await expect(latest.first()).toContainText("#GS-2042");
  await expect(page.getByRole("link", { name: /^N°03\s.*63$/ })).toBeVisible();
});

test("the Demo data menu switches role: nav, revenue and to-do follow", async ({ page }) => {
  test.skip(isPhone(page), "the role menu lives in the desktop top bar");
  await fresh(page, { staff: true });
  await page.goto("/admin/");
  const nav = page.getByRole("navigation", { name: "Admin" });
  await expect(nav.getByRole("link", { name: "Finance" })).toBeVisible();
  await page.getByRole("button", { name: /Demo data/ }).click();
  await page.getByRole("menuitemradio", { name: /^Support/ }).click();
  await expect(page.getByText("Lucas · Support")).toBeVisible();
  await expect(nav.getByRole("link", { name: "Finance" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Works" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: /Support inbox/ })).toBeVisible();
  await expect(page.getByText("Revenue · 30 d")).toHaveCount(0);
  await expect(page.getByText(/Revenue per day/)).toHaveCount(0);
  await expect(page.getByText("Orders · 30 d")).toBeVisible();
  await expect(page.getByRole("link", { name: /2 support messages/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /prints to pack and ship/ })).toHaveCount(0);

  await page.getByRole("button", { name: /Demo data/ }).click();
  await page.getByRole("menuitemradio", { name: /^Content/ }).click();
  await expect(nav.getByRole("link", { name: "Orders" })).toHaveCount(0);
  await expect(page.getByRole("list", { name: "Latest orders" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /AI works to validate/ })).toBeVisible();

  // A page the role cannot open says so.
  await page.goto("/admin/finance/");
  await expect(page.getByText("The Content role cannot open this page.")).toBeVisible();
});

test("alerts: popover on desktop, Mark read and push topics on the phone page", async ({ page }) => {
  await fresh(page, { staff: true });
  if (!isPhone(page)) {
    await page.goto("/admin/");
    const button = page.getByRole("button", { name: "Alerts, 6 unread" });
    await button.click();
    const panel = page.getByRole("dialog", { name: "Alerts" });
    await expect(panel.getByRole("link")).toHaveCount(6);
    await expect(panel.getByRole("link").first()).toContainText("3 prints to ship today");
    await expectNoAxeViolations(page);
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
    await expect(button).toBeFocused();
    return;
  }
  await page.goto("/admin/");
  await page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Alerts" }).click();
  await expect(page).toHaveURL(/\/admin\/alerts\/?$/);
  await expect(page.getByRole("heading", { name: "Alerts" })).toBeVisible();
  await expect(page.getByText("New order #GS-2041 · $86")).toBeVisible();
  await page.getByRole("button", { name: "Mark read: New order #GS-2041 · $86" }).click();
  await expect(page.getByRole("button", { name: "New order #GS-2041 · $86: read" })).toHaveText("Read");
  const topic = page.getByRole("checkbox", { name: "Support message" });
  await expect(topic).toBeChecked();
  await topic.uncheck();
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "Support message" })).not.toBeChecked();
  await expect(page.getByRole("button", { name: "New order #GS-2041 · $86: read" })).toBeVisible();
  await expectNoAxeViolations(page);
});

test("phone Today: KPIs, to-do and latest orders", async ({ page }) => {
  test.skip(!isPhone(page), "phone board");
  await fresh(page, { staff: true });
  await page.goto("/admin/");
  await expect(page.getByRole("heading", { name: "Today · Oct 2" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Today" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("+22% vs Tue")).toBeVisible();
  await expect(page.getByRole("link", { name: /3 prints to ship before 16:00/ })).toHaveAttribute("href", /\/admin\/orders\/?$/);
  await expect(page.getByRole("link", { name: /#GS-2039 · Léa D\.\s*Gift card\s*\$50/ })).toBeVisible();
  await expectNoAxeViolations(page);
});
