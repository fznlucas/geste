import { expect, test, type Page } from "@playwright/test";

/**
 * The simulated history in the browser (docs/admin-v2/01 §2, docs/decisions.md "Admin v2 · history
 * cache"): a first opening generates it on the page, as before, and the worker keeps it in IndexedDB in
 * the background; a reopening reads it (bytes, decoded once) and generates nothing, with the same
 * figures. The worker path (forced here) shows Mist blocks; without IndexedDB or a Worker it all still
 * works; the store never waits for the worker.
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

/** The dashboard's figures, as text: the same history gives the same figures. */
async function tiles(page: Page): Promise<string[]> {
  await page.goto("/admin/");
  await expect(page.getByText(/^Revenue · 30 d/).first()).toBeVisible();
  return page.locator("main").getByText(/^[€$]?[\d,.]+%?$/).allTextContents();
}

function errorsOf(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  return errors;
}

test.skip(({ viewport }) => (viewport?.width ?? 1440) < 768, "desktop admin");

test("first opening generated on the page and kept by the worker; reopening from the cache: nothing generated, same figures", async ({ page }) => {
  const errors = errorsOf(page);
  await signIn(page);
  await page.goto("/admin/settings/?tab=Simulation");
  await expect(history(page)).toHaveText(/^History: generated from launch, \d+ days on the page in \d+ ms, kept for the next opening\.$/);
  const first = await tiles(page);
  expect(first.length).toBeGreaterThan(3);
  // The worker writes the cache in the background: the next opening reads it.
  await expect(async () => {
    await page.goto("/admin/settings/?tab=Simulation");
    await expect(history(page)).toHaveText(/^History: from the cache up to Oct 2, nothing generated, read in \d+ ms\.$/, { timeout: 1000 });
  }).toPass({ timeout: 20_000 });
  expect(await tiles(page)).toEqual(first);
  expect(errors).toEqual([]);
});

test("worker path (forced): Mist blocks while it works, no spinner, then the same figures", async ({ page }) => {
  await signIn(page);
  const onPage = await tiles(page);
  // Another browser state: no cache, the worker path, a slow worker (its answer comes 1.5 s later).
  await page.evaluate(() => new Promise((r) => { const req = indexedDB.deleteDatabase("geste-sim"); req.onsuccess = req.onerror = req.onblocked = () => r(null); }));
  await page.addInitScript(() => {
    const W = window.Worker;
    window.Worker = function (url: string | URL, options?: WorkerOptions) {
      const worker = new W(url, options);
      const send = worker.postMessage.bind(worker);
      worker.postMessage = ((message: unknown) => setTimeout(() => send(message), 1500)) as Worker["postMessage"];
      return worker;
    } as unknown as typeof Worker;
  });
  await page.goto("/admin/?simMode=worker");
  const preparing = page.getByRole("status", { name: "Preparing the store's history" });
  await expect(preparing).toBeVisible();
  await expect(preparing).toHaveAttribute("aria-busy", "true");
  // Still: nothing turns or shimmers.
  expect(await preparing.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
  await expect(page.getByText(/^Revenue · 30 d/).first()).toBeVisible({ timeout: 15_000 });
  await expect(preparing).toHaveCount(0);
  expect(await page.locator("main").getByText(/^[€$]?[\d,.]+%?$/).allTextContents()).toEqual(onPage);
});

test("no IndexedDB (private window): generated each time on the page, without an error", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, "indexedDB", { value: undefined, configurable: true }));
  const errors = errorsOf(page);
  await signIn(page);
  await page.goto("/admin/settings/?tab=Simulation");
  await expect(history(page)).toHaveText(/^History: generated from launch, \d+ days on the page in \d+ ms \(no cache in this browser\)\.$/);
  await page.reload();
  await expect(history(page)).toHaveText(/\(no cache in this browser\)\.$/);
  await page.goto("/admin/orders/");
  await expect(page.getByRole("table", { name: "Orders" }).getByRole("row").nth(1)).toBeVisible();
  expect(errors).toEqual([]);
});

test("no Web Worker, even when asked for: generated on the page, same figures", async ({ page, browser }) => {
  const errors = errorsOf(page);
  await signIn(page);
  const withWorker = await tiles(page);
  expect(withWorker.length).toBeGreaterThan(3);
  const other = await browser.newContext();
  const p2 = await other.newPage();
  await p2.addInitScript(() => Object.defineProperty(window, "Worker", { value: undefined, configurable: true }));
  const errors2 = errorsOf(p2);
  await signIn(p2);
  await p2.goto("/admin/settings/?tab=Simulation&simMode=worker");
  await expect(history(p2)).toHaveText(/^History: generated from launch, \d+ days on the page in \d+ ms \(no cache in this browser\)\.$/);
  expect(await tiles(p2)).toEqual(withWorker);
  await other.close();
  expect([...errors, ...errors2]).toEqual([]);
});

test("the store never waits for the worker: a checkout goes through while it never answers", async ({ page }) => {
  await page.addInitScript(() => {
    const W = window.Worker;
    window.Worker = function (url: string | URL, options?: WorkerOptions) {
      const worker = new W(url, options);
      worker.postMessage = (() => {}) as Worker["postMessage"];
      return worker;
    } as unknown as typeof Worker;
  });
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("geste.cart.v2", JSON.stringify([{ id: "l2", addedAt: "2026-10-01T10:01:00Z", kind: "print", editionId: "ed-07-s", quantity: 1 }]));
  });
  await page.goto("/checkout/?simMode=worker");
  await page.getByRole("button", { name: "Apple Pay" }).click();
  await expect(page).toHaveURL(/checkout\/success/);
  await expect(page.getByRole("status", { name: "Preparing the store's history" })).toHaveCount(0);
});
