// Submits site URLs to IndexNow (shared by Bing, Naver, Yandex, Seznam and others).
// Usage: node scripts/indexnow.mjs [--dry]   (reads .indexnow-urls.json written by postbuild)
// Only submit after the URLs are live, and only when pages are new or changed.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://dlgodrk.github.io").replace(/\/$/, "");
const key = fs.readFileSync(path.join(root, "scripts", "indexnow-key.txt"), "utf8").trim();
const urls = JSON.parse(fs.readFileSync(path.join(root, ".indexnow-urls.json"), "utf8"));
const host = new URL(SITE_URL).host;
const keyLocation = `${SITE_URL}/${key}.txt`;
const dry = process.argv.includes("--dry");

// Confirm the key file is reachable first; engines reject submissions otherwise.
const check = await fetch(keyLocation);
const body = (await check.text()).trim();
if (!check.ok || body !== key) {
  console.error(`Key file not live at ${keyLocation} (status ${check.status}). Deploy first.`);
  process.exit(1);
}

const endpoints = ["https://api.indexnow.org/indexnow", "https://searchadvisor.naver.com/indexnow"];
for (let i = 0; i < urls.length; i += 10000) {
  const urlList = urls.slice(i, i + 10000);
  for (const endpoint of endpoints) {
    if (dry) {
      console.log(`[dry] ${endpoint}: ${urlList.length} URLs`);
      continue;
    }
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host, key, keyLocation, urlList }),
    });
    console.log(`${endpoint}: HTTP ${res.status} for ${urlList.length} URLs ${res.ok ? "" : await res.text()}`);
  }
}
