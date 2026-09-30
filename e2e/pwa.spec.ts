import { expect, test, type Page } from "@playwright/test";

/**
 * M8: the reader as an installed app (docs/screens/reader.md §PWA). Runs on the export with its
 * service worker (`npm run build` = next build + serwist build): a guide opened once online opens
 * again offline, with its drying timer, and the /learn start page reopens it.
 */

async function signedIn(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/login/");
  await page.getByRole("button", { name: /passkey|Face ID/ }).click();
  await expect(page).toHaveURL(/\/account\/?$/);
}

/** Waits until the worker controls the page and holds the guide's three pages. */
async function waitForOfflineCopy(page: Page, id: string) {
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, { timeout: 20_000 });
  await expect
    .poll(
      () =>
        page.evaluate(async (id) => {
          const c = await caches.open("geste-reader-pages");
          const keys = (await c.keys()).map((r) => new URL(r.url).pathname);
          return ["", "timer/", "print/"].every((p) => keys.includes(`/learn/${id}/${p}`));
        }, id),
      { timeout: 20_000 },
    )
    .toBe(true);
}

test("the manifest describes the reader app with the BrandFavicon icons", async ({ page }) => {
  const res = await page.request.get("/manifest.webmanifest");
  const m = await res.json();
  expect(m).toMatchObject({ name: "Geste", short_name: "Geste", start_url: "/learn/", scope: "/learn/", display: "standalone", background_color: "#FAFAF8", theme_color: "#111111" });
  for (const icon of m.icons) expect((await page.request.get(icon.src)).ok()).toBe(true);
  // The declared icons: under reduced motion the favicon does not loop (AnimatedFavicon swaps their href).
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", /manifest\.webmanifest/);
  await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute("href", /icon\.svg/);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", /apple-icon\.png/);
});

test("a guide opened once online opens offline, timer included", async ({ page, context }) => {
  await signedIn(page);
  await page.goto("/learn/ent-2041-1/?step=2e");
  await expect(page.getByText("Step e of e")).toBeVisible();
  await waitForOfflineCopy(page, "ent-2041-1");

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText("Offline — your guides are saved on this device")).toBeVisible();
  await expect(page.getByText("Step e of e")).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(page).toHaveURL(/step=2d$/);
  await expect(page.getByText("Step d of e")).toBeVisible();

  // A page never visited in this session, straight from the offline copy.
  await page.goto("/learn/ent-2041-1/timer/?layer=2");
  await expect(page.getByRole("timer")).toBeVisible();

  // The installed app's start page reopens the last guide.
  await page.goto("/learn/");
  await expect(page).toHaveURL(/\/learn\/ent-2041-1\/\?step=/);
  await expect(page.getByText("Offline — your guides are saved on this device")).toBeVisible();
  // Outside the app's scope the network is really gone.
  await expect(page.goto("/shop/")).rejects.toThrow(/ERR_INTERNET_DISCONNECTED/);
  await context.setOffline(false);
});
