import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/rss-engine/**/*.test.ts", "tests/rss-engine/**/*.test.ts"],
    setupFiles: ["tests/rss-engine/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
