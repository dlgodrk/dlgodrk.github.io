import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  // Some exhaustive checks (e.g. 7,117 tax cells, 3,000 reverse lookups) are slow on busy machines/CI.
  test: { include: ["src/**/*.test.ts"], environment: "node", testTimeout: 30_000 },
});
