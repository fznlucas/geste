// Serves the static export (out/) the way GitHub Pages does, for Playwright and local checks:
// /shop → 301 /shop/, /shop/ → shop/index.html, unknown paths → 404.html with status 404.
// Usage: node scripts/serve-out.mjs [port]. (Python's http.server drops connections under the
// test load: its listen backlog is 5.)
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..", "out");
const port = Number(process.argv[2] ?? 4174);
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".webmanifest": "application/manifest+json", ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon", ".woff2": "font/woff2",
};

function send(res, file, status = 200) {
  res.writeHead(status, { "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream", "Cache-Control": "no-cache" });
  fs.createReadStream(file).pipe(res);
}

http
  .createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const rel = decodeURIComponent(url.pathname);
    const file = path.join(root, rel);
    if (!file.startsWith(root)) return send(res, path.join(root, "404.html"), 404);
    const stat = fs.statSync(file, { throwIfNoEntry: false });
    if (stat?.isDirectory()) {
      if (!rel.endsWith("/")) {
        res.writeHead(301, { Location: `${rel}/${url.search}` });
        return res.end();
      }
      const index = path.join(file, "index.html");
      if (fs.existsSync(index)) return send(res, index);
    } else if (stat?.isFile()) return send(res, file);
    else if (fs.existsSync(`${file}.html`)) return send(res, `${file}.html`);
    send(res, path.join(root, "404.html"), 404);
  })
  .listen(port, () => console.log(`out/ on http://localhost:${port}`));
