import { expect, test, type Page } from "@playwright/test";

/**
 * Admin crawler (docs/admin-v2/04, PLAN.md Phase 6): no control may be inert, fake or a dead end.
 * Per route, every enabled link and button of the page is clicked from a fresh state; each must change
 * something: the URL (to a page that exists and that the role can open), the browser's stored data, a
 * download, a new tab, a dialog or menu, or a selected / pressed / expanded state. "demo action" toasts
 * fail. Per role, every sidebar link opens a page the role can open, and every link of that page too.
 */

type Role = "owner" | "support" | "fulfilment" | "content";

const ROUTES: Array<{ path: string; roles: Role[] }> = [
  { path: "/admin/", roles: ["owner", "support", "fulfilment", "content"] },
  { path: "/admin/alerts/", roles: ["owner", "support", "fulfilment", "content"] },
  { path: "/admin/orders/", roles: ["owner", "support", "fulfilment"] },
  { path: "/admin/orders/detail/?number=GS-1424", roles: ["owner", "support", "fulfilment"] },
  { path: "/admin/fulfilment/", roles: ["owner", "fulfilment"] },
  { path: "/admin/editions/", roles: ["owner", "fulfilment", "content"] },
  { path: "/admin/works/", roles: ["owner", "content"] },
  { path: "/admin/works/n03/", roles: ["owner", "content"] },
  { path: "/admin/guides/", roles: ["owner", "content"] },
  { path: "/admin/works/n03/guide/00000000-0000-0000-0000-0000000000a3/", roles: ["owner", "content"] },
  { path: "/admin/ai/", roles: ["owner", "content"] },
  { path: "/admin/customers/", roles: ["owner", "support"] },
  { path: "/admin/customers/detail/?id=cus-camille-martin", roles: ["owner", "support"] },
  { path: "/admin/support/", roles: ["owner", "support"] },
  { path: "/admin/reviews/", roles: ["owner", "support", "content"] },
  { path: "/admin/analytics/", roles: ["owner"] },
  { path: "/admin/finance/", roles: ["owner"] },
  { path: "/admin/finance/?tab=taxes", roles: ["owner"] },
  { path: "/admin/marketing/", roles: ["owner"] },
  { path: "/admin/content/", roles: ["owner", "content"] },
  { path: "/admin/settings/", roles: ["owner"] },
  { path: "/admin/settings/?tab=Integrations", roles: ["owner"] },
  { path: "/admin/settings/?tab=Simulation", roles: ["owner"] },
];

const staff = (role: Role) => ({
  customer: null,
  staff: { staffId: "staff-lucas", email: "lucas@geste.studio", fullName: "Lucas", role, aal2: true, signedInAt: "2026-10-02T08:00:00Z" },
});

/** Clicks that leave the admin on purpose, or end the session: checked elsewhere. */
const SKIP = /^(Log out|View the store|Preview on the store|Preview on a phone)/;

async function fresh(page: Page, role: Role, path: string) {
  await page.goto("/admin/login/");
  await page.evaluate((session) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("geste.session.v1", JSON.stringify(session));
  }, staff(role));
  await page.goto(path);
  await expect(page.locator("h1").first()).toBeVisible();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 });
}

/** What a click can change, read before and after. */
async function snapshot(page: Page) {
  return page.evaluate(() => ({
    url: location.pathname + location.search + location.hash,
    stored: Object.keys(localStorage).filter((k) => k.startsWith("geste.") && k !== "geste.session.v1").sort().map((k) => `${k}=${localStorage.getItem(k)}`).join("|"),
    session: sessionStorage.length,
    overlays: document.querySelectorAll('[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [data-radix-popper-content-wrapper]').length,
    states: Array.from(document.querySelectorAll("[aria-selected], [aria-pressed], [aria-expanded], [aria-current], [aria-checked]"))
      .map((e) => `${e.getAttribute("aria-selected")}${e.getAttribute("aria-pressed")}${e.getAttribute("aria-expanded")}${e.getAttribute("aria-current")}${e.getAttribute("aria-checked")}`)
      .join(""),
    text: (document.querySelector("main")?.textContent ?? "").length,
    toasts: Array.from(document.querySelectorAll('[role="status"], [role="alert"]')).map((e) => e.textContent ?? "").join("|"),
  }));
}

/** The page the role landed on can be opened and exists. */
async function expectOpenable(page: Page, role: Role, from: string) {
  // Visible text only (the page's inline script data names every route component).
  const body = await page.locator("body").innerText();
  expect(body, `${role} from ${from} → ${page.url()}`).not.toMatch(/role cannot open this page|This page wandered off|There is no order|no longer exists/);
}

const CONTROLS = 'main a[href]:visible, main button:visible, header button:visible, header a[href]:visible';

for (const route of ROUTES) {
  test(`every control works · ${route.path}`, async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 1440) < 768, "desktop crawl");
    test.setTimeout(240_000);
    const role = route.roles[0]!;
    await fresh(page, role, route.path);
    const names = await page.locator(CONTROLS).evaluateAll((els) =>
      els.map((e) => ({
        name: (e.getAttribute("aria-label") ?? e.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 60),
        disabled: (e as HTMLButtonElement).disabled || e.getAttribute("aria-disabled") === "true",
        external: e.getAttribute("target") === "_blank" || (e.getAttribute("href") ?? "").startsWith("mailto:") || (e.getAttribute("href") ?? "").startsWith("tel:"),
        // Already where it leads: the selected tab, the pressed filter, the current page.
        current:
          e.getAttribute("aria-selected") === "true" || e.getAttribute("aria-pressed") === "true" || e.getAttribute("aria-current") === "page" ||
          (e instanceof HTMLAnchorElement && new URL(e.href).pathname.replace(/\/$/, "") + new URL(e.href).search === location.pathname.replace(/\/$/, "") + location.search),
      })),
    );
    const inert: string[] = [];
    let dirty = false;
    for (let i = 0; i < names.length && i < 60; i++) {
      const c = names[i]!;
      if (c.disabled || c.external || c.current || SKIP.test(c.name)) continue;
      if (dirty) {
        await fresh(page, role, route.path);
        dirty = false;
      }
      const el = page.locator(CONTROLS).nth(i);
      if (!(await el.isVisible().catch(() => false))) {
        await fresh(page, role, route.path);
        if (!(await el.isVisible().catch(() => false))) continue;
      }
      const before = await snapshot(page);
      const download = page.waitForEvent("download", { timeout: 1500 }).then(() => true, () => false);
      const popup = page.waitForEvent("popup", { timeout: 1500 }).then((p) => (p.close(), true), () => false);
      const chooser = page.waitForEvent("filechooser", { timeout: 1500 }).then(() => true, () => false);
      await el.click({ timeout: 3000 }).catch(() => undefined);
      await page.waitForTimeout(400);
      const after = await snapshot(page).catch(() => before);
      const [downloaded, opened, picked] = await Promise.all([download, popup, chooser]);
      if (/demo action/i.test(after.toasts)) inert.push(`${c.name} (demo action)`);
      const moved = after.url !== before.url;
      if (moved) await expectOpenable(page, role, `${route.path} · ${c.name}`);
      const changed = moved || downloaded || opened || picked || after.stored !== before.stored || after.session !== before.session || after.overlays !== before.overlays || after.states !== before.states || after.toasts !== before.toasts || after.text !== before.text;
      if (!changed) inert.push(c.name);
      dirty = changed;
    }
    expect(inert, `inert controls on ${route.path}`).toEqual([]);
  });
}

for (const role of ["support", "fulfilment", "content"] as const) {
  test(`${role}: every sidebar page opens, and its links never lead to a page the role cannot open`, async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 1440) < 768, "desktop crawl");
    test.setTimeout(240_000);
    await fresh(page, role, "/admin/");
    const items = await page.getByRole("navigation", { name: "Admin" }).getByRole("link").evaluateAll((els) => els.map((e) => e.getAttribute("href")!));
    for (const href of items) {
      await page.goto(href);
      await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 });
      await expectOpenable(page, role, "sidebar");
      const links = await page.locator("main a[href^='/admin'], header a[href^='/admin']").evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute("href")!))]);
      for (const link of links.slice(0, 25)) {
        await page.goto(link);
        await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 });
        await expectOpenable(page, role, href);
      }
    }
  });
}

test("badge = the count of the filter it opens: Orders, Fulfilment, Support, Reviews, AI, Editions", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 1440) < 768, "desktop sidebar");
  await fresh(page, "owner", "/admin/");
  const nav = page.getByRole("navigation", { name: "Admin" });
  const badge = async (name: string) => Number(((await nav.getByRole("link", { name: new RegExp(`^${name}`) }).textContent()) ?? "").replace(/\D+/g, "") || 0);
  const open = async (name: string) => {
    await nav.getByRole("link", { name: new RegExp(`^${name}`) }).click();
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 });
  };

  const orders = await badge("Orders");
  await open("Orders");
  await expect(page).toHaveURL(/tab=to_ship/);
  await expect(page.getByText(new RegExp(`^${Math.min(orders, 12)} orders shown`))).toBeVisible();

  const prints = await badge("Fulfilment");
  await open("Fulfilment");
  await expect(page.getByRole("region", { name: new RegExp(`^To print, ${prints}$`) })).toBeVisible();

  const support = await badge("Support inbox");
  await open("Support inbox");
  if (support) await expect(page.getByText("New messages only.")).toBeVisible();

  const reviews = await badge("Reviews & results");
  await open("Reviews & results");
  await expect(page.locator("main").getByRole("listitem")).toHaveCount(reviews);

  const ai = await badge("AI pipeline");
  await open("AI pipeline");
  await expect(page.getByText(`To validate · ${ai}`).first()).toBeVisible();

  const low = await badge("Print editions");
  await open("Print editions");
  if (low) {
    await expect(page.getByText("Low stock only: 1 to 5 copies left.")).toBeVisible();
    await expect(page.getByRole("button", { name: /^(Close edition|Reopen|Raise size)/ })).toHaveCount(low);
  }
});
