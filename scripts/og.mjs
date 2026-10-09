// Generates Open Graph share images (1200x630 PNG) into public/og/.
// Run: node scripts/og.mjs   (needs network once to fetch the font subset)
import { ImageResponse } from "next/og.js";
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { TOOLS } from "../src/lib/tools.ts";

const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, "public", "og");
fs.mkdirSync(outDir, { recursive: true });

const h = React.createElement;

async function loadFont(weight, text) {
  const cssUrl = `https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@${weight}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(cssUrl, { headers: { "User-Agent": "Mozilla/4.0" } })).text();
  const m = css.match(/src: url\((.+?)\) format/);
  if (!m) throw new Error(`font css parse failed for weight ${weight}`);
  return (await fetch(m[1])).arrayBuffer();
}

const pages = [
  { file: "default", title: "생활 계산기 모음", summary: "연봉 실수령액, 만 나이, 퇴직금, 평수까지 2026년 기준으로" },
  ...TOOLS.map((t) => ({ file: t.slug, title: t.name, summary: t.summary })),
];

const allText = pages.map((p) => p.title + p.summary).join("") + "셈셈 계산기 2026년 기준 무료 회원가입 없이 바로 계산";
const [bold, regular] = await Promise.all([loadFont(700, allText), loadFont(400, allText)]);

function card({ title, summary }) {
  return h(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#f2f4f7",
        padding: 56,
        fontFamily: "Plex",
      },
    },
    h(
      "div",
      {
        style: {
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
          border: "2px solid #b6c0cd",
          borderRadius: 6,
          padding: "44px 56px",
          position: "relative",
        },
      },
      h(
        "div",
        { style: { display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "4px solid #16202e", paddingBottom: 18 } },
        h("div", { style: { fontSize: 34, fontWeight: 700, color: "#16202e" } }, "셈셈 계산기"),
        h("div", { style: { fontSize: 26, color: "#687487" } }, "2026년 기준"),
      ),
      h(
        "div",
        { style: { display: "flex", flexDirection: "column", marginTop: 54, maxWidth: 820 } },
        h("div", { style: { fontSize: title.length > 12 ? 76 : 88, fontWeight: 700, color: "#16202e", letterSpacing: -2, lineHeight: 1.15 } }, title),
        h("div", { style: { fontSize: 34, color: "#3a475a", marginTop: 22, lineHeight: 1.4 } }, summary),
      ),
      h(
        "div",
        { style: { position: "absolute", left: 56, bottom: 40, fontSize: 26, color: "#687487", display: "flex" } },
        "무료 · 회원가입 없이 바로 계산",
      ),
      h(
        "div",
        {
          style: {
            position: "absolute",
            right: 60,
            bottom: 52,
            width: 150,
            height: 150,
            borderRadius: 999,
            border: "6px solid #c4352b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: "rotate(-11deg)",
            color: "#c4352b",
            fontSize: 42,
            fontWeight: 700,
          },
        },
        h(
          "div",
          {
            style: {
              width: 126,
              height: 126,
              borderRadius: 999,
              border: "3px solid #c4352b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            },
          },
          "셈셈",
        ),
      ),
    ),
  );
}

for (const p of pages) {
  const res = new ImageResponse(card(p), {
    width: 1200,
    height: 630,
    fonts: [
      { name: "Plex", data: bold, weight: 700, style: "normal" },
      { name: "Plex", data: regular, weight: 400, style: "normal" },
    ],
  });
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(path.join(outDir, `${p.file}.png`), buf);
  console.log(`og/${p.file}.png ${buf.length} bytes`);
}
