import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Playwright owns e2e/; tests/integration/ needs a running Supabase (npm run test:integration).
    exclude: [...configDefaults.exclude, "e2e/**", "tests/integration/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
