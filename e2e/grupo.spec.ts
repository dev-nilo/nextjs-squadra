import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { card, DEV_USER, SEED_PASSWORD, signIn } from "./support";

/** Bypasses RLS, only to arrange and clean up. CI exports both from `supabase status`. */
function admin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (from `npx supabase status`).");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

test("a user with no Grupo names it on first access and keeps their Elenco", async ({ page }) => {
  const service = admin();
  const email = `primeiro-acesso-${randomUUID()}@squadra.test`;
  const { data: created, error } = await service.auth.admin.createUser({
    email,
    password: SEED_PASSWORD,
    email_confirm: true,
  });
  if (error || !created.user) throw error ?? new Error("createUser returned no user");
  const userId = created.user.id;
  const jogador = `Veterano ${Date.now()}`;
  await service.from("players").insert({ user_id: userId, name: jogador, position: "ALA", nationality: "BR" }).throwOnError();

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

    // The Elenco opens with the Grupo's name, and the Jogador made before it is still there.
    await expect(page.getByText("Fut de Quinta", { exact: true })).toBeVisible();
    await expect(card(page, jogador)).toBeVisible();

    // The Jogador moved into the new Grupo, and the screen doesn't come back.
    const { data: player } = await service.from("players").select("grupo_id").eq("user_id", userId).single().throwOnError();
    const { data: grupo } = await service.from("grupos").select("id, slug").eq("criado_por", userId).single().throwOnError();
    expect(player?.grupo_id).toBe(grupo?.id);
    expect(grupo?.slug).toMatch(/^fut-de-quinta(-\d+)?$/);

    await page.reload();
    await expect(page.getByText("Fut de Quinta", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Dê um nome pro seu fut" })).toHaveCount(0);
  } finally {
    await service.from("grupos").delete().eq("criado_por", userId);
    await service.auth.admin.deleteUser(userId);
  }
});

test("a user who already has a Grupo goes straight to the Elenco", async ({ page }) => {
  await signIn(page, DEV_USER);
  await expect(page.getByText("Fut do Dev", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dê um nome pro seu fut" })).toHaveCount(0);
});
