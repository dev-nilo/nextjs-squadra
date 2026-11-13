import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { admin, card, DEV_USER, linkDeConfirmacao, SEED_PASSWORD, signIn } from "./support";

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

test("a plain sign-up confirms the email in one hop to /, with one notice", async ({ page }) => {
  const email = `cadastro-${randomUUID().slice(0, 8)}@squadra.test`;
  try {
    await page.goto("/auth");
    await page.getByRole("button", { name: "Criar conta" }).click();
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Senha", { exact: true }).fill(SEED_PASSWORD);
    await page.getByLabel("Confirmar senha").fill(SEED_PASSWORD);
    await page.getByRole("button", { name: "Criar conta", exact: true }).last().click();

    const link = await linkDeConfirmacao(email);
    await page.goto(link.replace(/^https?:\/\/[^/]+/, ""));
    await page.getByRole("button", { name: "Confirmar minha conta" }).click();

    // Straight to / (no stop at /auth/callback), where a user with no Grupo names theirs.
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Dê um nome pro seu fut" })).toBeVisible();
    const avisos = page.locator("[data-sonner-toast]");
    await expect(avisos).toHaveCount(1);
    await expect(avisos.first()).toContainText("Email confirmado! Você entrou.");
  } finally {
    const service = admin();
    const { data } = await service.auth.admin.listUsers({ perPage: 1000 });
    const conta = data.users.find((u) => u.email === email);
    if (conta) await service.auth.admin.deleteUser(conta.id);
  }
});
