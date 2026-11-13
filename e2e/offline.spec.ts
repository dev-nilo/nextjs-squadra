import { expect, test, type Page } from "@playwright/test";
import { abrirAba, DEV_USER, signIn } from "./support";

/** Whether the service worker has saved `pathname` for use with no signal. */
const salva = (page: Page, pathname: string) =>
  page.evaluate(async (p) => !!(await (await caches.open("squadra-paginas-v1")).match(p)), pathname);

test("the next Partida and the Elenco stay readable with no signal", { tag: "@mobile" }, async ({ page, context }) => {
  await signIn(page, DEV_USER);
  await page.goto("/g/fut-do-dev");

  // The service worker takes over and saves the home and the Elenco as they're opened.
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller);
  await expect.poll(() => salva(page, "/g/fut-do-dev"), { timeout: 15_000 }).toBe(true);
  await abrirAba(page, "Elenco");
  await expect.poll(() => salva(page, "/g/fut-do-dev/elenco"), { timeout: 15_000 }).toBe(true);

  await context.setOffline(true);
  try {
    // Reopened with no signal: the saved Elenco, read-only, saying how old it is.
    await page.reload();
    await expect(page.getByRole("heading", { name: "Elenco", level: 1 })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: /^Sem conexão\. Mostrando a lista de \d{2}h\d{2}\.$/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Nova carta" })).toHaveCount(0);

    // The home too, with nothing to change.
    await page.goto("/g/fut-do-dev");
    await expect(page.getByRole("status").filter({ hasText: "Sem conexão." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Vou", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Nova partida" })).toHaveCount(0);

    // A page never saved: the offline page.
    await page.goto("/g/fut-do-dev/voce");
    await expect(page.getByRole("heading", { name: "Sem conexão" })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }

  // Signing out forgets the saved pages.
  await page.goto("/g/fut-do-dev/voce");
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bora pro jogo!" })).toBeVisible();
  await expect.poll(() => salva(page, "/g/fut-do-dev")).toBe(false);
});
