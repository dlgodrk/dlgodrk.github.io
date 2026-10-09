// Visual QA helper: emulates a device via the Chrome DevTools Protocol, saves a full-page
// screenshot and reports horizontal overflow. Usage:
//   node scripts/qa-shot.mjs <baseUrl> <outDir> <width> <path...>
// Example: node scripts/qa-shot.mjs http://localhost:4174 ./shots 390 / /salary/ /age/1990/
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const [base, outDir, widthArg, ...paths] = process.argv.slice(2);
const width = Number(widthArg || 390);
const mobile = width < 768;
const chrome = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const port = 9300 + Math.floor(Math.random() * 500);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "qa-chrome-"));
fs.mkdirSync(outDir, { recursive: true });

const proc = spawn(chrome, [`--headless=new`, `--remote-debugging-port=${port}`, "--remote-allow-origins=*", `--user-data-dir=${profile}`, "--disable-gpu", "about:blank"], {
  stdio: "ignore",
});

async function waitForTarget() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("Chrome did not start");
}

const wsUrl = await waitForTarget();
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const pending = new Map();
const listeners = [];
ws.addEventListener("message", (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  } else if (msg.method) listeners.forEach((l) => l(msg));
});
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const n = ++id;
    pending.set(n, resolve);
    ws.send(JSON.stringify({ id: n, method, params }));
  });

await send("Page.enable");
await send("Runtime.enable");
const consoleErrors = [];
listeners.push((m) => {
  if (m.method === "Runtime.consoleAPICalled" && (m.params.type === "error" || m.params.type === "warning")) consoleErrors.push(m.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 300));
  if (m.method === "Runtime.exceptionThrown") consoleErrors.push("EXCEPTION " + (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).slice(0, 300));
});
await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile });
const report = [];
for (const p of paths) {
  consoleErrors.length = 0;
  await send("Page.navigate", { url: base + p });
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 250));
    const st = await send("Runtime.evaluate", { expression: "document.readyState + '|' + location.href", returnByValue: true });
    const v = st.result?.result?.value ?? "";
    if (v.startsWith("complete|") && v.includes(p)) break;
  }
  await new Promise((r) => setTimeout(r, 800));
  const evalRes = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const vw = document.documentElement.clientWidth;
      const sw = document.documentElement.scrollWidth;
      const wide = [];
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.right > vw + ${Number(process.env.OVER || 1)} && r.width > 0 && (${process.env.ALL ? 'true' : 'false'} || !el.closest('.table-wrap')) && getComputedStyle(el).position !== 'fixed') {
          wide.push((el.tagName.toLowerCase() + '.' + (el.className && el.className.baseVal === undefined ? el.className : '')).slice(0, 80) + ' right=' + Math.round(r.right));
        }
      }
      return { vw, sw, h: document.documentElement.scrollHeight, wide: wide.slice(0, 8) };
    })()`,
  });
  const v = evalRes.result.result.value;
  if (!process.env.VIEWPORT_ONLY) await send("Emulation.setDeviceMetricsOverride", { width, height: Math.min(v.h, 6000), deviceScaleFactor: 1, mobile });
  await new Promise((r) => setTimeout(r, 300));
  const name = (p.replace(/\//g, "_").replace(/^_|_$/g, "") || "home") + `-${width}.png`;
  if (!process.env.NO_SHOT) {
    const shot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(outDir, name), Buffer.from(shot.result.data, "base64"));
  }
  await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile });
  report.push({ path: p, viewport: v.vw, scrollWidth: v.sw, overflow: v.sw > v.vw, offenders: v.wide, errors: [...consoleErrors], file: name });
}
console.log(JSON.stringify(report, null, 1));
ws.close();
proc.kill();
