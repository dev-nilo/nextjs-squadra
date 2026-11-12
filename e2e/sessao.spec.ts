import { expect, test } from "@playwright/test";
import { card, DEV_USER, signIn } from "./support";

test("signs in, sees only their own Elenco, and signs out", async ({ page }) => {
  await signIn(page, DEV_USER);

  await expect(card(page, "Paredão")).toBeVisible();
  // amigo@squadra.test owns this one: RLS must keep it out of dev's Elenco.
  await expect(card(page, "Goleiro do Amigo")).toHaveCount(0);

  await page.getByRole("button", { name: "Menu da conta" }).click();
  await page.getByRole("button", { name: "Desconectar" }).click();
  await expect(page.getByRole("heading", { name: "Bora pro jogo!" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Bora pro jogo!" })).toBeVisible();
  await expect(card(page, "Paredão")).toHaveCount(0);
});

test("signing out on a server-rendered page shows the sign-in screen there", async ({ page }) => {
  await signIn(page, DEV_USER);
  await page.getByRole("link", { name: "Partidas" }).click();
  await expect(page.getByRole("heading", { name: "Partidas" })).toBeVisible();

  await page.getByRole("button", { name: "Menu da conta" }).click();
  await page.getByRole("button", { name: "Desconectar" }).click();
  await expect(page.getByRole("heading", { name: "Bora pro jogo!" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Partidas" })).toHaveCount(0);
});
