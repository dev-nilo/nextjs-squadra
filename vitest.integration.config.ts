import { defineConfig } from "vitest/config";
import { aliases } from "./vitest.aliases";

/** Integration tests talk to the local Supabase and share one database, so they run serially. */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: { alias: aliases },
});
