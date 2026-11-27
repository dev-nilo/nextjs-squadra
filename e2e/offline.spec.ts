import { expect, test } from "@playwright/test";
import { abrirAba, DEV_USER, salva, signIn } from "./support";

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
    await expect(
      page.getByRole("status").filter({ hasText: /^Sem conexão\. Mostrando a lista de \d{2}h\d{2}\.$/ }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Nova carta" })).toHaveCount(0);

    // The home too, with nothing to change.
    await page.goto("/g/fut-do-dev");
    await expect(page.getByRole("status").filter({ hasText: "Sem conexão." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Vou", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Nova partida" })).toHaveCount(0);

    // A page never saved: the offline page, with a way back to the saved ones.
    await page.goto("/g/fut-do-dev/pessoas");
    await expect(page.getByRole("heading", { name: "Sem conexão" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ir pro meu fut" })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }

  // Back online, the offline page reloads by itself into the real Pessoas. Waiting
  // for that, not navigating over it: a goto raced that reload and was cut off.
  await expect(page.getByRole("heading", { name: /^Pessoas/, level: 1 })).toBeVisible();

  // Signing out forgets the saved pages.
  await abrirAba(page, "Você");
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bora pro jogo!" })).toBeVisible();
  await expect.poll(() => salva(page, "/g/fut-do-dev")).toBe(false);
});

test(
  "with signal that doesn't carry data, the saved page shows in seconds, read-only, and the live one comes back",
  { tag: "@mobile" },
  async ({ page, context }) => {
    await signIn(page, DEV_USER);
    await abrirAba(page, "Elenco");
    await page.waitForFunction(() => !!navigator.serviceWorker?.controller);
    await expect.poll(() => salva(page, "/g/fut-do-dev/elenco"), { timeout: 15_000 }).toBe(true);

    // The phone says it's online, but the Elenco's request never answers. Playwright can't
    // hold a navigation preload (the browser makes it), so the worker fetches the page itself.
    await page.evaluate(async () => (await navigator.serviceWorker.ready).navigationPreload.disable());
    let pendurar = true;
    await context.route("**/g/fut-do-dev/elenco", async (route) => {
      if (!pendurar) return route.continue();
      await new Promise((resolve) => setTimeout(resolve, 30_000));
      await route.continue().catch(() => {});
    });
    try {
      const inicio = Date.now();
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "Elenco", level: 1 })).toBeVisible({ timeout: 8_000 });
      expect(Date.now() - inicio).toBeLessThan(8_000);

      // Not the live list: said so, and nothing can be changed.
      await expect(
        page.getByRole("status").filter({ hasText: /^Sem conexão\. Mostrando a lista de \d{2}h\d{2}\.$/ }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "Nova carta" })).toHaveCount(0);
    } finally {
      pendurar = false;
    }

    // Once the network answers, the page reloads itself into the live one.
    await expect(page.getByRole("button", { name: "Nova carta" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("status").filter({ hasText: "Sem conexão." })).toHaveCount(0);
    await context.unrouteAll({ behavior: "ignoreErrors" });
  },
);
