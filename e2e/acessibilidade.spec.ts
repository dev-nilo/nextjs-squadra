import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { DEV_USER, signIn } from "./support";

/**
 * WCAG 2.1 A and AA, the rules axe can check by itself. Contrast is checked in
 * both themes, and every page on the phone layout too (`@mobile`: bottom tab
 * bar, docked controls).
 */
const REGRAS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function semViolacoes(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(REGRAS).analyze();
  // One line per problem and element, so a failure says what to fix and where.
  const problemas = violations.flatMap((v) => v.nodes.map((n) => `${v.id} (${v.impact}): ${n.target.join(" ")} | ${v.help}`));
  expect(problemas, problemas.join("\n")).toEqual([]);
}

const PAGINAS_DO_FUT = [
  { nome: "the next Partida", caminho: "/g/fut-do-dev" },
  { nome: "Partidas", caminho: "/g/fut-do-dev/partidas" },
  { nome: "the Elenco", caminho: "/g/fut-do-dev/elenco" },
  { nome: "Você", caminho: "/g/fut-do-dev/voce" },
  { nome: "Pessoas", caminho: "/g/fut-do-dev/pessoas" },
];

for (const tema of ["light", "dark"] as const) {
  test.describe(`${tema} theme`, () => {
    test.use({ colorScheme: tema });

    test("the sign-in screen has no WCAG A/AA problems axe can find", { tag: "@mobile" }, async ({ page }) => {
      await page.goto("/auth");
      await expect(page.getByRole("heading", { name: "Bora pro jogo!" })).toBeVisible();
      await semViolacoes(page);
    });

    for (const { nome, caminho } of PAGINAS_DO_FUT) {
      test(`${nome} has no WCAG A/AA problems axe can find`, { tag: "@mobile" }, async ({ page }) => {
        await signIn(page, DEV_USER);
        await page.goto(caminho);
        await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
        await semViolacoes(page);
      });
    }
  });
}
