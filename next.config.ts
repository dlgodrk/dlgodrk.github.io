import type { NextConfig } from "next";

// Public URL of the site. Its path part becomes the basePath (GitHub Pages project site: /semcalc).
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://dlgodrk.github.io").replace(/\/$/, "");
const BASE_PATH = new URL(SITE_URL).pathname.replace(/\/$/, "");

// Build date in Korea time (YYYY-MM-DD), inlined into server and client bundles.
const BUILD_DATE = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_DATE: BUILD_DATE, NEXT_PUBLIC_SITE_URL: SITE_URL },
  basePath: BASE_PATH || undefined,
  // Fully static site: every page is prerendered to HTML at build time,
  // so it can be hosted on any static host (Vercel, Cloudflare Pages, GitHub Pages...).
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
