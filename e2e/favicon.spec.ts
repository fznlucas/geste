import { expect, test, type Page } from "@playwright/test";

/**
 * The looping favicon (docs/decisions.md "Animated favicon", docs/motion.md §9): 12 images a second on
 * every <link rel="icon">, on the store and the reader, across client navigations; static under
 * reduced motion (live), on Safari and on touch-only devices, with no console error.
 * The background tab is checked by `node scripts/favicon-background.mjs [chrome|arc]`: Playwright keeps
 * every page "visible" and turns Chrome's background throttling off, so it cannot test that here.
 */

const CAMILLE = { customer: { userId: "cus-camille-martin", email: "camille.martin@mail.com", fullName: "Camille Martin", firstName: "Camille", method: "password", signedInAt: "2026-10-01T10:00:00Z" } };

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  return errors;
}

const iconHrefs = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]')].map((l) => l.href));

/** Every change of the first icon link's href for `ms`: [time, href]. */
const recordIcon = (page: Page, ms: number) =>
  page.evaluate(
    (ms) =>
      new Promise<Array<[number, string]>>((done) => {
        const out: Array<[number, string]> = [];
        const link = document.querySelector('link[rel="icon"]')!;
        const mo = new MutationObserver(() => out.push([performance.now(), (link as HTMLLinkElement).href]));
        mo.observe(link, { attributes: true, attributeFilter: ["href"] });
        setTimeout(() => (mo.disconnect(), done(out)), ms);
      }),
    ms,
  );

async function expectLooping(page: Page) {
  await expect.poll(async () => (await iconHrefs(page))[0], { timeout: 10_000 }).toMatch(/^data:image\/png;base64,/);
  const log = await recordIcon(page, 4000);
  // 12 images a second, skipping repeats (the hold and the rest): about 29 changes in 4 s, one loop is 3.83 s.
  expect(log.length).toBeGreaterThanOrEqual(24);
  expect(new Set(log.map(([, h]) => h)).size).toBeGreaterThanOrEqual(12);
  const gaps = log.slice(1).map(([t], i) => t - log[i]![0]).sort((a, b) => a - b);
  expect(gaps[Math.floor(gaps.length / 2)]).toBeGreaterThan(70);
  expect(gaps[Math.floor(gaps.length / 2)]).toBeLessThan(100);
  // favicon.ico and icon.svg show the same image, so the browser's pick does not matter.
  const hrefs = await iconHrefs(page);
  expect(hrefs.length).toBeGreaterThanOrEqual(2);
  expect(new Set(hrefs).size).toBe(1);
}

async function expectStatic(page: Page) {
  await page.waitForTimeout(3000);
  const hrefs = await iconHrefs(page);
  expect(hrefs.some((h) => h.includes("/favicon.ico"))).toBe(true);
  expect(hrefs.some((h) => h.includes("/icon.svg"))).toBe(true);
  expect(hrefs.every((h) => !h.startsWith("data:"))).toBe(true);
}

test("the favicon loops on the store, through client navigation, and in the reader", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/");
  await expectLooping(page);
  await page.getByRole("link", { name: "Prints" }).filter({ visible: true }).first().click();
  await expect(page).toHaveURL(/\/prints\/?$/);
  await expectLooping(page);

  await page.evaluate((s) => localStorage.setItem("geste.session.v1", JSON.stringify(s)), CAMILLE);
  await page.goto("/learn/ent-2041-1/");
  await expectLooping(page);
  expect(errors).toEqual([]);
});

test("reduced motion: the static favicon, and back to it when the setting turns on", async ({ page }) => {
  const errors = watchErrors(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expectStatic(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expectLooping(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expectStatic(page);
  expect(errors).toEqual([]);
});

test.describe("Safari", () => {
  test.use({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15" });
  test("the static favicon, no error", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/");
    await expectStatic(page);
    expect(errors).toEqual([]);
  });
});

test.describe("touch-only device", () => {
  test.use({ isMobile: true, hasTouch: true });
  test("the static favicon (no tab strip to show it)", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/");
    await expectStatic(page);
    expect(errors).toEqual([]);
  });
});
