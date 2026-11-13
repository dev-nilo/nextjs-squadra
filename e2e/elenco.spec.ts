import { expect, test } from "@playwright/test";
import { abrirAba, card, DEV_USER, signIn } from "./support";

test("a new Jogador is saved through the server and shows in another browser", { tag: "@mobile" }, async ({ page, browser }) => {
  const name = `E2E Craque ${Date.now()}`;
  await signIn(page, DEV_USER);
  await abrirAba(page, "Elenco");

  await page.getByRole("button", { name: "Nova carta" }).click();
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
  await abrirAba(freshPage, "Elenco");
  await expect(card(freshPage, name)).toBeVisible();
  await fresh.close();

  // Leave the seeded Elenco as it was. A tap opens the card, where its actions are.
  await card(page, name).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: `Excluir carta de ${name}` }).click();
  await expect(card(page, name)).toHaveCount(0);
});
