import { expect, test, type Page } from "@playwright/test";

/**
 * Store header, phone menu and footer as on the boards (Home, Shop, Product, MHome, MShop, MMenu), and
 * the space above the footer (docs/decisions.md "Header and footer to the boards", "Space above the
 * footer"): 180 px from the end of a page's content on desktop, none on phones (the footer's own 64 px
 * padding), as MHome / MShop draw it.
 */

const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 1440) >= 1200;
const SESSION = { customer: { userId: "cus-camille-martin", email: "camille.martin@mail.com", fullName: "Camille Martin", firstName: "Camille", method: "password", signedInAt: "2026-10-01T10:00:00Z" } };

const box = (page: Page, selector: string) =>
  page.locator(selector).filter({ visible: true }).first().evaluate((e) => {
    const r = e.getBoundingClientRect();
    return { x: r.x, y: r.y + scrollY, w: r.width, h: r.height, bottom: r.bottom + scrollY };
  });

/** Bottom of the page's own block (main's last child) → top of the footer. */
const spaceAboveFooter = (page: Page) =>
  page.evaluate(() => {
    const main = document.querySelector("main")!;
    const blocks = [...main.children].filter((c) => c.getBoundingClientRect().height > 0);
    return Math.round(document.querySelector("footer")!.getBoundingClientRect().top - blocks[blocks.length - 1]!.getBoundingClientRect().bottom);
  });

test("header: heights, positions and hover as drawn", async ({ page }) => {
  await page.goto("/shop/");
  const header = page.locator("header").filter({ visible: true });
  if (isDesktop(page)) {
    await expect(header).toHaveCSS("padding", "8px 32px");
    expect((await box(page, "header")).h).toBe(60);
    // Nav links: normal line height (16 px boxes, y 22), 24 px apart, the right group 28 px from them.
    const shop = await box(page, 'header nav a[href="/shop/"]');
    expect(shop.h).toBe(16);
    expect(shop.y).toBe(22);
    await expect(header.getByRole("link", { name: "Shop" })).toHaveCSS("text-underline-offset", "4px");
    const cart = await box(page, "header button[aria-label^='Cart']");
    expect(cart.x + cart.w).toBe(1408);
    // The logo turns Stone on hover (the desktop boards' links), its pen still draws.
    const logo = header.getByRole("link", { name: "geste.studio, home" });
    await logo.hover();
    await expect(logo).toHaveCSS("color", "rgb(111, 106, 100)");
    expect(await logo.locator("svg g").first().evaluate((g) => getComputedStyle(g).fill)).toBe("rgb(111, 106, 100)");
  } else {
    await expect(header).toHaveCSS("padding", "4px 4px 4px 16px");
    expect((await box(page, "header")).h).toBe(52);
    const menu = await box(page, "header button[aria-expanded]");
    expect([menu.x, menu.w]).toEqual([318, 68]);
    // Icons and "Menu" turn Stone on hover; the logo stays Ink (phone boards).
    const account = header.getByRole("link", { name: "Log in" });
    await account.hover();
    await expect(account).toHaveCSS("color", "rgb(111, 106, 100)");
    const logo = header.getByRole("link", { name: "geste.studio, home" });
    await logo.hover();
    expect(await logo.locator("svg g").first().evaluate((g) => getComputedStyle(g).fill)).toBe("rgb(17, 17, 17)");
  }
});

test("phone menu: Close 68 px, 28 px links at -0.02 em, the 65 px USD $ · EN FR row, EN / FR touched on 44 × 44", async ({ page }) => {
  test.skip(isDesktop(page), "the menu is the phone header's");
  await page.goto("/shop/");
  await page.getByRole("button", { name: "Menu" }).click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  // The panel slides in (420 ms): measure it once it has arrived.
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));
  const close = await menu.getByRole("button", { name: "Close" }).evaluate((e) => e.getBoundingClientRect().toJSON());
  expect([close.x, close.width, close.height]).toEqual([318, 68, 44]);
  await expect(menu.getByRole("link", { name: "Shop", exact: true })).toHaveCSS("letter-spacing", "-0.56px");
  await expect(menu.getByRole("link", { name: "Shop", exact: true })).toHaveCSS("font-size", "28px");
  const en = await menu.getByRole("button", { name: "EN" }).evaluate((e) => e.getBoundingClientRect().height);
  expect(en).toBe(32);
  const row = await menu.getByText("USD $").evaluate((e) => e.parentElement!.getBoundingClientRect().toJSON());
  expect([row.height, row.bottom]).toEqual([65, 844]);
  // EN and FR keep their 32 px look but are touched on 44 × 44 areas (invisible, no layout change).
  for (const name of ["EN", "FR"]) {
    const area = await menu.getByRole("button", { name }).evaluate((e) => {
      const b = e.getBoundingClientRect();
      const s = getComputedStyle(e, "::before");
      const w = parseFloat(s.width), h = parseFloat(s.height);
      const right = b.right - parseFloat(s.right);
      return { w, h, left: right - w, right, top: b.top + b.height / 2 - h / 2 };
    });
    expect([area.w, area.h]).toEqual([44, 44]);
    expect(area.right).toBeLessThanOrEqual(390);
    // Every point of the area that is not the 1.6 px left to EN reaches the button.
    const owner = await page.evaluate(({ a, name }) => {
      const xs = [a.left + 0.5, (a.left + a.right) / 2, a.right - 1].map((x) => (name === "FR" ? Math.max(x, a.left + 2) : x));
      const ys = [a.top + 0.5, a.top + 22, a.top + 43.5];
      return xs.flatMap((x) => ys.map((y) => document.elementFromPoint(x, y)?.textContent?.trim()));
    }, { a: area, name });
    expect(owner.every((t) => t === name), `${name}: ${owner.join(" ")}`).toBe(true);
  }
  expect(await menu.getByRole("button", { name: "EN" }).evaluate((e) => e.getBoundingClientRect().height)).toBe(32);
});

test("footer: paddings and rows as drawn (24 px link rows, docs/decisions.md \"Footer link rows\")", async ({ page }) => {
  await page.goto("/shop/");
  const footer = page.locator("footer");
  await expect(footer).toHaveCSS("padding", isDesktop(page) ? "56px 32px 28px" : "64px 16px 24px");
  await expect(footer).toHaveCSS("row-gap", isDesktop(page) ? "72px" : "36px");
  expect((await box(page, "footer")).h).toBe(isDesktop(page) ? 336 : 478);
  await expect(footer.getByRole("button", { name: "FR" })).toHaveCSS("text-underline-offset", "4px");
});

test("space above the footer: 180 px on desktop, none on phones, on every kind of store page", async ({ page }) => {
  await page.goto("/404.html");
  await page.evaluate((s) => localStorage.setItem("geste.session.v1", JSON.stringify(s)), SESSION);
  const expected = isDesktop(page) ? 180 : 0;
  for (const path of ["/", "/shop/", "/prints/", "/works/n03/", "/prints/n07/", "/works/n03/list/", "/method/", "/about/", "/journal/", "/journal/avoid-mud-three-rules/", "/help/", "/legal/notice/", "/gift-cards/", "/cart/", "/login/", "/account/", "/account/orders/", "/account/settings/"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    expect(await spaceAboveFooter(page), path).toBe(expected);
  }
});

test("shop: the grid's last row space is cancelled, so the footer spacing starts at the captions", async ({ page }) => {
  await page.goto("/shop/");
  // The last row's cards (bottoms aligned): their captions end where the footer spacing starts.
  const lastCaption = await page.locator("[data-grid]").filter({ visible: true }).evaluate((g) => Math.max(...[...g.querySelectorAll("[data-grid-item]")].map((i) => i.firstElementChild!.getBoundingClientRect().bottom + scrollY)));
  const footer = await box(page, "footer");
  expect(Math.round(footer.y - lastCaption)).toBe(isDesktop(page) ? 180 : 0);
});

test("phone product page: the sticky buy bar never hides the page's end", async ({ page }) => {
  test.skip(isDesktop(page), "the bar is the phone's");
  await page.goto("/works/n03/");
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  const bar = await page.locator("[data-sticky-buy-bar]").evaluate((e) => e.getBoundingClientRect().top);
  const reset = await page.getByRole("button", { name: "Reset demo" }).evaluate((e) => e.getBoundingClientRect().bottom);
  expect(reset).toBeLessThanOrEqual(bar);
  expect(await spaceAboveFooter(page)).toBe(0);
});
