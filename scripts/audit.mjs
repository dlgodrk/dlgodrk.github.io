// Static SEO/link audit over ./out. Usage: node scripts/audit.mjs
// Checks: internal links resolve, unique titles/descriptions, canonical present and self-referencing,
// description length, H1 count, JSON-LD parses.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "out");
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://dlgodrk.github.io").replace(/\/$/, "");
const basePath = new URL(SITE_URL).pathname.replace(/\/$/, "");

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name === "index.html") acc.push(p);
  }
  return acc;
}

const decode = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const files = walk(out);
const pages = new Map();
const problems = [];
const titles = new Map();
const descs = new Map();

for (const f of files) {
  const rel = "/" + path.relative(out, path.dirname(f)).split(path.sep).join("/");
  const urlPath = rel === "/" ? "/" : rel + "/";
  const html = fs.readFileSync(f, "utf8");
  pages.set(urlPath, html);
}

function exists(p) {
  let clean = p.split("#")[0].split("?")[0];
  if (basePath && clean.startsWith(basePath)) clean = clean.slice(basePath.length) || "/";
  if (clean === "") return true;
  if (pages.has(clean)) return true;
  if (!clean.endsWith("/") && pages.has(clean + "/")) return true;
  return fs.existsSync(path.join(out, clean));
}

for (const [urlPath, html] of pages) {
  if (urlPath.startsWith("/404") || urlPath.startsWith("/_not-found")) continue;
  const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "");
  const desc = decode(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "");
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (!title) problems.push(`${urlPath}: missing <title>`);
  if (!desc) problems.push(`${urlPath}: missing description`);
  else if (desc.length < 50 || desc.length > 180) problems.push(`${urlPath}: description length ${desc.length}`);
  if (!canonical) problems.push(`${urlPath}: missing canonical`);
  else if (canonical !== SITE_URL + urlPath) problems.push(`${urlPath}: canonical ${canonical}`);
  if (h1s !== 1) problems.push(`${urlPath}: ${h1s} <h1>`);
  if (titles.has(title)) problems.push(`${urlPath}: duplicate title with ${titles.get(title)}`);
  else titles.set(title, urlPath);
  if (desc && descs.has(desc)) problems.push(`${urlPath}: duplicate description with ${descs.get(desc)}`);
  else descs.set(desc, urlPath);
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(m[1]);
    } catch {
      problems.push(`${urlPath}: invalid JSON-LD`);
    }
  }
  for (const m of html.matchAll(/<a [^>]*href="([^"]+)"/g)) {
    const href = decode(m[1]);
    if (/^(https?:|mailto:|tel:|#)/.test(href)) {
      if (href.startsWith(SITE_URL) && !exists(href.slice(SITE_URL.length) || "/")) problems.push(`${urlPath}: broken abs link ${href}`);
      continue;
    }
    if (href.startsWith("/") && !exists(href)) problems.push(`${urlPath}: broken link ${href}`);
  }
}

const titleLens = [...titles.keys()].map((t) => t.length);
console.log(`pages: ${pages.size}, problems: ${problems.length}, title length max ${Math.max(...titleLens)}`);
const counts = {};
for (const p of problems) {
  const kind = p.replace(/^[^:]+: /, "").replace(/\d+/g, "N").slice(0, 40);
  counts[kind] = (counts[kind] || 0) + 1;
}
console.log(counts);
console.log(problems.slice(0, 40).join("\n"));
