// Checks the looping favicon in a genuine background tab (docs/decisions.md "Animated favicon").
//   node scripts/favicon-background.mjs [chrome|arc] [minutes=6.5]      (after `npm run build`)
// Starts the real browser (temporary profile, remote debugging), opens the site in a tab, then a new
// tab in the same window takes the foreground. Raw CDP, no Playwright: Playwright keeps every page
// "visible" and turns background throttling off. Every minute it prints, for the last minute, the
// favicon's image changes (≈ 450 in the foreground) and the ticks of a plain 83 ms page timer (Chrome
// slows them to 60, then after 5 minutes to about 1).
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const APPS = { chrome: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", arc: "/Applications/Arc.app/Contents/MacOS/Arc" };
const which = process.argv[2] ?? "chrome";
const minutes = Number(process.argv[3] ?? 6.5);
const port = 9300 + Object.keys(APPS).indexOf(which);
const site = 4190 + Object.keys(APPS).indexOf(which);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = spawn(process.execPath, [path.join(import.meta.dirname, "serve-out.mjs"), String(site)], { stdio: "ignore" });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), `geste-favicon-${which}-`));
const browser = spawn(APPS[which], [`--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, "--no-first-run", "--no-default-browser-check", "--window-size=1000,700", "about:blank"], { stdio: "ignore" });
const quit = () => (browser.kill(), server.kill(), fs.rmSync(profile, { recursive: true, force: true }));

let version = null;
for (let i = 0; i < 60 && !version; i++) {
  await sleep(500);
  version = await fetch(`http://127.0.0.1:${port}/json/version`).then((r) => r.json()).catch(() => null);
}
if (!version) {
  console.log(`${which}: no remote debugging on :${port}`);
  quit();
  process.exit(1);
}
console.log(which, version.Browser);

const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  pending.get(d.id)?.(d);
  pending.delete(d.id);
};
const send = (method, params = {}, sessionId) => new Promise((r) => (pending.set(++id, r), ws.send(JSON.stringify({ id, method, params, sessionId }))));
const inPage = async (sid, expression) => (await send("Runtime.evaluate", { expression, returnByValue: true }, sid)).result?.result?.value;

const { result: a } = await send("Target.createTarget", { url: `http://localhost:${site}/` });
const { result: { sessionId } } = await send("Target.attachToTarget", { targetId: a.targetId, flatten: true });
await send("Target.activateTarget", { targetId: a.targetId });
for (let i = 0; i < 40 && !(await inPage(sessionId, `document.querySelector('link[rel="icon"]')?.href.startsWith("data:")`)); i++) await sleep(500);
console.log("favicon:", await inPage(sessionId, `document.querySelector('link[rel="icon"]').href.slice(0, 22)`) ?? "?");
await inPage(sessionId, `window.iconLog = []; window.timerLog = [];
  new MutationObserver(() => iconLog.push(Date.now())).observe(document.querySelector('link[rel="icon"]'), { attributes: true, attributeFilter: ["href"] });
  setInterval(() => timerLog.push(Date.now()), 83); true`);
await sleep(10_000);
console.log("foreground, last 10 s:", await inPage(sessionId, `iconLog.filter((t) => t > Date.now() - 10000).length`), "favicon changes");

const { result: b } = await send("Target.createTarget", { url: "about:blank" });
await send("Target.activateTarget", { targetId: b.targetId });
await sleep(1000);
console.log("site tab:", await inPage(sessionId, "document.visibilityState"));
const t0 = Date.now();
while (Date.now() - t0 < minutes * 60_000) {
  await sleep(Math.min(60_000, minutes * 60_000 - (Date.now() - t0)));
  const [icon, timer, state] = await inPage(sessionId, `(() => { const s = Date.now() - 60000; return [iconLog.filter((t) => t > s).length, timerLog.filter((t) => t > s).length, document.visibilityState]; })()`);
  console.log(`${((Date.now() - t0) / 60_000).toFixed(1)} min in the background (${state}): last minute ${icon} favicon changes, ${timer} page timer ticks`);
}
ws.close();
quit();
