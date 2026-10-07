import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { getReviews, getSupportThreads, orderNumber } from "./helpers";

/** Inbox and moderation queue at the e2e clock: board threads and reviews plus simulated ones. */
const UNREAD = (await getSupportThreads({ status: "open", unread: true })).length;
const OPEN = (await getSupportThreads({ status: "open" })).length;
const PENDING = (await getReviews({ status: "pending" })).length;
const badge = (label: string, n: number) => (n ? new RegExp(`${label}\\s*${n}$`) : new RegExp(`^${label}$`));

/** M6: support inbox, reviews moderation, content (docs/screens/admin.md). */

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768;

async function adminLogIn(page: Page, role?: "owner" | "support" | "fulfilment" | "content") {
  await page.goto("/admin/login/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByLabel("Password").fill("anything");
  await page.getByRole("button", { name: /^Continue/ }).click();
  await page.getByLabel("Code").fill("123456");
  await page.getByRole("button", { name: /^Log in/ }).click();
  await expect(page).toHaveURL(/\/admin\/?$/);
  if (role && role !== "owner") {
    await page.evaluate((r) => {
      const s = JSON.parse(localStorage.getItem("geste.session.v1")!);
      s.staff.role = r;
      localStorage.setItem("geste.session.v1", JSON.stringify(s));
    }, role);
  }
}

async function expectNoAxeViolations(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
}

const supportBadge = (page: Page) => page.getByRole("link", { name: /^Support inbox/ });
const reviewsBadge = (page: Page) => page.getByRole("link", { name: /^Reviews & results/ });

test("support: open, reply with a saved reply, mark as done", async ({ page }) => {
  test.skip(isPhone(page), "desktop inbox");
  await adminLogIn(page);
  await page.goto("/admin/support/");
  await expect(supportBadge(page)).toHaveText(badge("Support inbox", UNREAD));
  const list = page.getByRole("list").filter({ has: page.getByRole("button", { name: /Yanis Benali/ }) });
  await expect(list.getByRole("button")).toHaveCount(OPEN);

  // Opening Sarah's new thread: one new message left.
  await page.getByRole("button", { name: /Sarah Cohen/ }).click();
  await expect(page.getByRole("heading", { name: "When will my print ship?" })).toBeVisible();
  await expect(supportBadge(page)).toHaveText(badge("Support inbox", UNREAD - 1));

  await page.getByRole("button", { name: /Yanis Benali/ }).click();
  await expect(page.getByRole("heading", { name: "Refund for N°04?" })).toBeVisible();
  await page.getByRole("button", { name: "Send reply" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Write a reply first." })).toBeVisible();
  await page.getByRole("button", { name: "Format swap" }).click();
  await expect(page.getByLabel("Reply")).toHaveValue(/^Hi Yanis, no problem: I have switched your guide to 40×50/);
  await page.getByRole("button", { name: "Send reply" }).click();
  await expect(page.getByRole("list", { name: "Messages" }).getByRole("listitem")).toHaveCount(2);
  await expect(page.getByLabel("Reply")).toHaveValue("");
  await expect(page.getByRole("link", { name: `Order #${orderNumber("order-2035")}` })).toHaveAttribute("href", new RegExp(`/admin/orders/detail/?\\?number=${orderNumber("order-2035")}`));

  await page.getByRole("button", { name: "Mark as done" }).click();
  await expect(page.getByRole("button", { name: "Reopen" })).toBeVisible();
  await expect(list.getByRole("button", { name: /Yanis Benali/ })).toHaveCount(0);
  await expect(supportBadge(page)).toHaveText(badge("Support inbox", UNREAD - 2));
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByRole("button", { name: /Yanis Benali/ })).toBeVisible();
  await expectNoAxeViolations(page);

  // The reply is in the audit log (Settings › Security).
  const audit = await page.evaluate(() => JSON.parse(localStorage.getItem("geste.admin.v2")!).audit.map((a: { summary: string }) => a.summary));
  expect(audit).toEqual(expect.arrayContaining(["Lucas replied to Yanis Benali", expect.stringMatching(/^Lucas closed “Refund for N°04\?”/)]));
});

test("reviews: approve, feature, hide, undo, reply privately", async ({ page }) => {
  test.skip(isPhone(page), "desktop grid");
  await adminLogIn(page);
  await page.goto("/admin/reviews/");
  await expect(reviewsBadge(page)).toHaveText(badge("Reviews & results", PENDING));
  const cards = page.getByRole("listitem");
  await expect(cards).toHaveCount(PENDING);
  await cards.filter({ hasText: "Hugo Petit" }).getByRole("button", { name: "Approve" }).click();
  await cards.filter({ hasText: "Emma Roux" }).getByRole("button", { name: "Feature" }).click();
  await cards.filter({ hasText: "Tom Laurent" }).getByRole("button", { name: "Hide" }).click();
  await expect(cards).toHaveCount(PENDING - 3);
  await expect(reviewsBadge(page)).toHaveText(badge("Reviews & results", PENDING - 3));

  await page.getByRole("button", { name: "Published", exact: true }).click();
  await expect(cards.filter({ hasText: "Hugo Petit · N°01" })).toContainText("Published");
  await expect(cards.filter({ hasText: "Emma Roux · N°05" })).toContainText("Published · featured on home");
  await page.getByRole("button", { name: "Hidden", exact: true }).click();
  await expect(cards.filter({ hasText: "Tom Laurent · N°02" })).toContainText("Hidden");
  await expectNoAxeViolations(page);

  // Undo from the toast puts it back in moderation.
  await page.getByRole("button", { name: "To moderate", exact: true }).click();
  await cards.filter({ hasText: "Chloé Garnier" }).getByRole("button", { name: "Hide" }).click();
  await page.getByRole("button", { name: "Undo" }).last().click();
  await expect(cards.filter({ hasText: "Chloé Garnier" })).toHaveCount(1);

  // Chloé has no conversation yet: "Reply privately" starts one.
  await cards.filter({ hasText: "Chloé Garnier" }).getByRole("link", { name: "Reply privately" }).click();
  await expect(page).toHaveURL(/\/admin\/support\/?\?customer=cus-chloe-garnier/);
  await expect(page.getByRole("heading", { name: "Your review of N°03" })).toBeVisible();
  await page.getByLabel("Reply").fill("Hi Chloé, thank you. Can we share your painting?");
  await page.getByRole("button", { name: "Send reply" }).click();
  await expect(page.getByRole("button", { name: /Chloé Garnier/ })).toBeVisible();
  await expect(page.getByRole("list", { name: "Messages" })).toContainText("Can we share your painting?");
});

test("content: journal, new article, home, translations, legal", async ({ page }) => {
  test.skip(isPhone(page), "desktop tabs");
  await adminLogIn(page, "content");
  await page.goto("/admin/content/");
  await expect(page.getByRole("heading", { name: "Content" })).toBeVisible();
  const journal = page.getByRole("table", { name: "Journal" });
  await expect(journal.getByRole("link", { name: /How to avoid mud: three rules/ })).toHaveAttribute("href", /\/journal\/avoid-mud-three-rules/);
  await expect(journal).toContainText("Why N°10 took three tries");
  await page.getByRole("button", { name: "New article" }).click();
  await expect(journal).toContainText("Untitled article");

  await page.getByRole("button", { name: "Home page", exact: true }).click();
  // Lucas, Oct 7: the hero is N°03; the picker offers live works painted by the studio (not N°06 or N°09).
  await expect(page.getByLabel("Hero work")).toHaveValue("n03");
  await expect(page.getByLabel("Hero work").locator("option[value=n06]")).toHaveCount(0);
  await page.getByLabel("Hero work").selectOption("n10");
  await page.getByRole("button", { name: "Publish home" }).click();
  await expect(page.getByRole("button", { name: /^Published/ })).toBeVisible();

  await page.getByRole("button", { name: "Translations", exact: true }).click();
  await expect(page.getByRole("table", { name: "French translation" })).toContainText("Store pages");
  await page.getByRole("button", { name: "Legal pages", exact: true }).click();
  await expect(page.getByRole("table", { name: "Legal pages" })).toContainText("Needs SIRET");
  await expectNoAxeViolations(page);

  // Content cannot open the support inbox.
  await expect(page.getByRole("link", { name: /^Support inbox/ })).toHaveCount(0);
  await page.goto("/admin/support/");
  await expect(page.getByText("The Content role cannot open this page.")).toBeVisible();
});

test("phone: the inbox opens a conversation and comes back", async ({ page }) => {
  test.skip(!isPhone(page), "phone layout");
  await adminLogIn(page);
  await page.goto("/admin/support/");
  await page.getByRole("button", { name: /Emma Roux/ }).click();
  await expect(page.getByRole("heading", { name: "Layer 2 turned grey" })).toBeVisible();
  await page.getByRole("button", { name: "Mud rescue" }).click();
  await page.getByRole("button", { name: "Send reply" }).click();
  await expect(page.getByRole("list", { name: "Messages" }).getByRole("listitem")).toHaveCount(2);
  await page.getByRole("button", { name: "← Inbox" }).click();
  await expect(page.getByRole("button", { name: /Yanis Benali/ })).toBeVisible();
  await expectNoAxeViolations(page);
});
