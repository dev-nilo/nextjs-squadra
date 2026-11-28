import { configDefaults, defineConfig } from "vitest/config";
import { aliases } from "./vitest.aliases";

// Playwright owns e2e/; tests/integration/ needs a running Supabase (npm run test:integration).
const FORA = [...configDefaults.exclude, "e2e/**", "tests/integration/**"];

/**
 * Two projects in one `npm test`: plain logic in Node (*.test.ts), and
 * components in a DOM (*.test.tsx), rendered with Testing Library.
 */
export default defineConfig({
  resolve: { alias: aliases },
  test: {
    projects: [
      {
        extends: true,
        test: { name: "node", environment: "node", include: ["**/*.test.ts"], exclude: FORA },
      },
      {
        extends: true,
        test: {
          name: "dom",
          environment: "happy-dom",
          include: ["**/*.test.tsx"],
          exclude: FORA,
          setupFiles: ["tests/componentes/setup.ts"],
        },
      },
    ],
  },
});
