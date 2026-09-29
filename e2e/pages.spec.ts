import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** Static store pages: Method, About (and the other forks' sections below). docs/screens/store.md. */

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1440) < 1200;

async function expectNoAxeViolations(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
}

// ── Method, About ───────────────────────────────────────────────────────────

test("method: steps, sizes, questions and the way to the shop", async ({ page }) => {
  await page.goto("/method/");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { level: 1, name: "How Geste works" })).toBeVisible();
  await expect(page.getByText("~3h30")).toBeVisible();
  if (isPhone(page)) {
    // MMethod: an accordion, the first question open.
    await expect(page.getByText("That is who Geste is for. Start with a Beginner work.")).toBeVisible();
    await page.getByRole("button", { name: "Offline?" }).click();
    await expect(page.getByText("Yes: open the guide once online.")).toBeVisible();
  } else {
    await expect(page.getByText("Yes. Open the guide once online and it stays on your phone.")).toBeVisible();
    await expect(page.getByRole("link", { name: "More questions" })).toHaveAttribute("href", /\/help\/?$/);
  }
  await expectNoAxeViolations(page);
  await page.getByRole("link", { name: /Browse works/ }).click();
  await expect(page).toHaveURL(/\/shop\/?$/);
});

test("the footer's Shopping lists lands on the method's questions", async ({ page }) => {
  test.skip(isPhone(page), "the phone footer has no Shopping lists link (MHome)");
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByRole("contentinfo").getByRole("link", { name: "Shopping lists" }).click();
  await expect(page).toHaveURL(/\/method\/?#materials$/);
  await expect(page.getByRole("heading", { name: "Which paint do I need?" })).toBeInViewport();
});

test("about: the studio, its three promises, the way to the method", async ({ page }) => {
  await page.goto("/about/");
  await expect(page.getByRole("heading", { level: 1, name: "A studio that designs paintings for other hands." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Honest previews" })).toBeVisible();
  await expectNoAxeViolations(page);
  await page.getByRole("link", { name: "Read the method" }).click();
  await expect(page).toHaveURL(/\/method\/?$/);
});

// ── Help, Legal ─────────────────────────────────────────────────────────────

test("help: topics follow the URL hash, from the footer too", async ({ page }) => {
  await page.goto("/help/");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { level: 1, name: "How can we help?" })).toBeVisible();
  if (isPhone(page)) {
    // MHelp: Shipping open, the others closed, the contact form below.
    await expect(page.getByText(/Guides unlock instantly\./)).toBeVisible();
    await page.getByRole("button", { name: /^Returns/ }).click();
    await expect(page.getByText(/Prints: 14 days to change your mind\./)).toBeVisible();
    await expect(page.getByText(/Guides unlock instantly\./)).toBeHidden();
    await page.goto("/help/#faq");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/Never painted\? Start with a Beginner work\./)).toBeVisible();
  } else {
    await expect(page.getByRole("button", { name: "Shipping" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("Rolled in a rigid tube, wrapped in acid-free paper.")).toBeVisible();
    await page.getByRole("button", { name: "Returns" }).click();
    await expect(page).toHaveURL(/\/help\/#returns$/);
    await expect(page.getByText("Send a photo within 48 hours, we reprint it for free.")).toBeVisible();
    await page.getByRole("button", { name: "Gift cards" }).click();
    await expect(page.getByRole("link", { name: /Buy a gift card/ })).toHaveAttribute("href", /\/gift-cards\/?$/);
    await expectNoAxeViolations(page);
    // In-app links to /help#… from the same page and from another one.
    await page.getByRole("contentinfo").getByRole("link", { name: "FAQ", exact: true }).click();
    await expect(page.getByRole("button", { name: "FAQ" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("Three times per guide, each copy carries your name.")).toBeVisible();
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("contentinfo").getByRole("link", { name: "Returns & refunds" }).click();
    await expect(page).toHaveURL(/\/help\/?#returns$/);
    await expect(page.getByRole("button", { name: "Returns" })).toHaveAttribute("aria-pressed", "true");
  }
});

test("help: the contact form checks its fields, sends, and the message reaches the admin inbox", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/help/#contact");
  await page.waitForLoadState("networkidle");
  const form = page.locator("form").filter({ has: page.getByLabel("Message") }).locator("visible=true");
  await form.getByRole("button", { name: /^Send/ }).click();
  await expect(form.getByText("Enter your email")).toBeVisible();
  await expect(form.getByText("Write your message")).toBeVisible();
  await form.getByLabel("Your email").fill("camille.martin@mail.com");
  if (!isPhone(page)) await form.getByLabel("Order number — optional").fill("#GS-2041");
  await form.getByLabel("Message").fill("My print tube arrived dented\nThe print itself looks fine.");
  await expectNoAxeViolations(page);
  await form.getByRole("button", { name: /^Send/ }).click();
  await expect(page.getByRole("status").filter({ hasText: isPhone(page) ? "Sent. We reply within one working day." : "Message sent. We reply within one working day, from hello@geste.studio." })).toBeVisible();

  if (isPhone(page)) return; // the admin inbox is checked on desktop
  await page.goto("/admin/login/");
  await page.getByLabel("Password").fill("anything");
  await page.getByRole("button", { name: /^Continue/ }).click();
  await page.getByLabel("Code").fill("123456");
  await page.getByRole("button", { name: /^Log in/ }).click();
  await page.goto("/admin/support/");
  await expect(page.getByText("My print tube arrived dented").first()).toBeVisible();
});

test("legal: every document has its page, cookie choices are kept", async ({ page }) => {
  const docs = [
    ["notice", "Legal notice", "[Your name], micro-entreprise, SIRET [number]"],
    ["terms", "Terms of sale", "Prints: 14"],
    ["privacy", isPhone(page) ? "Privacy" : "Privacy policy", isPhone(page) ? "We collect email, name, address" : "Email, name, address for prints, orders, guide progress."],
    ["accessibility", "Accessibility", "We aim for WCAG 2.1 AA"],
  ] as const;
  for (const [kind, title, text] of docs) {
    await page.goto(`/legal/${kind}/`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { level: 1, name: "The small print" })).toBeVisible();
    if (isPhone(page)) await expect(page.getByRole("button", { name: new RegExp(`^${title.replace(/[()[\]]/g, "\\$&")}`) })).toHaveAttribute("aria-expanded", "true");
    else await expect(page.getByRole("navigation", { name: "Legal documents" }).getByRole("link", { name: title })).toHaveAttribute("aria-current", "page");
    await expect(page.getByText(text).locator("visible=true").first()).toBeVisible();
    await expectNoAxeViolations(page);
  }

  await page.goto("/legal/cookies/");

  await page.waitForLoadState("networkidle");
  await page.evaluate(() => localStorage.removeItem("geste.cookies.v1"));
  await page.reload();
  const ads = page.getByLabel(isPhone(page) ? "Ads" : "Social media and ads", { exact: true });
  await expect(page.getByLabel(isPhone(page) ? "Audience" : "Audience measurement", { exact: true })).toBeChecked();
  await expect(ads).not.toBeChecked();
  await ads.check();
  await page.getByRole("button", { name: /Save my choices/ }).click();
  await expect(page.getByRole("button", { name: /^Saved/ })).toBeVisible();
  await expectNoAxeViolations(page);
  await page.reload();
  await expect(page.getByLabel(isPhone(page) ? "Ads" : "Social media and ads", { exact: true })).toBeChecked();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("geste.cookies.v1")!).ads)).toBe(true);

  // Unknown documents are the 404 page.
  const res = await page.goto("/legal/refunds/");
  expect(res?.status()).toBe(404);
});
