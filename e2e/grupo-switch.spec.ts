import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { card, SEED_PASSWORD, signIn } from "./support";

/** Bypasses RLS, only to arrange and clean up. CI exports both from `supabase status`. */
function admin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (from `npx supabase status`).");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

test("a user in two Grupos switches between their Elencos at /g/<slug>", async ({ page }) => {
  const service = admin();
  const sufixo = randomUUID().slice(0, 8);
  const { data: created, error } = await service.auth.admin.createUser({
    email: `dois-futs-${sufixo}@squadra.test`,
    password: SEED_PASSWORD,
    email_confirm: true,
  });
  if (error || !created.user) throw error ?? new Error("createUser returned no user");
  const userId = created.user.id;

  // The older Grupo is theirs; in the newer one they're a membro.
  const quinta = { slug: `fut-de-quinta-${sufixo}`, nome: "Fut de Quinta" };
  const sabado = { slug: `pelada-de-sabado-${sufixo}`, nome: "Pelada de Sábado" };
  const { data: grupos } = await service
    .from("grupos")
    .insert([
      { ...quinta, criado_por: userId },
      { ...sabado, criado_por: userId },
    ])
    .select("id, slug")
    .throwOnError();
  const idDe = (slug: string) => grupos!.find((g) => g.slug === slug)!.id;
  await service
    .from("grupo_membros")
    .insert([
      { grupo_id: idDe(quinta.slug), user_id: userId, papel: "dono", created_at: "2026-01-01T00:00:00Z" },
      { grupo_id: idDe(sabado.slug), user_id: userId, papel: "membro", created_at: "2026-06-01T00:00:00Z" },
    ])
    .throwOnError();
  await service
    .from("players")
    .insert([
      { user_id: userId, grupo_id: idDe(quinta.slug), name: "Craque da Quinta", position: "ALA", nationality: "BR" },
      { user_id: userId, grupo_id: idDe(sabado.slug), name: "Craque do Sábado", position: "ATA", nationality: "BR" },
    ])
    .throwOnError();

  try {
    await signIn(page, `dois-futs-${sufixo}@squadra.test`);

    // `/` opens the Grupo they own and the URL names it.
    await expect(page).toHaveURL(new RegExp(`/g/${quinta.slug}$`));
    const trocar = page.getByLabel("Trocar de fut");
    await expect(trocar).toHaveValue(quinta.slug);
    await expect(card(page, "Craque da Quinta")).toBeVisible();
    await expect(card(page, "Craque do Sábado")).toHaveCount(0);

    // Switching shows the other Elenco, and only it.
    await trocar.selectOption(sabado.slug);
    await expect(page).toHaveURL(new RegExp(`/g/${sabado.slug}$`));
    await expect(card(page, "Craque do Sábado")).toBeVisible();
    await expect(card(page, "Craque da Quinta")).toHaveCount(0);

    // Back goes to the previous Grupo.
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/g/${quinta.slug}$`));
    await expect(card(page, "Craque da Quinta")).toBeVisible();

    // The link opens that Grupo directly, and `/` reopens the last one used.
    await page.goto(`/g/${sabado.slug}`);
    await expect(card(page, "Craque do Sábado")).toBeVisible();
    await page.goto("/");
    await expect(page).toHaveURL(new RegExp(`/g/${sabado.slug}$`));

    // A Grupo they're not in (or that doesn't exist) isn't opened.
    await page.goto(`/g/nao-existe-${sufixo}`);
    await expect(page.getByRole("heading", { name: "Esse fut não existe" })).toBeVisible();
    await page.getByRole("button", { name: "Ir pro meu fut" }).click();
    await expect(page).toHaveURL(new RegExp(`/g/${sabado.slug}$`));
  } finally {
    await service.from("grupos").delete().in("id", grupos!.map((g) => g.id));
    await service.auth.admin.deleteUser(userId);
  }
});

test("someone outside a Grupo can't open it by its link", async ({ page }) => {
  await signIn(page, "amigo@squadra.test");
  await page.goto("/g/fut-do-dev");
  await expect(page.getByRole("heading", { name: "Esse fut não existe" })).toBeVisible();
  await expect(card(page, "Paredão")).toHaveCount(0);
});
