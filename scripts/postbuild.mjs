// Runs after `next build` (static export in ./out).
// Writes sitemap.xml, robots.txt, rss.xml and the IndexNow key file by scanning
// the exported HTML, so every page that exists is listed automatically.
import fs from "node:fs";
import path from "node:path";
import { RULES_CHECKED_AT } from "../src/lib/site.ts";

const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, "out");
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://dlgodrk.github.io").replace(/\/$/, "");
const INDEXNOW_KEY = fs.readFileSync(path.join(root, "scripts", "indexnow-key.txt"), "utf8").trim();

if (!fs.existsSync(outDir)) {
  console.error("postbuild: ./out not found. Did next build run with output: 'export'?");
  process.exit(1);
}

/** Recursively collect index.html files. */
function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith("_") || entry.name === "og") continue;
      walk(p, acc);
    } else if (entry.name === "index.html") {
      acc.push(p);
    }
  }
  return acc;
}

const decode = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'");

const pages = [];
for (const file of walk(outDir)) {
  const rel = path.relative(outDir, path.dirname(file)).split(path.sep).join("/");
  const urlPath = rel ? `/${rel}/` : "/";
  if (urlPath.startsWith("/404")) continue;
  const html = fs.readFileSync(file, "utf8");
  if (/<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(html)) continue;
  const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "");
  const description = decode(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "");
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
  const loc = canonical ?? `${SITE_URL}${urlPath}`;
  const depth = urlPath === "/" ? 0 : urlPath.split("/").filter(Boolean).length;
  pages.push({ loc, urlPath, title, description, depth });
}
pages.sort((a, b) => a.depth - b.depth || a.urlPath.localeCompare(b.urlPath, "en", { numeric: true }));

// lastmod = the date page content last changed (not the build date; daily rebuilds would make it meaningless).
const today = process.env.CONTENT_UPDATED_AT ?? RULES_CHECKED_AT;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (p) =>
      `  <url><loc>${esc(p.loc)}</loc><lastmod>${today}</lastmod><priority>${p.depth === 0 ? "1.0" : p.depth === 1 ? "0.9" : "0.6"}</priority></url>`,
  )
  .join("\n")}
</urlset>
`;
fs.writeFileSync(path.join(outDir, "sitemap.xml"), sitemap);

const robots = `User-agent: *
Allow: /

User-agent: Yeti
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
fs.writeFileSync(path.join(outDir, "robots.txt"), robots);

// RSS of the main calculator pages (depth 1) for Naver Search Advisor.
const rssItems = pages.filter((p) => p.depth === 1 && !["/about/", "/privacy/"].includes(p.urlPath));
const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>셈도장 계산기</title>
<link>${SITE_URL}/</link>
<description>2026년 기준 생활 계산기 모음</description>
<language>ko</language>
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${rssItems
  .map(
    (p) => `<item>
<title>${esc(p.title)}</title>
<link>${esc(p.loc)}</link>
<guid>${esc(p.loc)}</guid>
<description>${esc(p.description)}</description>
<pubDate>${new Date().toUTCString()}</pubDate>
</item>`,
  )
  .join("\n")}
</channel>
</rss>
`;
fs.writeFileSync(path.join(outDir, "rss.xml"), rss);

fs.writeFileSync(path.join(outDir, `${INDEXNOW_KEY}.txt`), INDEXNOW_KEY);
fs.writeFileSync(path.join(root, ".indexnow-urls.json"), JSON.stringify(pages.map((p) => p.loc), null, 2));

console.log(`postbuild: ${pages.length} URLs -> sitemap.xml, robots.txt, rss.xml (${rssItems.length} items), IndexNow key file`);
