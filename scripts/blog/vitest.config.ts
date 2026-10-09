import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Separate Vitest config for the Naver blog post generator (scripts/blog/*.test.ts).
 * The site's own config only includes src/**, so these files never run in the normal test suite.
 *
 *   Check that docs/blog/*.html match the site's calculators:  npx vitest run -c scripts/blog/vitest.config.ts
 *   Regenerate docs/blog/*.html:                               BLOG_WRITE=1 npx vitest run -c scripts/blog/vitest.config.ts
 */
export default defineConfig({
  root: path.resolve(__dirname, "../.."),
  resolve: { alias: { "@": path.resolve(__dirname, "../../src") } },
  test: { include: ["scripts/blog/**/*.test.ts"], environment: "node" },
});
