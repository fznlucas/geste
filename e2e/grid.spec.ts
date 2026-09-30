import { expect, test, type Page } from "@playwright/test";

/**
 * Grid by original size (docs/decisions.md "Grid by original size") on Shop, Home, /prints and the admin
 * catalog, and its captions ("Captions on one line"): rows of 5 / 2 works spaced evenly edge to edge,
 * bottoms aligned per row with the captions on one line, the row space constant, every long side 70 %
 * of the reference column at least, a work and its turned version the same size; captions chosen card
 * by card, "from" never dropped. Runs at 1440 and 390.
 */

const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 1440) >= 1200;

async function asStaff(page: Page) {
  await page.goto("/admin/login/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem(
      "geste.session.v1",
      JSON.stringify({ customer: null, staff: { staffId: "staff-lucas", email: "lucas@geste.studio", fullName: "Lucas", role: "owner", aal2: true, signedInAt: "2026-10-02T08:00:00Z" } }),
    );
  });
}

/** The first visible grid of the page: its box, works per row and, per item, its box, image, caption and long-side share. */
async function measure(page: Page) {
  await page.waitForFunction(() => document.fonts.status === "loaded");
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));
  return page.locator("main [data-grid]").filter({ visible: true }).first().evaluate((grid) => {
    const g = grid.getBoundingClientRect();
    const cols = Number.parseInt(getComputedStyle(grid).getPropertyValue("--cols"), 10);
    const items = Array.from(grid.querySelectorAll(":scope > [data-grid-item]")).map((item) => {
      const box = item.getBoundingClientRect();
      const img = item.querySelector("a > :first-child")!.getBoundingClientRect();
      const card = item.querySelector("a")!.getBoundingClientRect();
      // The caption line shown at this width (the phone and desktop lines are both in the DOM).
      const caption = Array.from(item.querySelectorAll("[data-fit-line]")).map((e) => e.getBoundingClientRect()).find((b) => b.width > 0)!;
      const href = item.querySelector("a")!.getAttribute("href") ?? "";
      const share = Number((item as HTMLElement).dataset.share);
      return { href, share, left: box.left, right: box.right, top: img.top, width: img.width, height: img.height, bottom: img.bottom, cardBottom: card.bottom, captionTop: caption.top, captionWidth: caption.width };
    });
    return { left: g.left, right: g.right, cols, items };
  });
}

/**
 * Checks one grid and returns its reference size (long side ÷ share, the same for every work) and its
 * smallest gap between two works of a row.
 */
async function checkGrid(page: Page, expected: { cols: number; content: [number, number]; rowSpace: number; minGap: number }) {
  const { left, right, cols, items } = await measure(page);
  expect(cols).toBe(expected.cols);
  // The grid's edges are the content's.
  expect(Math.abs(left - expected.content[0])).toBeLessThanOrEqual(0.5);
  expect(Math.abs(right - expected.content[1])).toBeLessThanOrEqual(0.5);
  // Same proportions between works: one reference size, long side = share × it, share ≥ 70 %.
  const refs = items.map((it) => Math.max(it.width, it.height) / it.share);
  const ref = refs[0]!;
  for (const [k, r] of refs.entries()) {
    expect(Math.abs(r - ref), items[k]!.href).toBeLessThanOrEqual(0.5);
    expect(items[k]!.share).toBeGreaterThanOrEqual(0.7);
  }
  const rows: Array<typeof items> = [];
  for (let start = 0; start < items.length; start += cols) rows.push(items.slice(start, start + cols));
  let smallestGap = Number.POSITIVE_INFINITY;
  for (const [r, row] of rows.entries()) {
    for (const it of row) {
      // Bottoms on one line, captions on one line, each caption as wide as its image.
      expect(Math.abs(it.bottom - row[0]!.bottom)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(it.captionTop - row[0]!.captionTop)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(it.captionWidth - it.width)).toBeLessThanOrEqual(0.5);
    }
    // First work against the left edge, last against the right edge (a full row), equal space between, never under the minimum.
    expect(Math.abs(row[0]!.left - left)).toBeLessThanOrEqual(0.5);
    if (row.length === cols) expect(Math.abs(row[row.length - 1]!.right - right)).toBeLessThanOrEqual(0.5);
    const gaps = row.slice(1).map((it, k) => it.left - row[k]!.right);
    for (const g of gaps) expect(Math.abs(g - gaps[0]!)).toBeLessThanOrEqual(1);
    if (gaps.length) {
      expect(gaps[0]!).toBeGreaterThanOrEqual(expected.minGap - 0.5);
      smallestGap = Math.min(smallestGap, gaps[0]!);
    }
    // From the captions' bottom to the next row's highest work: the board's row space.
    if (r > 0) {
      const space = Math.min(...row.map((it) => it.top)) - Math.max(...rows[r - 1]!.map((it) => it.cardBottom));
      expect(Math.abs(space - expected.rowSpace)).toBeLessThanOrEqual(1);
    }
  }
  return { items, ref, smallestGap };
}

/**
 * Every filter combination: one reference size for all, and the widest row of all of them has the
 * minimum gap (the reference size is the largest that fits).
 */
async function checkFilters(page: Page, path: string, filters: string[], expected: { cols: number; content: [number, number]; rowSpace: number; minGap: number }) {
  const refs: number[] = [];
  let smallest = Number.POSITIVE_INFINITY;
  for (const q of filters) {
    await page.goto(`${path}${q}`);
    await page.waitForLoadState("networkidle");
    // A combination that matches nothing shows no grid.
    if ((await page.locator("main [data-grid]").count()) === 0) continue;
    const { ref, smallestGap } = await checkGrid(page, expected);
    refs.push(ref);
    smallest = Math.min(smallest, smallestGap);
  }
  for (const r of refs) expect(Math.abs(r - refs[0]!)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(smallest - expected.minGap)).toBeLessThanOrEqual(1);
  return refs[0]!;
}

/** Long side of a work's image in the grid. */
function longSide(items: Array<{ href: string; width: number; height: number }>, slug: string) {
  const it = items.find((x) => x.href.startsWith(`/works/${slug}`) || x.href.startsWith(`/prints/${slug}`))!;
  return Math.max(it.width, it.height);
}

const combos = (a: string[], b: string[]) => a.flatMap((x) => b.map((y) => `?${[x, y].filter(Boolean).join("&")}`));
const minGap = (page: Page) => (isDesktop(page) ? 40 : 16);

/**
 * Every visible caption line: one line, inside its card, never a "$" without "from", and the wording
 * shown is the longest that fits the card's own width (the first of its measured variants that fits).
 */
async function checkCaptions(page: Page) {
  const problems = await page.locator("main [data-grid] [data-fit-line]").evaluateAll((lines) =>
    lines.flatMap((line) => {
      const box = line.getBoundingClientRect();
      const style = getComputedStyle(line);
      if (box.width === 0 || Number(style.opacity) === 0) return [];
      const shown = Array.from(line.children).filter((c) => !c.hasAttribute("data-fit-measure"));
      const text = shown.map((c) => c.textContent ?? "").join("   ").trim();
      const out: string[] = [];
      const rects = shown.map((c) => c.getBoundingClientRect());
      if (rects.some((r) => r.right > box.right + 0.5)) out.push(`${text}: wider than its card (${Math.round(box.width)} px)`);
      if (rects.some((r) => Math.abs(r.top - rects[0]!.top) > 0.5)) out.push(`${text}: more than one line`);
      if (text.includes("$") && !/from \$/.test(text)) out.push(`${text}: a price without "from"`);
      const variants = Array.from(line.querySelector("[data-fit-measure]")!.children) as HTMLElement[];
      const fit = variants.findIndex((v) => v.getBoundingClientRect().width <= box.width + 0.5);
      const want = variants[fit === -1 ? variants.length - 1 : fit]!;
      const wanted = Array.from(want.children).map((c) => c.textContent ?? "").join("   ").trim();
      if (wanted !== text) out.push(`${text}: expected "${wanted}" at ${Math.round(box.width)} px`);
      return out;
    }),
  );
  expect(problems).toEqual([]);
}

const content = (page: Page): [number, number] => (isDesktop(page) ? [120, 1320] : [16, 374]);

test("shop: grid by original size, one scale for every filter, captions per card", async ({ page }) => {
  const expected = { cols: isDesktop(page) ? 5 : 2, content: content(page), rowSpace: isDesktop(page) ? 64 : 28, minGap: minGap(page) };
  const ref = await checkFilters(page, "/shop/", combos(["", "level=beginner", "level=intermediate", "level=advanced"], ["", "palette=warm", "palette=cool", "palette=earth"]), expected);
  expect(ref).toBeGreaterThan(0);
  await page.goto("/shop/");
  const { items } = await checkGrid(page, expected);
  // A work and a turned one of the same size are the same size on screen: N°06 46×61 and N°01 61×46, N°09 40×50 and N°07 50×40.
  expect(Math.abs(longSide(items, "n06") - longSide(items, "n01"))).toBeLessThanOrEqual(0.5);
  expect(Math.abs(longSide(items, "n09") - longSide(items, "n07"))).toBeLessThanOrEqual(0.5);
  if (isDesktop(page)) {
    // The desktop meta line morphs in on hover: check every card with it shown.
    const cards = page.locator("main a[href^='/works/']");
    for (let i = 0; i < (await cards.count()); i++) {
      await cards.nth(i).hover();
      await page.waitForTimeout(100);
      await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));
      await checkCaptions(page);
    }
  } else {
    await checkCaptions(page);
  }
  // A wide card writes the level in full: N°01 (61×46, 96.7 % of the reference size on its long side, its width).
  if (isDesktop(page)) {
    await page.locator("main a[href^='/works/n01']").hover();
    await page.waitForTimeout(100);
    await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));
  }
  const shown = await page.locator("main a[href^='/works/n01'] [data-fit-line]").evaluateAll((lines) =>
    lines.filter((l) => l.getBoundingClientRect().width > 0).map((l) => Array.from(l.children).filter((c) => !c.hasAttribute("data-fit-measure")).map((c) => c.textContent).join("   ")),
  );
  expect(shown).toEqual([isDesktop(page) ? "Intermediate · 2h30   from $25" : "Inter. · 2h30   from $25"]);
});

test("home: new works on the same rules", async ({ page }) => {
  await page.goto("/");
  await checkGrid(page, { cols: isDesktop(page) ? 5 : 2, content: content(page), rowSpace: 24, minGap: minGap(page) });
  await checkCaptions(page);
});

test("/prints: Sand sheets on the same rules, one scale for every filter, from $ kept", async ({ page }) => {
  const expected = { cols: isDesktop(page) ? 5 : 2, content: content(page), rowSpace: isDesktop(page) ? 64 : 28, minGap: minGap(page) };
  await checkFilters(page, "/prints/", combos(["", "orientation=portrait", "orientation=landscape"], ["", "size=s", "size=m", "size=l"]), expected);
  await page.goto("/prints/");
  const { items } = await checkGrid(page, expected);
  expect(Math.abs(longSide(items, "n09") - longSide(items, "n07"))).toBeLessThanOrEqual(0.5);
  await checkCaptions(page);
});

test("admin catalog: the same rules", async ({ page }) => {
  await asStaff(page);
  await page.goto("/admin/works/");
  await expect(page.locator("main [data-grid-item]")).toHaveCount(15);
  // The admin content column: the grid spans it edge to edge (its parent's content box).
  const box = await page.locator("main [data-grid]").evaluate((g) => {
    const p = g.parentElement!;
    const r = p.getBoundingClientRect();
    const st = getComputedStyle(p);
    return [r.left + Number.parseFloat(st.paddingLeft), r.right - Number.parseFloat(st.paddingRight)] as [number, number];
  });
  const wide = (page.viewportSize()?.width ?? 1440) >= 768;
  await checkGrid(page, { cols: wide ? 5 : 2, content: box, rowSpace: 24, minGap: wide ? 40 : 16 });
  await checkCaptions(page);
});
