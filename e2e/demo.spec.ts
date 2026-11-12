import { expect, test, type Page } from "@playwright/test";

const secao = (page: Page, nome: string | RegExp) => page.getByRole("region", { name: nome });
const RESET = "/api/cron/resetar-demo";

test("one click on the demo button lands on its open Partida, ready to play", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Entrar como demo" }).click();

  await expect(page).toHaveURL(/\/g\/demo\/partidas\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Conta demo.")).toBeVisible();
  await expect(page.getByText("Arena do Bairro")).toBeVisible();
  await expect(secao(page, "Confirmados (9/12)")).toBeVisible();

  // It's a dono: it answers for the Elenco.
  await page.getByRole("button", { name: "Marcar Zaga Seca: vou" }).click();
  await expect(secao(page, "Confirmados (10/12)").getByText("Zaga Seca")).toBeVisible();

  // No password to change on the demo account.
  await page.getByRole("button", { name: "Menu da conta" }).click();
  await expect(page.getByText("Conta demo", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Alterar senha" })).toHaveCount(0);
});

test("the nightly reset only runs with the cron secret, and puts the demo back", async ({ page, request }) => {
  test.skip(!process.env.CRON_SECRET, "Set CRON_SECRET for both the app and Playwright (CI does).");
  expect((await request.get(RESET)).status()).toBe(401);
  expect((await request.get(RESET, { headers: { authorization: "Bearer errado" } })).status()).toBe(401);

  const ok = await request.get(RESET, { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
  expect(ok.status()).toBe(200);

  // The previous test's answer is gone.
  await page.goto("/");
  await page.getByRole("button", { name: "Entrar como demo" }).click();
  await expect(secao(page, "Confirmados (9/12)")).toBeVisible();
});
