import { expect, type Page } from "@playwright/test";

/** Users created by supabase/seed.sql. */
export const SEED_PASSWORD = "squadra-dev-123";
export const DEV_USER = "dev@squadra.test";
export const AMIGO_USER = "amigo@squadra.test";

export async function signIn(page: Page, email: string) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Bora pro jogo!" })).toBeVisible();
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Senha").fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Menu da conta" })).toBeVisible();
}

/** The Jogador card, by its accessible name ("Carta de <nome>, <posição>, rating <n>"). */
export function card(page: Page, name: string) {
  return page.getByRole("button", { name: new RegExp(`^Carta de ${escapeRegExp(name)},`) });
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
