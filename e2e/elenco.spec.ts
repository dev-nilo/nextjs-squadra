import { expect, test } from "@playwright/test";
import { card, DEV_USER, signIn } from "./support";

test("a new Jogador is saved through the server and shows in another browser", async ({ page, browser }) => {
  const name = `E2E Craque ${Date.now()}`;
  await signIn(page, DEV_USER);

  await page.getByRole("button", { name: /^Nova( carta)?$/ }).click();
  const modal = page.getByRole("dialog");
  await expect(modal.getByRole("heading", { name: "Nova carta" })).toBeVisible();
  await modal.getByLabel("Nome do jogador").fill(name);
  await modal.getByLabel("Posição").selectOption("ATA");
  await modal.getByRole("button", { name: "Criar carta" }).click();
  await expect(card(page, name)).toBeVisible();

  // Another browser context shares nothing with this one: the card comes from the database.
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
