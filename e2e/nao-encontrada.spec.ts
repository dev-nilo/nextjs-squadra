import { expect, test } from "@playwright/test";

test("an address the app doesn't have shows Squadra's own page, with a 404", { tag: "@mobile" }, async ({ page }) => {
  const resposta = await page.goto("/esse-link-nao-existe");
  expect(resposta?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Essa página não existe" })).toBeVisible();
  await expect(page).toHaveTitle("Página não encontrada · Squadra");

  await page.getByRole("link", { name: "Ir pro meu fut" }).click();
  await expect(page.getByRole("heading", { name: "Bora pro jogo!" })).toBeVisible();
});
