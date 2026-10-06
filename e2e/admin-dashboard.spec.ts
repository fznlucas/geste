import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { alerts, dashboard, formatPrice, getOrders, nextOrderNumber, plural, re, todoCounts } from "./helpers";

/** M6 dashboard: admin login (password + code, passkey), guard, role switch, dashboard, phone Today, alerts. */

/**
 * The figures come from the simulated history at the e2e clock: the tests read them through the app's own
 * metrics (docs/admin-v2/01 §2), and check that the page shows them where the board draws them.
 */
const D = await dashboard();
const COUNTS = await todoCounts();
const ORDERS = await getOrders();
const ALERTS = (await alerts()).filter((a) => a.roles.includes("owner"));
const NEXT = nextOrderNumber();
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthOf = (day: string) => MONTHS[Number(day.slice(5, 7)) - 1]!;
const span = (days: Array<{ day: string }>) => {
  const [a, b] = [monthOf(days[0]!.day), monthOf(days.at(-1)!.day)];
  return a === b ? a : `${a}–${b}`;
};
const short = (name: string) => `${name.split(" ")[0]} ${name.split(" ")[1]?.[0] ?? ""}.`;

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768;

const STAFF = { customer: null, staff: { staffId: "staff-lucas", email: "lucas@geste.studio", fullName: "Lucas", role: "owner", aal2: true, signedInAt: "2026-10-02T08:00:00Z" } };

/** A guide bought at checkout in this browser (what src/lib/client/purchases.ts keeps). */
const PURCHASE = {
  orders: [{
    id: "order-local-2042", number: "GS-2042", userId: "cus-camille-martin", email: "camille.martin@mail.com", status: "paid",
    subtotalCents: 1900, discountCents: 0, shippingCents: 0, shippingMethod: null, taxCents: 317, totalCents: 1900, shippingAddress: null,
    stripePaymentIntent: "pi_mock_local_2042", cardLast4: "4242", risk: "low", withdrawalWaived: true, paidAt: "2026-10-02T12:05:00Z", createdAt: "2026-10-02T12:05:00Z",
    items: [{ id: "item-local-2042-1", kind: "guide", workId: "00000000-0000-0000-0000-000000000003", guideId: "00000000-0000-0000-0000-0000000000a3", editionId: null, config: { format: "50x60", level: "intermediate", palette: "original" }, title: "Guide N°03", detail: "50×60 · Intermediate · Original", unitPriceCents: 1900, quantity: 1, discountCents: 0, fulfilment: "not_required" }],
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
  const k = D.last30d;
  await expect(page.getByRole("link", { name: new RegExp(`Revenue · 30 d\\s*${re(formatPrice(k.revenueCents))}\\s*${re(k.revenueDelta)}`) })).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(`Orders · 30 d\\s*${k.orders}\\b`) })).toHaveAttribute("href", /\/admin\/orders\/?$/);
  await expect(page.getByRole("heading", { name: `Revenue per day, ${span(D.days.slice(-30))}` })).toBeVisible();
  await page.getByRole("button", { name: "7 d" }).click();
  await expect(page.getByRole("button", { name: "7 d" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("img", { name: /^[A-Z][a-z]{2} \d+ · / })).toHaveCount(7);
  await page.getByRole("button", { name: "90 d" }).click();
  await expect(page.getByRole("heading", { name: `Revenue per day, ${span(D.days)}` })).toBeVisible();
  await expect(page.getByRole("img", { name: /^[A-Z][a-z]{2} \d+ · / })).toHaveCount(90);
  await page.getByRole("img", { name: /^Sep 22 · / }).hover();
  await expect(page.getByRole("tooltip")).toHaveText(/^Sep 22 · \$[\d,.]+ · \d+ orders?$/);
  await expect(page.getByRole("link", { name: new RegExp(`${plural(COUNTS.fulfilment, "print", "prints")} to pack and ship`) })).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(`${plural(COUNTS.reviews, "review", "reviews")} to moderate`) })).toHaveAttribute("href", /\/admin\/reviews\/?$/);
  const latest = ORDERS[0]!;
  await expect(page.getByRole("link", { name: new RegExp(`#${latest.number}\\s*${re(latest.customer.fullName)}`) })).toHaveAttribute("href", new RegExp(`/admin/orders/detail/?\\?number=${latest.number}`));
  const top = D.topWorks[0]!;
  await expect(page.getByRole("link", { name: new RegExp(`^${top.number}\\s.*${top.guides}$`) })).toBeVisible();
  await expectNoAxeViolations(page);
});

test("an order paid at checkout tops the dashboard and moves the numbers", async ({ page }) => {
  await fresh(page, { staff: true, purchase: true });
  await page.goto("/admin/");
  if (isPhone(page)) {
    await expect(page.getByRole("link", { name: new RegExp(`#${NEXT} · Camille M\\.\\s*Guide N°03\\s*\\$19`) })).toBeVisible();
    await expect(page.getByText(String(D.today.orders + 1), { exact: true })).toBeVisible(); // orders today + this one
    return;
  }
  await expect(page.getByRole("link", { name: new RegExp(`Orders · 30 d\\s*${D.last30d.orders + 1}\\b`) })).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(`Revenue · 30 d\\s*${re(formatPrice(D.last30d.revenueCents + 1900))}`) })).toBeVisible();
  const latest = page.getByRole("list", { name: "Latest orders" }).getByRole("link");
  await expect(latest.first()).toContainText(`#${NEXT}`);
  const n03 = D.topWorks.find((w) => w.number === "N°03")!.guides;
  await expect(page.getByRole("link", { name: new RegExp(`^N°03\\s.*${n03 + 1}$`) })).toBeVisible();
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
  await expect(page.getByRole("link", { name: new RegExp(plural(COUNTS.support, "support message", "support messages")) })).toBeVisible();
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
    const button = page.getByRole("button", { name: `Alerts, ${ALERTS.length} unread` });
    await button.click();
    const panel = page.getByRole("dialog", { name: "Alerts" });
    await expect(panel.getByRole("link")).toHaveCount(ALERTS.length);
    await expect(panel.getByRole("link").first()).toContainText(`${plural(COUNTS.fulfilment, "print", "prints")} to ship today`);
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
  const newOrder = `New order #${ORDERS[0]!.number} · $${Math.round(ORDERS[0]!.totalCents / 100)}`;
  await expect(page.getByText(newOrder)).toBeVisible();
  await page.getByRole("button", { name: `Mark read: ${newOrder}` }).click();
  await expect(page.getByRole("button", { name: `${newOrder}: read` })).toHaveText("Read");
  const topic = page.getByRole("checkbox", { name: "Support message" });
  await expect(topic).toBeChecked();
  await topic.uncheck();
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "Support message" })).not.toBeChecked();
  await expect(page.getByRole("button", { name: `${newOrder}: read` })).toBeVisible();
  await expectNoAxeViolations(page);
});

test("phone Today: KPIs, to-do and latest orders", async ({ page }) => {
  test.skip(!isPhone(page), "phone board");
  await fresh(page, { staff: true });
  await page.goto("/admin/");
  await expect(page.getByRole("heading", { name: "Today · Oct 2" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Today" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText(D.today.revenueDelta)).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(`${plural(COUNTS.fulfilment, "print", "prints")} to ship before 16:00`) })).toHaveAttribute("href", /\/admin\/orders\/?$/);
  await expect(page.getByRole("link", { name: new RegExp(`#${ORDERS[0]!.number} · ${re(short(ORDERS[0]!.customer.fullName))}`) })).toBeVisible();
  await expectNoAxeViolations(page);
});
