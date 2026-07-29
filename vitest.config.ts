import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "db/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["lib/engine/**/*.ts"],
      exclude: ["lib/engine/__tests__/**"],
      thresholds: { lines: 90, functions: 90 },
    },
  },
});
