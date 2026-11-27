import { configDefaults, defineConfig } from "vitest/config";
import { aliases } from "./vitest.aliases";

export default defineConfig({
  test: {
    environment: "node",
    // Playwright owns e2e/; tests/integration/ needs a running Supabase (npm run test:integration).
    exclude: [...configDefaults.exclude, "e2e/**", "tests/integration/**"],
  },
  resolve: { alias: aliases },
});
