import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { abrirAba, card, DEV_USER, SEED_PASSWORD, signIn } from "./support";

/** Bypasses RLS, only to arrange and clean up. CI exports both from `supabase status`. */
function admin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (from `npx supabase status`).");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

test("a user with no Grupo names it on first access", async ({ page }) => {
  const service = admin();
  const email = `primeiro-acesso-${randomUUID()}@squadra.test`;
  const { data: created, error } = await service.auth.admin.createUser({
    email,
    password: SEED_PASSWORD,
    email_confirm: true,
  });
  if (error || !created.user) throw error ?? new Error("createUser returned no user");
  const userId = created.user.id;

  try {
    await signIn(page, email);

    await expect(page.getByRole("heading", { name: "Dê um nome pro seu fut" })).toBeVisible();
    const campo = page.getByLabel("Nome do fut");
    await expect(campo).toHaveValue("");
    await expect(campo).not.toHaveAttribute("placeholder");

    await page.getByRole("button", { name: "Criar fut" }).click();
    // Filtered: Next's route announcer is an (empty) role="alert" too.
    await expect(page.getByRole("alert").filter({ hasText: "Dê um nome pro seu fut." })).toBeVisible();

    await campo.fill("  Fut de Quinta  ");
    await page.getByRole("button", { name: "Criar fut" }).click();

    // The fut opens with its name, and the user is its dono.
    await expect(page.getByText("Fut de Quinta", { exact: true })).toBeVisible();
    const { data: grupo } = await service.from("grupos").select("id, slug").eq("criado_por", userId).single().throwOnError();
    expect(grupo?.slug).toMatch(/^fut-de-quinta(-\d+)?$/);
    const { data: membro } = await service.from("grupo_membros").select("papel").eq("grupo_id", grupo!.id).eq("user_id", userId).single().throwOnError();
    expect(membro?.papel).toBe("dono");

    // The first Jogador lands in the new Grupo, and the naming screen doesn't come back.
    const jogador = `Primeiro ${Date.now()}`;
    await abrirAba(page, "Elenco");
    await page.getByRole("button", { name: "Nova carta" }).click();
    const modal = page.getByRole("dialog");
    await modal.getByLabel("Nome do jogador").fill(jogador);
    await modal.getByLabel("Posição").selectOption("ALA");
    await modal.getByRole("button", { name: "Criar carta" }).click();
    await expect(card(page, jogador)).toBeVisible();
    const { data: player } = await service.from("players").select("grupo_id").eq("user_id", userId).single().throwOnError();
    expect(player?.grupo_id).toBe(grupo?.id);

    await page.reload();
    await expect(page.getByText("Fut de Quinta", { exact: true })).toBeVisible();
    await expect(card(page, jogador)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Dê um nome pro seu fut" })).toHaveCount(0);
  } finally {
    await service.from("grupos").delete().eq("criado_por", userId);
    await service.auth.admin.deleteUser(userId);
  }
});

test("a user who already has a Grupo goes straight to it", async ({ page }) => {
  await signIn(page, DEV_USER);
  await expect(page.getByText("Fut do Dev", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dê um nome pro seu fut" })).toHaveCount(0);
});
