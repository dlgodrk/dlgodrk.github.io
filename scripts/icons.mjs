// Renders raster icons from the logo: public/icon-512.png (logo for structured data)
// and src/app/apple-icon.png (180x180 home-screen icon). Run: node scripts/icons.mjs
import { ImageResponse } from "next/og.js";
import React from "react";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const h = React.createElement;

function icon(size) {
  const s = size / 32; // design grid is 32x32
  return h(
    "div",
    {
      style: {
        width: size,
        height: size,
        display: "flex",
        background: "#16202e",
        borderRadius: 7 * s,
        position: "relative",
      },
    },
    h("div", {
      style: { position: "absolute", left: 7 * s, top: 5 * s, width: 15 * s, height: 21 * s, background: "#fff", borderRadius: 1.5 * s },
    }),
    ...[10.5, 14.5].map((y) =>
      h("div", {
        key: y,
        style: { position: "absolute", left: 10 * s, top: (y - 0.9) * s, width: 9 * s, height: 1.8 * s, background: "#16202e", borderRadius: s },
      }),
    ),
    h("div", {
      style: { position: "absolute", left: 10 * s, top: 17.6 * s, width: 5 * s, height: 1.8 * s, background: "#16202e", borderRadius: s },
    }),
    h("div", {
      style: {
        position: "absolute",
        left: 17 * s,
        top: 17 * s,
        width: 10 * s,
        height: 10 * s,
        borderRadius: 999,
        background: "#fff",
        border: `${2 * s}px solid #c4352b`,
      },
    }),
  );
}

async function render(size, file) {
  const res = new ImageResponse(icon(size), { width: size, height: size });
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(file, buf);
  console.log(path.relative(root, file), buf.length, "bytes");
}

await render(512, path.join(root, "public", "icon-512.png"));
await render(180, path.join(root, "src", "app", "apple-icon.png"));
