import fs from "node:fs";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * M7: axe (WCAG 2.2 AA) on every route of the export, at 1440 and 390 (docs/mock-plan.md §4).
 * Routes are read from out/: every static page, one page per dynamic family (all works share one
 * template), plus the pages whose state is in the query. Signed in as Camille and as Lucas · Owner,
 * so private pages show their content, not the login redirect.
 */

const OUT = path.join(process.cwd(), "out");

function exportedRoutes(): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory() && e.name !== "_next") walk(path.join(dir, e.name));
      else if (e.name === "index.html") found.push(`/${path.relative(OUT, dir)}`.replace(/\/$/, "") + "/");
    }
  };
  walk(OUT);
  // One route per family: the same template with another row of mock data adds nothing to axe.
  const FAMILIES: [RegExp, string][] = [
    [/^\/works\/n\d+\/list\/$/, "/works/n03/list/"],
    [/^\/works\/n\d+\/$/, "/works/n03/"],
    [/^\/prints\/n\d+\/$/, "/prints/n07/"],
    [/^\/journal\/.+\/$/, "/journal/avoid-mud-three-rules/"],
    [/^\/learn\/[^/]+\/$/, "/learn/ent-2041-1/"],
    [/^\/learn\/[^/]+\/timer\/$/, "/learn/ent-2041-1/timer/?layer=2"],
    [/^\/learn\/[^/]+\/print\/$/, "/learn/ent-2041-1/print/"],
    [/^\/admin\/customers\/.+\/$/, "/admin/customers/cus-camille-martin/"],
    [/^\/admin\/works\/[^/]+\/guide\/.+\/$/, "/admin/works/n03/guide/00000000-0000-0000-0000-0000000000a3/"],
    [/^\/admin\/works\/n\d+\/$/, "/admin/works/n03/"],
  ];
  const QUERY: Record<string, string> = {
    "/admin/orders/detail/": "/admin/orders/detail/?number=GS-2041",
    "/track/": "/track/?order=GS-2028",
    "/checkout/success/": "/checkout/success/?order=GS-2041",
    "/admin/works/draft/": "/admin/works/draft/?slug=n03",
  };
  const routes = new Set<string>();
  for (const r of found) {
    if (r === "/_not-found/" || r === "/404/") continue;
    const family = FAMILIES.find(([re]) => re.test(r));
    routes.add(family ? family[1] : (QUERY[r] ?? r));
  }
  routes.add("/no-such-page/"); // 404.html
  return [...routes].sort();
}

const SESSION = {
  customer: { userId: "cus-camille-martin", email: "camille.martin@mail.com", fullName: "Camille Martin", firstName: "Camille", method: "password", signedInAt: "2026-10-01T10:00:00Z" },
  staff: { staffId: "staff-lucas", email: "lucas@geste.studio", fullName: "Lucas", role: "owner", aal2: true, signedInAt: "2026-10-02T08:00:00Z" },
};

for (const route of exportedRoutes()) {
  test(`axe ${route}`, async ({ page }) => {
    await page.goto("/404.html");
    await page.evaluate((s) => {
      localStorage.clear();
      localStorage.setItem("geste.session.v1", JSON.stringify(s));
    }, SESSION);
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    // Guarded pages load in the browser, and panels fade in: check the settled page.
    await expect(page.locator('[aria-busy="true"]:not(button)')).toHaveCount(0, { timeout: 15_000 }); // buttons may show their loading state on purpose (/kit)
    // (a loading button's indicator runs until its action ends: it is not a transition to wait for)
    await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getTiming().iterations === Infinity));
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([]);
  });
}
