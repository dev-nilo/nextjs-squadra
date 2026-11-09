import { expect, test } from "@playwright/test";
import { card, DEV_USER, signIn } from "./support";

test("a new Jogador is saved to the database, not only to the local cache", async ({ page, browser }) => {
  const name = `E2E Craque ${Date.now()}`;
  await signIn(page, DEV_USER);

  await page.getByRole("button", { name: /^Nova( Carta)?$/ }).click();
  const modal = page.getByRole("dialog");
  await expect(modal.getByRole("heading", { name: "Nova Carta" })).toBeVisible();
  await modal.getByLabel("Nome do Jogador").fill(name);
  await modal.getByLabel("Posição").selectOption("ATA");
  await modal.getByRole("button", { name: "Criar Carta" }).click();
  await expect(card(page, name)).toBeVisible();

  // A fresh browser context has an empty localStorage, so the card can only
  // come from Supabase.
  const fresh = await browser.newContext();
  const freshPage = await fresh.newPage();
  await signIn(freshPage, DEV_USER);
  await expect(card(freshPage, name)).toBeVisible();
  await fresh.close();

  // Leave the seeded Elenco as it was.
  await card(page, name).hover();
  await page.getByRole("button", { name: `Excluir carta de ${name}` }).click();
  await expect(card(page, name)).toHaveCount(0);
});
