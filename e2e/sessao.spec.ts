import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { abrirAba, admin, card, DEV_USER, linkDeConfirmacao, SEED_PASSWORD, signIn } from "./support";

test("signs in, sees only their own Elenco, and signs out", { tag: "@mobile" }, async ({ page }) => {
  await signIn(page, DEV_USER);
  await abrirAba(page, "Elenco");

  await expect(card(page, "Paredão")).toBeVisible();
  // amigo@squadra.test owns this one: RLS must keep it out of dev's Elenco.
  await expect(card(page, "Goleiro do Amigo")).toHaveCount(0);

  await abrirAba(page, "Você");
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bora pro jogo!" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Bora pro jogo!" })).toBeVisible();
  await expect(card(page, "Paredão")).toHaveCount(0);
});

test("signing out on a server-rendered page shows the sign-in screen there", { tag: "@mobile" }, async ({ page }) => {
  await signIn(page, DEV_USER);
  await abrirAba(page, "Você");

  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bora pro jogo!" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Você", level: 1 })).toHaveCount(0);
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

test("someone who forgot the password gets a link by email, sets a new one and signs in with it", { tag: "@mobile" }, async ({ page, browser }) => {
  const email = `esqueci-${randomUUID().slice(0, 8)}@squadra.test`;
  const NOVA = "senha-nova-456";
  const service = admin();
  const { data, error } = await service.auth.admin.createUser({ email, password: SEED_PASSWORD, email_confirm: true });
  if (error) throw error;
  const aviso = (texto: string) => page.locator("[data-sonner-toast]").filter({ hasText: texto });

  try {
    await page.goto("/auth");
    await page.getByRole("button", { name: "Esqueci minha senha" }).click();
    await expect(page.getByRole("heading", { name: "Recuperar a senha" })).toBeVisible();
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Enviar link" }).click();
    await expect(aviso("Link enviado")).toBeVisible();

    // The email links to /auth/confirm, which only uses the token on the tap.
    const link = await linkDeConfirmacao(email);
    expect(link).toContain("type=recovery");
    await page.goto(link.replace(/^https?:\/\/[^/]+/, ""));
    await expect(page.getByRole("heading", { name: "Trocar a senha" })).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page).toHaveURL(/\/auth\/nova-senha$/);
    await page.getByLabel("Senha nova", { exact: true }).fill(NOVA);
    await page.getByLabel("Confirme a senha nova").fill(NOVA);
    await page.getByRole("button", { name: "Salvar senha nova" }).click();

    // Signed in on /, where someone with no Grupo yet names theirs.
    await expect(page.getByRole("heading", { name: "Dê um nome pro seu fut" })).toBeVisible();
    await expect(aviso("Senha nova salva. Você entrou.")).toBeVisible();

    // In another browser, the old password no longer works and the new one does.
    const outro = await browser.newContext();
    try {
      const p = await outro.newPage();
      await p.goto("/auth");
      await p.getByPlaceholder("Email").fill(email);
      await p.getByPlaceholder("Senha").fill(SEED_PASSWORD);
      await p.getByRole("button", { name: "Entrar", exact: true }).click();
      await expect(p.locator("[data-sonner-toast]").filter({ hasText: "Erro ao fazer login" })).toBeVisible();

      await p.getByPlaceholder("Senha").fill(NOVA);
      await p.getByRole("button", { name: "Entrar", exact: true }).click();
      await expect(p.getByRole("heading", { name: "Dê um nome pro seu fut" })).toBeVisible();
    } finally {
      await outro.close();
    }
  } finally {
    if (data.user) await service.auth.admin.deleteUser(data.user.id);
  }
});
