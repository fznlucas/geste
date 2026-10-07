import { expect, test, type Page } from "@playwright/test";

/**
 * The simulated history in the browser (docs/admin-v2/01 §2): generated in a Web Worker, Mist blocks
 * meanwhile, kept in IndexedDB by complete day; a reopening reads the cache and generates today only,
 * with the same figures. Without IndexedDB (private window) or without a Worker, it still works.
 */

const STAFF = { customer: null, staff: { staffId: "staff-lucas", email: "lucas@geste.studio", fullName: "Lucas", role: "owner", aal2: true, signedInAt: "2026-10-02T08:00:00Z" } };

async function signIn(page: Page) {
  await page.goto("/");
  await page.evaluate((s) => {
    localStorage.clear();
    localStorage.setItem("geste.session.v1", JSON.stringify(s));
  }, STAFF);
}

const history = (page: Page) => page.getByText(/^History:/);

/** The dashboard's tiles, as text: the same history gives the same figures. */
async function tiles(page: Page): Promise<string[]> {
  await page.goto("/admin/");
  const values = page.locator("main a[href], main div").filter({ hasText: /^(Revenue|Orders|Avg\. order|Conversion|Guides finished|Affiliate)/ });
  await expect(values.first()).toBeVisible();
  return page.locator("main").getByText(/^[€$]?[\d,.]+%?$/).allTextContents();
}

function errorsOf(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  return errors;
}

test.skip(({ viewport }) => (viewport?.width ?? 1440) < 768, "desktop admin");

test("generated once in the worker, then read from the cache: today only, same figures", async ({ page }) => {
  const errors = errorsOf(page);
  await signIn(page);
  await page.goto("/admin/settings/?tab=Simulation");
  await expect(history(page)).toHaveText(/^History: generated from launch, \d+ days in the background in \d+ ms, kept for the next opening\.$/);
  const cold = await tiles(page);
  await page.goto("/admin/settings/?tab=Simulation");
  await expect(history(page)).toHaveText(/^History: from the cache up to Oct 1, 1 day generated in the background in \d+ ms\.$/);
  const warm = await tiles(page);
  expect(warm.length).toBeGreaterThan(3);
  expect(warm).toEqual(cold);
  expect(errors).toEqual([]);
});

test("Mist blocks while the worker works, no spinner", async ({ page }) => {
  // A slow worker: its answer comes 1.5 s later.
  await page.addInitScript(() => {
    const W = window.Worker;
    window.Worker = function (url: string | URL, options?: WorkerOptions) {
      const worker = new W(url, options);
      const send = worker.postMessage.bind(worker);
      worker.postMessage = ((message: unknown) => setTimeout(() => send(message), 1500)) as Worker["postMessage"];
      return worker;
    } as unknown as typeof Worker;
  });
  await signIn(page);
  await page.goto("/admin/");
  const preparing = page.getByRole("status", { name: "Preparing the store's history" });
  await expect(preparing).toBeVisible();
  await expect(preparing).toHaveAttribute("aria-busy", "true");
  // Still: nothing turns or shimmers.
  expect(await preparing.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
  await expect(page.getByText(/^Revenue · 30 d/).first()).toBeVisible({ timeout: 10_000 });
  await expect(preparing).toHaveCount(0);
});

test("no IndexedDB (private window): generated each time, without an error", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, "indexedDB", { value: undefined, configurable: true }));
  const errors = errorsOf(page);
  await signIn(page);
  await page.goto("/admin/settings/?tab=Simulation");
  await expect(history(page)).toHaveText(/^History: generated from launch, \d+ days in the background in \d+ ms \(no cache in this browser\)\.$/);
  await page.reload();
  await expect(history(page)).toHaveText(/\(no cache in this browser\)\.$/);
  await page.goto("/admin/orders/");
  await expect(page.getByRole("table", { name: "Orders" }).getByRole("row").nth(1)).toBeVisible();
  expect(errors).toEqual([]);
});

test("no Web Worker: generated on the page, same figures", async ({ page, browser }) => {
  const errors = errorsOf(page);
  await signIn(page);
  const withWorker = await tiles(page);
  expect(withWorker.length).toBeGreaterThan(3);
  const other = await browser.newContext();
  const p2 = await other.newPage();
  await p2.addInitScript(() => Object.defineProperty(window, "Worker", { value: undefined, configurable: true }));
  const errors2 = errorsOf(p2);
  await signIn(p2);
  await p2.goto("/admin/settings/?tab=Simulation");
  await expect(history(p2)).toHaveText(/^History: generated from launch, \d+ days on the page in \d+ ms, kept for the next opening\.$/);
  expect(await tiles(p2)).toEqual(withWorker);
  await other.close();
  expect([...errors, ...errors2]).toEqual([]);
});
