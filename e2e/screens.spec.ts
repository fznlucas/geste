import { expect, test, type Page } from "@playwright/test";

/**
 * Admin v2 (docs/admin-v2/PROMPT.md, 06): screenshots of every admin route, per role, at 1440×900 and
 * 390×844, taken with the clock pinned (Oct 2, 2026 12:00 UTC, Europe/Paris) and empty storage, so a
 * difference is a real change and never the wall clock. Not part of `npm run test:e2e`:
 *   npm run screens:update   writes docs/admin-v2/screens/<set>/ (SCREENS_SET, default "before")
 *   npm run screens          compares the current build with that set (diffs in test-results/)
 */

const NOW = "2026-10-02T12:00:00Z";

type Role = "owner" | "support" | "fulfilment" | "content";

const ROUTES: Array<{ name: string; path: string; roles: Role[] }> = [
  { name: "dashboard", path: "/admin/", roles: ["owner", "support", "fulfilment", "content"] },
  { name: "alerts", path: "/admin/alerts/", roles: ["owner", "support", "fulfilment", "content"] },
  { name: "orders", path: "/admin/orders/", roles: ["owner", "support", "fulfilment"] },
  { name: "order-detail", path: "/admin/orders/detail/?number=GS-2041", roles: ["owner", "support", "fulfilment"] },
  { name: "fulfilment", path: "/admin/fulfilment/", roles: ["owner", "fulfilment"] },
  { name: "editions", path: "/admin/editions/", roles: ["owner", "fulfilment"] },
  { name: "works", path: "/admin/works/", roles: ["owner", "content"] },
  { name: "work-editor", path: "/admin/works/n03/", roles: ["owner", "content"] },
  { name: "guide-editor", path: "/admin/works/n03/guide/00000000-0000-0000-0000-0000000000a3/", roles: ["owner", "content"] },
  { name: "ai", path: "/admin/ai/", roles: ["owner", "content"] },
  { name: "customers", path: "/admin/customers/", roles: ["owner", "support"] },
  { name: "customer-detail", path: "/admin/customers/cus-camille-martin/", roles: ["owner", "support"] },
  { name: "support", path: "/admin/support/", roles: ["owner", "support"] },
  { name: "reviews", path: "/admin/reviews/", roles: ["owner", "support", "content"] },
  { name: "analytics", path: "/admin/analytics/", roles: ["owner"] },
  { name: "finance", path: "/admin/finance/", roles: ["owner"] },
  { name: "marketing", path: "/admin/marketing/", roles: ["owner"] },
  { name: "content", path: "/admin/content/", roles: ["owner", "content"] },
  { name: "settings", path: "/admin/settings/", roles: ["owner"] },
];

const staff = (role: Role) => ({
  customer: null,
  staff: { staffId: "staff-lucas", email: "lucas@geste.studio", fullName: "Lucas", role, aal2: true, signedInAt: "2026-10-02T08:00:00Z" },
});

async function prepare(page: Page, role: Role | null) {
  await page.clock.setFixedTime(new Date(NOW));
  await page.goto("/admin/login/");
  await page.evaluate((session) => {
    localStorage.clear();
    sessionStorage.clear();
    if (session) localStorage.setItem("geste.session.v1", JSON.stringify(session));
  }, role ? staff(role) : null);
}

async function settle(page: Page) {
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 });
  await page.evaluate(async () => {
    await document.fonts.ready;
    // Lazy images below the fold would be captured half-decoded by a full-page shot.
    const imgs = Array.from(document.images);
    for (const img of imgs) img.loading = "eager";
    await Promise.all(imgs.map((img) => img.decode().catch(() => undefined)));
  });
}

test("login", async ({ page }) => {
  await prepare(page, null);
  await page.goto("/admin/login/");
  await settle(page);
  await expect(page).toHaveScreenshot("login.png", { fullPage: true });
});

for (const route of ROUTES) {
  for (const role of route.roles) {
    test(`${route.name} · ${role}`, async ({ page }) => {
      await prepare(page, role);
      await page.goto(route.path);
      await settle(page);
      await expect(page).toHaveScreenshot(`${route.name}--${role}.png`, { fullPage: true });
    });
  }
}
